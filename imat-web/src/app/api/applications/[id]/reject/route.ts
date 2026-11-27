import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canReviewApplications } from "@/lib/access";
import { rejectionEmail, sendEmail } from "@/lib/email";
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
  const rateLimit = await enforceRateLimit(`applications-reject:${ip}`, 20, 60 * 1000);
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
    return NextResponse.json({ error: "Invalid reject payload." }, { status: 400 });
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
      .select("id, applicant_name, email, status")
      .eq("id", applicationId)
      .single();

    if (applicationError || !application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (application.status !== "submitted") {
      return NextResponse.json(
        { error: "Only submitted applications can be rejected." },
        { status: 409 }
      );
    }

    const { error: updateError } = await admin
      .from("applications")
      .update({
        status: "rejected",
        review_notes: reviewNotes ?? null,
        reviewed_by: user.id,
      })
      .eq("id", applicationId);

    if (updateError) {
      console.error("Reject application: failed to record rejection.");
      return NextResponse.json(
        { error: "Failed to record the rejection." },
        { status: 500 }
      );
    }

    // A failed rejection email must not undo the rejection; surface it so
    // the admin can follow up manually.
    const emailResult = await sendEmail({
      to: application.email,
      type: "rejection",
      ...rejectionEmail(application.applicant_name, reviewNotes),
    });

    return NextResponse.json({
      ok: true,
      ...(emailResult.ok
        ? {}
        : {
            emailError:
              emailResult.error ?? "Rejection email could not be sent.",
          }),
    });
  } catch {
    console.error("Reject application API error.");
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
