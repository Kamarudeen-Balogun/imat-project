import { NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeEmail, sanitizePlainText } from "@/lib/inputSanitizer";
import { enforceRateLimit } from "@/lib/serverRateLimit";

const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  subject: z.string().min(3).max(120),
  message: z.string().min(10).max(2000),
  website: z.string().max(200).optional().default(""),
});

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_CONTACT_URL;

  if (!appsScriptUrl) {
    return NextResponse.json(
      { error: "Contact integration is not configured yet." },
      { status: 503 }
    );
  }

  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(input);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill all fields correctly." }, { status: 400 });
  }

  // Hidden field should stay empty; bots often fill it.
  if (parsed.data.website && parsed.data.website.trim()) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const ip = getClientIp(request);
  const limit = await enforceRateLimit(`contact-form:${ip}`, 5, 60_000);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const payload = {
    name: sanitizePlainText(parsed.data.name, 80),
    email: sanitizeEmail(parsed.data.email),
    subject: sanitizePlainText(parsed.data.subject, 120),
    message: sanitizePlainText(parsed.data.message, 2000),
    source: "imat-web-about-contact",
    page: "/about",
    submittedAt: new Date().toISOString(),
    userAgent: request.headers.get("user-agent") || "unknown",
  };

  try {
    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Contact service is temporarily unavailable." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 502 }
    );
  }
}
