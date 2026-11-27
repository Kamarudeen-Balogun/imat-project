import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { acceptanceEmail, sendEmail } from "@/lib/email";
import { enforceRateLimit } from "@/lib/serverRateLimit";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://imat-futa.vercel.app";

const bodySchema = z.object({
  email: z.string().trim().email().max(254),
});

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const realIp = request.headers.get("x-real-ip") || "";
  return forwardedFor.split(",")[0]?.trim() || realIp.trim() || "unknown";
}

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Find an auth user by email. Scans auth users; IMAT has a small user base
 * so a paged scan is acceptable here. Same pattern as the application
 * accept route and the forgot-password route.
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

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await enforceRateLimit(`auth-resend-invite:${ip}`, 5, 60 * 1000);
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
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }
  const email = parsed.data.email;

  // The response is always { ok: true } whether or not a new invite is
  // sent, so the endpoint never reveals whether an application or account
  // exists for this email.
  try {
    const admin = createSupabaseAdminClient();
    const authUser = await findAuthUserByEmail(admin, email);

    // No account yet: nothing to resend (pending/rejected applications
    // and unknown emails all end up here).
    if (!authUser) {
      return NextResponse.json({ ok: true });
    }

    // Already signed in before: they have a password. A fresh invite is
    // not what they need — the forgot-password flow covers them.
    if (authUser.last_sign_in_at) {
      return NextResponse.json({ ok: true });
    }

    // Only accepted applications get a new invite. Pending or rejected
    // applications (and accepted ones whose member row is missing) get
    // nothing.
    const { data: application } = await admin
      .from("applications")
      .select("id")
      .eq("email", email)
      .eq("status", "accepted")
      .limit(1)
      .maybeSingle();

    if (!application) {
      return NextResponse.json({ ok: true });
    }

    const { data: profile } = await admin
      .from("users")
      .select("full_name")
      .eq("id", authUser.id)
      .single();

    if (!profile) {
      return NextResponse.json({ ok: true });
    }

    // NOTE: use a "recovery" link, not an "invite" link. The account was
    // created with email_confirm: true, so Supabase rejects invite links
    // for confirmed users with 422 ("already been registered"). A recovery
    // link works and lands on the same set-password flow.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${SITE_URL}/auth/callback` },
    });
    const inviteLink: string | undefined =
      linkData?.properties?.action_link ?? undefined;

    if (linkError || !inviteLink) {
      console.error("Resend invite: failed to generate invite link.");
    } else {
      const displayName = profile.full_name?.trim() || "there";
      const emailResult = await sendEmail({
        to: email,
        ...acceptanceEmail(displayName, inviteLink),
      });
      if (!emailResult.ok) {
        console.error("Resend invite: failed to send invite email.");
      }
    }
  } catch {
    console.error("Resend invite API error.");
  }

  return NextResponse.json({ ok: true });
}
