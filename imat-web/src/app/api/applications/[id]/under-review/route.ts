import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canReviewApplications } from "@/lib/access";
import { sanitizePlainText } from "@/lib/inputSanitizer";
import { enforceRateLimit } from "@/lib/serverRateLimit";

const bodySchema = z.object({
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

// Mark a submitted application as under review. Owner/admin only — the
// same reviewer gate as accept/reject. This is a working state, not a
// decision, so it records reviewed_by but leaves reviewed_at unset until
// the application is accepted or rejected.
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
  const rateLimit = await enforceRateLimit(`applications-under-review:${ip}`, 20, 60 * 1000);
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
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
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

    const admin = createSupabaseAdminClient();

    const { data: application, error: applicationError } = await admin
      .from("applications")
      .select("id, status")
      .eq("id", applicationId)
      .single();

    if (applicationError || !application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (application.status !== "submitted") {
      return NextResponse.json(
        { error: "Only submitted applications can be marked under review." },
        { status: 409 }
      );
    }

    const { error: updateError } = await admin
      .from("applications")
      .update({
        status: "under_review",
        review_notes: reviewNotes ?? null,
        reviewed_by: user.id,
      })
      .eq("id", applicationId);

    if (updateError) {
      console.error("Under-review application: failed to record status.");
      return NextResponse.json(
        { error: "Failed to mark the application under review." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    console.error("Under-review application API error.");
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
