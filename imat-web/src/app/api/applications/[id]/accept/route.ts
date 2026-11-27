import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canReviewApplications } from "@/lib/access";
import { canAssignRole } from "@/lib/roleHierarchy";
import { inviteMember } from "@/lib/inviteMember";
import { sanitizePlainText } from "@/lib/inputSanitizer";
import { enforceRateLimit } from "@/lib/serverRateLimit";

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
      .select("id, applicant_name, email, matric_no, phone, level, cgpa, status")
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

    // Shared accept steps (auth user, member row, invite link, acceptance
    // mail) — the same helper the direct invite route uses.
    const result = await inviteMember(admin, {
      name: application.applicant_name,
      email: application.email,
      role,
      matricNo: application.matric_no,
      phone: application.phone,
      level: application.level,
      cgpa: application.cgpa,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
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

    // The invite link is only ever returned to the authorised admin caller
    // above. A failed email still returns success so the admin can copy
    // the link manually.
    return NextResponse.json({
      ok: true,
      userId: result.userId,
      ...(result.inviteLink ? { inviteLink: result.inviteLink } : {}),
      ...(result.emailError ? { emailError: result.emailError } : {}),
    });
  } catch {
    console.error("Accept application API error.");
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
