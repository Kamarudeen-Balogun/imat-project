type TurnstileVerificationResult = {
  success: boolean;
  "error-codes"?: string[];
};

export const TURNSTILE_DEV_BYPASS_TOKEN = "turnstile-dev-bypass";

export function isTurnstileDevBypassEnabled() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return process.env.NEXT_PUBLIC_TURNSTILE_DEV_BYPASS !== "false";
}

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  if (isTurnstileDevBypassEnabled() && token === TURNSTILE_DEV_BYPASS_TOKEN) {
    return true;
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return false;
  }

  if (!token) {
    return false;
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as TurnstileVerificationResult;
  return data.success === true;
}