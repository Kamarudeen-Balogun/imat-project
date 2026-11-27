import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { passwordResetEmail, sendEmail } from "@/lib/email";
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
 * accept route.
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
  const rateLimit = await enforceRateLimit(`auth-forgot-password:${ip}`, 5, 60 * 1000);
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

  // The response is always { ok: true } whether or not an account exists
  // for this email, so the endpoint never reveals account existence.
  try {
    const admin = createSupabaseAdminClient();
    const authUser = await findAuthUserByEmail(admin, email);

    if (authUser) {
      // Supabase must NOT send the recovery email itself; the link is sent
      // through Resend via the email lib so the sender stays
      // noreply@imat.codeflowx.dev.
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${SITE_URL}/auth/callback` },
      });
      const resetLink: string | undefined =
        linkData?.properties?.action_link ?? undefined;

      if (linkError || !resetLink) {
        console.error("Forgot password: failed to generate reset link.");
      } else {
        const { data: profile } = await admin
          .from("users")
          .select("full_name")
          .eq("id", authUser.id)
          .single();
        const displayName = profile?.full_name?.trim() || "there";

        const emailResult = await sendEmail({
          to: email,
          ...passwordResetEmail(displayName, resetLink),
        });
        if (!emailResult.ok) {
          console.error("Forgot password: failed to send reset email.");
        }
      }
    }
  } catch {
    console.error("Forgot password API error.");
  }

  return NextResponse.json({ ok: true });
}
