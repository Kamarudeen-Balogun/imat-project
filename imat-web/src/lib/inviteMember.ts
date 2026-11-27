// Shared "accept someone as a member" steps, used by both the
// application accept route (POST /api/applications/[id]/accept) and
// the direct invite route (POST /api/members/invite) so the two
// paths cannot drift apart.
//
// Steps: create the auth user (or reuse the existing one on a
// retry), upsert the member row, generate a set-password link and
// send the acceptance mail through Resend.
//
// Supabase email is NOT used here. The link is generated with
// generateLink and mailed via the email lib so the sender stays
// noreply@imat.codeflowx.dev.
//
// NOTE: use a "recovery" link, not an "invite" link. createUser
// confirms the email (email_confirm: true), and Supabase rejects
// invite links for confirmed users with 422 ("already been
// registered"), so the mail would never go out. A recovery link
// works for a confirmed user and lands on the same
// /auth/set-password flow.
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { acceptanceEmail, sendEmail } from "@/lib/email";

const INVITE_REDIRECT_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://imat-futa.vercel.app") +
  "/auth/callback";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type InviteMemberInput = {
  name: string;
  email: string;
  role: string;
  matricNo?: string | null;
  phone?: string | null;
  level?: number | null;
  cgpa?: number | null;
};

export type InviteMemberResult =
  | {
      ok: true;
      userId: string;
      inviteLink?: string;
      emailError?: string;
    }
  | { ok: false; error: string };

/**
 * Reuse an existing auth user when createUser reports the email is already
 * registered (e.g. a retried accept). Scans auth users by email; IMAT has a
 * small user base so a paged scan is acceptable here.
 */
export async function findAuthUserByEmail(admin: AdminClient, email: string) {
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

export async function inviteMember(
  admin: AdminClient,
  input: InviteMemberInput
): Promise<InviteMemberResult> {
  const { name, email, role } = input;

  // Create the auth user. If the email is already registered (e.g. this
  // accept is retried after a partial failure), reuse that auth user
  // instead of failing.
  let authUserId: string | null = null;
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

  if (!createError && created?.user) {
    authUserId = created.user.id;
  } else {
    const existing = await findAuthUserByEmail(admin, email);
    if (existing) {
      authUserId = existing.id;
    } else {
      console.error("inviteMember: failed to create auth user.");
      return { ok: false, error: "Failed to create an account." };
    }
  }

  // Upsert so a retried accept reuses the member row instead of failing
  // on the primary key / email uniqueness.
  const { error: upsertError } = await admin.from("users").upsert(
    {
      id: authUserId,
      email,
      full_name: name,
      matric_no: input.matricNo ?? null,
      phone: input.phone ?? null,
      level: input.level ?? null,
      cgpa: input.cgpa ?? null,
      role,
      status: "active",
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    console.error("inviteMember: failed to create member record.");
    return { ok: false, error: "Failed to create the member record." };
  }

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email,
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
      to: email,
      type: "acceptance",
      ...acceptanceEmail(name, inviteLink),
    });
    if (!emailResult.ok) {
      emailError = emailResult.error ?? "Acceptance email could not be sent.";
    }
  }

  // A failed email still returns success so the admin can copy the link
  // manually; the invite link is only ever returned to the authorised
  // admin caller.
  return {
    ok: true,
    userId: authUserId,
    ...(inviteLink ? { inviteLink } : {}),
    ...(emailError ? { emailError } : {}),
  };
}
