import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/serverRateLimit";
import { sanitizePlainText, sanitizeUrlList } from "@/lib/inputSanitizer";
import { verifyTurnstileToken } from "@/lib/turnstile";

const bodySchema = z.object({
  title: z.string().trim().min(3).max(80),
  category: z.enum(["drainage", "road", "walkway", "structure", "other"]),
  defect_type: z.string().trim().min(2).max(80),
  severity: z.coerce.number().int().min(1).max(5),
  campus_zone_id: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    },
    z.string().uuid().nullable()
  ),
  affected_area_sqm: z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") return null;
      if (typeof value === "number") return Number.isFinite(value) ? value : null;
      if (typeof value === "string") {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    },
    z.number().positive().nullable()
  ),
  location_lat: z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") return null;
      if (typeof value === "number") return Number.isFinite(value) ? value : null;
      if (typeof value === "string") {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    },
    z.number().min(-90).max(90).nullable()
  ),
  location_lng: z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") return null;
      if (typeof value === "number") return Number.isFinite(value) ? value : null;
      if (typeof value === "string") {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    },
    z.number().min(-180).max(180).nullable()
  ),
  description: z.string().trim().min(10).max(3000),
  photos: z.array(z.string().url()).max(4),
  turnstileToken: z.string().trim().min(1),
  honeypot: z.string().optional().default(""),
});

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 8;

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const realIp = request.headers.get("x-real-ip") || "";
  const candidate = forwardedFor.split(",")[0]?.trim() || realIp.trim() || "unknown";
  return candidate;
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey || anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await enforceRateLimit(`public-report:${ip}`, MAX_REQUESTS_PER_WINDOW, WINDOW_MS);

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
    const normalizedPayload = {
      ...payload,
      title: typeof payload.title === "string" ? sanitizePlainText(payload.title, 80) : payload.title,
      defect_type: typeof payload.defect_type === "string" ? sanitizePlainText(payload.defect_type, 80) : payload.defect_type,
      description: typeof payload.description === "string" ? sanitizePlainText(payload.description, 3000) : payload.description,
      photos: Array.isArray(payload.photos) ? sanitizeUrlList(payload.photos, 4) : payload.photos,
      honeypot: typeof payload.honeypot === "string" ? sanitizePlainText(payload.honeypot, 120) : "",
      turnstileToken: typeof payload.turnstileToken === "string" ? payload.turnstileToken : "",
    };

    const parsed = bodySchema.safeParse(normalizedPayload);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const fieldPath = firstIssue?.path?.join(".") || "payload";
      return NextResponse.json({ error: `Invalid report payload (${fieldPath}).` }, { status: 400 });
    }

    if (parsed.data.honeypot) {
      return NextResponse.json({ error: "Invalid report payload." }, { status: 400 });
    }

    const verified = await verifyTurnstileToken(parsed.data.turnstileToken, getClientIp(request));
    if (!verified) {
      return NextResponse.json({ error: "Bot verification failed. Please try again." }, { status: 403 });
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("defects").insert([
      {
        title: parsed.data.title,
        category: parsed.data.category,
        defect_type: parsed.data.defect_type,
        severity: parsed.data.severity,
        campus_zone_id: parsed.data.campus_zone_id,
        affected_area_sqm: parsed.data.affected_area_sqm,
        location_lat: parsed.data.location_lat,
        location_lng: parsed.data.location_lng,
        description: parsed.data.description,
        photos: parsed.data.photos,
      },
    ]);

    if (error) {
      console.error("Public report insert failed.");
      return NextResponse.json({ error: "Failed to save report." }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    console.error("Public report API error.");
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
