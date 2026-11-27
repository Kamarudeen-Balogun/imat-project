import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://imat.codeflowx.dev";

function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, SITE_URL));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const type = request.nextUrl.searchParams.get("type");

  // No PKCE code: this is an implicit (hash-based) invite/recovery link.
  // The browser never sends the #access_token fragment to the server, and
  // it preserves the fragment across this redirect, so the set-password
  // page can read the tokens from the URL hash.
  if (!code) {
    return redirectTo("/auth/set-password");
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback code exchange failed.");
    return redirectTo("/login?error=auth_callback_failed");
  }

  if (type === "invite" || type === "recovery") {
    return redirectTo("/auth/set-password");
  }

  return redirectTo("/dashboard");
}
