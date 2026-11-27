import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canReviewApplications } from "@/lib/access";
import { canAssignRole } from "@/lib/roleHierarchy";
import { inviteMember } from "@/lib/inviteMember";
import { sanitizePlainText } from "@/lib/inputSanitizer";
import { enforceRateLimit } from "@/lib/serverRateLimit";

// Direct invite: an owner or admin invites someone by email only —
// no /apply form. The invited person gets the same acceptance mail
// with a 24h set-password link, sets a password and logs in. The
// invite is recorded as an accepted application row (with no matric,
// level, motivation or CV — those columns are nullable since the
// 20261127 direct-invite migration) so the Applications page shows
// it and the resend-invite flow covers it exactly like an accepted
// applicant.
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
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  role: roleSchema,
});

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const realIp = request.headers.get("x-real-ip") || "";
  return forwardedFor.split(",")[0]?.trim() || realIp.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await enforceRateLimit(`members-invite:${ip}`, 20, 60 * 1000);
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
    return NextResponse.json({ error: "Invalid invite payload." }, { status: 400 });
  }

  const name = sanitizePlainText(parsed.data.name, 120);
  // Lowercased on store so the resend-invite flow (which looks the
  // accepted application up by exact email) matches however the
  // invited person types their address later.
  const email = parsed.data.email.toLowerCase();
  const { role } = parsed.data;

  if (!name) {
    return NextResponse.json({ error: "Enter the person's full name." }, { status: 400 });
  }

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
        { error: "You do not have permission to invite members." },
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

    // Duplicate guards, before anything is recorded. Email matches are
    // case-insensitive; the pattern is escaped so %, _ and \ in an
    // address cannot act as ilike wildcards. Same pattern as /api/apply.
    const escapedEmail = email.replace(/[\\%_]/g, (ch) => `\\${ch}`);

    const { data: existingMember } = await admin
      .from("users")
      .select("id")
      .ilike("email", escapedEmail)
      .limit(1)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: "This email already belongs to a member." },
        { status: 409 }
      );
    }

    const { data: openApplication } = await admin
      .from("applications")
      .select("id")
      .ilike("email", escapedEmail)
      .in("status", ["submitted", "under_review"])
      .limit(1)
      .maybeSingle();

    if (openApplication) {
      return NextResponse.json(
        {
          error:
            "This email already has an application under review. Review that application on the Applications page instead.",
        },
        { status: 409 }
      );
    }

    // Record the invite as an accepted application. No matric, level,
    // motivation or CV — the person never filled the form; they add
    // matric and level on their profile after first login.
    const { data: application, error: insertError } = await admin
      .from("applications")
      .insert({
        applicant_name: name,
        email,
        matric_no: null,
        level: null,
        cgpa: null,
        phone: null,
        department: "Civil Engineering",
        role_preference_1: role,
        role_preference_2: null,
        role_preference_3: null,
        motivation_statement: null,
        cv_url: null,
        status: "accepted",
        review_notes: "Direct invite by owner",
        reviewed_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !application) {
      console.error("Direct invite: failed to record the invite.");
      return NextResponse.json(
        { error: "Failed to record the invite." },
        { status: 500 }
      );
    }

    // Shared accept steps (auth user, member row, invite link,
    // acceptance mail) — the same helper the application accept route
    // uses.
    const result = await inviteMember(admin, { name, email, role });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // The invite link is only ever returned to the authorised admin caller.
    // A failed email still returns success so the admin can copy the link
    // manually.
    return NextResponse.json({
      ok: true,
      userId: result.userId,
      applicationId: application.id,
      ...(result.inviteLink ? { inviteLink: result.inviteLink } : {}),
      ...(result.emailError ? { emailError: result.emailError } : {}),
    });
  } catch {
    console.error("Direct invite API error.");
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
