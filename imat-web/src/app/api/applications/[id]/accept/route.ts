import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canReviewApplications } from "@/lib/access";
import { canAssignRole } from "@/lib/roleHierarchy";
import { acceptanceEmail, sendEmail } from "@/lib/email";
import { sanitizePlainText } from "@/lib/inputSanitizer";
import { enforceRateLimit } from "@/lib/serverRateLimit";

const INVITE_REDIRECT_URL = "https://imat.codeflowx.dev/auth/callback";

// Roles assignable through the application review flow. "applicant" is not
// assignable: an accepted applicant becomes a member with a working role.
// NOTE: "owner" must also exist in the public.users role CHECK constraint;
// see the owner-approvals schema migration.
const roleSchema = z.enum([
  "owner",
  "admin",
  "president",
  "vice_president",
  "technical_officer",
  "documentation_officer",
  "field_officer",
  "advocacy_officer",
  "faculty_advisor",
  "works_dept",
]);

const bodySchema = z.object({
  role: roleSchema,
  notes: z.string().max(1000).optional(),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const realIp = request.headers.get("x-real-ip") || "";
  return forwardedFor.split(",")[0]?.trim() || realIp.trim() || "unknown";
}

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Reuse an existing auth user when createUser reports the email is already
 * registered (e.g. a retried accept). Scans auth users by email; IMAT has a
 * small user base so a paged scan is acceptable here.
 */
async function findAuthUserByEmail(admin: AdminClient, email: string) {
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users) return null;
    const found = data.users.find(
      (authUser) => authUser.email?.toLowerCase() === email.toLowerCase()
    );
    if (found) return found;
    if (data.users.length < perPage) break;
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsedParams = paramsSchema.safeParse({ id });
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  }
  const applicationId = parsedParams.data.id;

  const ip = getClientIp(request);
  const rateLimit = await enforceRateLimit(`applications-accept:${ip}`, 20, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid accept payload." }, { status: 400 });
  }
  const { role } = parsed.data;
  const reviewNotes = parsed.data.notes
    ? sanitizePlainText(parsed.data.notes, 1000)
    : undefined;

  try {
    // Authenticate the caller with the anon server client and load their
    // member role. All writes below use the service-role admin client.
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    const callerRole = profile?.role ?? null;

    if (!canReviewApplications(callerRole)) {
      return NextResponse.json(
        { error: "You do not have permission to review applications." },
        { status: 403 }
      );
    }

    if (!canAssignRole(callerRole, role)) {
      return NextResponse.json(
        { error: "You cannot assign this role." },
        { status: 403 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: application, error: applicationError } = await admin
      .from("applications")
      .select("id, applicant_name, email, matric_no, level, cgpa, status")
      .eq("id", applicationId)
      .single();

    if (applicationError || !application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (application.status !== "submitted" && application.status !== "under_review") {
      return NextResponse.json(
        { error: "Only submitted or under-review applications can be accepted." },
        { status: 409 }
      );
    }

    // Create the auth user. If the email is already registered (e.g. this
    // accept is retried after a partial failure), reuse that auth user
    // instead of failing.
    let authUserId: string | null = null;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: application.email,
      email_confirm: true,
      user_metadata: { full_name: application.applicant_name },
    });

    if (!createError && created?.user) {
      authUserId = created.user.id;
    } else {
      const existing = await findAuthUserByEmail(admin, application.email);
      if (existing) {
        authUserId = existing.id;
      } else {
        console.error("Accept application: failed to create auth user.");
        return NextResponse.json(
          { error: "Failed to create an account for this applicant." },
          { status: 500 }
        );
      }
    }

    // Upsert so a retried accept reuses the member row instead of failing
    // on the primary key / email uniqueness.
    const { error: upsertError } = await admin.from("users").upsert(
      {
        id: authUserId,
        email: application.email,
        full_name: application.applicant_name,
        matric_no: application.matric_no,
        level: application.level,
        cgpa: application.cgpa ?? null,
        role,
        status: "active",
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      console.error("Accept application: failed to create member record.");
      return NextResponse.json(
        { error: "Failed to create the member record." },
        { status: 500 }
      );
    }

    const { error: updateError } = await admin
      .from("applications")
      .update({
        status: "accepted",
        review_notes: reviewNotes ?? null,
        reviewed_by: user.id,
      })
      .eq("id", applicationId);

    if (updateError) {
      console.error("Accept application: failed to record acceptance.");
      return NextResponse.json(
        { error: "Failed to record the acceptance." },
        { status: 500 }
      );
    }

    // Supabase must NOT send the invite email itself; the link is sent
    // through Resend via the email lib so the sender stays
    // noreply@imat.codeflowx.dev.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email: application.email,
      options: { redirectTo: INVITE_REDIRECT_URL },
    });
    const inviteLink: string | undefined =
      linkData?.properties?.action_link ?? undefined;
    let emailError: string | undefined;

    if (linkError || !inviteLink) {
      emailError =
        "Could not generate the invite link. Copy it manually from the Supabase dashboard.";
    } else {
      const emailResult = await sendEmail({
        to: application.email,
        ...acceptanceEmail(application.applicant_name, inviteLink),
      });
      if (!emailResult.ok) {
        emailError =
          emailResult.error ?? "Acceptance email could not be sent.";
      }
    }

    // The invite link is only ever returned to the authorised admin caller
    // above. A failed email still returns success so the admin can copy
    // the link manually.
    return NextResponse.json({
      ok: true,
      userId: authUserId,
      ...(inviteLink ? { inviteLink } : {}),
      ...(emailError ? { emailError } : {}),
    });
  } catch {
    console.error("Accept application API error.");
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
