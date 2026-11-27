import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { sanitizeEmail, sanitizeNumericText, sanitizePlainText, sanitizePhoneNumber } from "@/lib/inputSanitizer";
import { enforceRateLimit } from "@/lib/serverRateLimit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sendEmail, applicationReceivedEmail } from "@/lib/email";

const WEB_APP_URL = process.env.GOOGLE_APPS_SCRIPT_APPLY_URL;

const bodySchema = z.object({
  fullName: z.string().min(1).max(120),
  matricNumber: z.string().min(1).max(40),
  gender: z.string().min(1).max(20),
  level: z.string().min(1).max(8),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  address: z.string().max(200).optional().default(""),
  cgpa: z.string().max(8),
  graduationYear: z.string().max(4).optional().default(""),
  leadership: z.string().max(10).optional().default(""),
  leadershipDetail: z.string().max(1000).optional().default(""),
  workingGroups: z.array(z.string()).max(10),
  positions: z.array(z.string()).max(10),
  skills: z.array(z.string()).max(20),
  otherSkills: z.string().max(300).optional().default(""),
  motivation: z.string().min(1).max(4000),
  timeCommitment: z.string().min(1).max(100),
  refereeName: z.string().max(120).optional().default(""),
  refereeDept: z.string().max(120).optional().default(""),
  refereeEmail: z.union([z.string().email(), z.literal("")]).optional().default(""),
  refereePhone: z.string().max(20).optional().default(""),
  agreement: z.string().min(1),
  signature: z.string().min(1).max(120),
  signatureDate: z.string().min(1).max(20),
  honeypot: z.string().optional().default(""),
  turnstileToken: z.string().min(1),
});

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const realIp = request.headers.get("x-real-ip") || "";
  return forwardedFor.split(",")[0]?.trim() || realIp.trim() || "unknown";
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
    throw new Error("Supabase service credentials are missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey || anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!WEB_APP_URL) {
      return NextResponse.json(
        { error: "Application integration is not configured yet." },
        { status: 503 }
      );
    }

    const ip = getClientIp(request);
    const rateLimit = await enforceRateLimit(`apply:${ip}`, 5, 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please wait and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const payload = await request.json();
    const parsed = bodySchema.safeParse({
      ...payload,
      fullName: sanitizePlainText(payload.fullName ?? "", 120),
      matricNumber: sanitizePlainText(payload.matricNumber ?? "", 40),
      gender: sanitizePlainText(payload.gender ?? "", 20),
      level: sanitizeNumericText(payload.level ?? "", 8),
      email: sanitizeEmail(payload.email ?? ""),
      phone: sanitizePhoneNumber(payload.phone ?? ""),
      address: sanitizePlainText(payload.address ?? "", 200),
      cgpa: sanitizePlainText(payload.cgpa ?? "", 8),
      graduationYear: sanitizeNumericText(payload.graduationYear ?? "", 4),
      leadership: sanitizePlainText(payload.leadership ?? "", 10),
      leadershipDetail: sanitizePlainText(payload.leadershipDetail ?? "", 1000),
      workingGroups: Array.isArray(payload.workingGroups) ? payload.workingGroups.map((value: string) => sanitizePlainText(value, 120)) : [],
      positions: Array.isArray(payload.positions) ? payload.positions.map((value: string) => sanitizePlainText(value, 120)) : [],
      skills: Array.isArray(payload.skills) ? payload.skills.map((value: string) => sanitizePlainText(value, 120)) : [],
      otherSkills: sanitizePlainText(payload.otherSkills ?? "", 300),
      motivation: sanitizePlainText(payload.motivation ?? "", 4000),
      timeCommitment: sanitizePlainText(payload.timeCommitment ?? "", 100),
      refereeName: sanitizePlainText(payload.refereeName ?? "", 120),
      refereeDept: sanitizePlainText(payload.refereeDept ?? "", 120),
      refereeEmail: sanitizeEmail(payload.refereeEmail ?? ""),
      refereePhone: sanitizePhoneNumber(payload.refereePhone ?? ""),
      agreement: sanitizePlainText(payload.agreement ?? "", 40),
      signature: sanitizePlainText(payload.signature ?? "", 120),
      signatureDate: sanitizePlainText(payload.signatureDate ?? "", 20),
      honeypot: sanitizePlainText(payload.honeypot ?? "", 120),
      turnstileToken: typeof payload.turnstileToken === "string" ? payload.turnstileToken : "",
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid application payload." }, { status: 400 });
    }

    if (parsed.data.honeypot) {
      return NextResponse.json({ error: "Invalid application payload." }, { status: 400 });
    }

    const verified = await verifyTurnstileToken(parsed.data.turnstileToken, ip);
    if (!verified) {
      return NextResponse.json({ error: "Bot verification failed. Please try again." }, { status: 403 });
    }

    const payloadForAppsScript = {
      fullName: parsed.data.fullName,
      matricNumber: parsed.data.matricNumber,
      gender: parsed.data.gender,
      level: parsed.data.level,
      email: parsed.data.email,
      phone: parsed.data.phone,
      address: parsed.data.address,
      cgpa: parsed.data.cgpa,
      graduationYear: parsed.data.graduationYear,
      leadership: parsed.data.leadership,
      leadershipDetail: parsed.data.leadershipDetail,
      workingGroups: parsed.data.workingGroups,
      positions: parsed.data.positions,
      skills: parsed.data.skills,
      otherSkills: parsed.data.otherSkills,
      motivation: parsed.data.motivation,
      timeCommitment: parsed.data.timeCommitment,
      refereeName: parsed.data.refereeName,
      refereeDept: parsed.data.refereeDept,
      refereeEmail: parsed.data.refereeEmail,
      refereePhone: parsed.data.refereePhone,
      agreement: parsed.data.agreement,
      signature: parsed.data.signature,
      signatureDate: parsed.data.signatureDate,
    };

    const gasResponse = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payloadForAppsScript),
    });

    if (!gasResponse.ok) {
      console.warn(`GAS submit returned non-OK (${gasResponse.status}).`);
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.from("applications").insert([
      {
        applicant_name: parsed.data.fullName,
        matric_no: parsed.data.matricNumber,
        email: parsed.data.email,
        level: Number.parseInt(parsed.data.level, 10) || 0,
        cgpa: parsed.data.cgpa.toLowerCase() === "yes" ? 3.5 : 2.5,
        department: "Civil Engineering",
        role_preference_1: parsed.data.positions[0] || "",
        role_preference_2: parsed.data.positions[1] || null,
        motivation_statement: parsed.data.motivation,
        cv_url: "",
        status: "submitted",
      },
    ]);

    if (error) {
      console.error("Application insert failed.");
      return NextResponse.json({ error: "Failed to save application." }, { status: 500 });
    }

    // Notify the applicant that their application was received. A failed
    // email must not fail the application itself.
    try {
      await sendEmail({ to: parsed.data.email, ...applicationReceivedEmail(parsed.data.fullName) });
    } catch (emailError) {
      console.error("Application-received email failed.", emailError);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    console.error("Apply API error.");
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
