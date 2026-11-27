import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient } from "@/lib/supabase/server";
import { canEditContent } from "@/lib/access";
import { sendAnnouncementEmails } from "@/lib/announcementEmail";

const bodySchema = z.object({
  announcementId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid announcement payload." }, { status: 400 });
  }

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

  if (!canEditContent(profile?.role)) {
    return NextResponse.json({ error: "You do not have permission to send announcement emails." }, { status: 403 });
  }

  // Fail soft: sending is best-effort and must never break the publish
  // flow that called this route. sendAnnouncementEmails never throws,
  // but guard anyway so a failure still returns 200 with zero counts.
  try {
    const counts = await sendAnnouncementEmails(parsed.data.announcementId);
    return NextResponse.json({ ok: true, ...counts }, { status: 200 });
  } catch (error) {
    const emailError = error instanceof Error ? error.message : "Announcement email delivery failed.";
    console.warn("Announcement email delivery failed.", emailError);
    return NextResponse.json(
      { ok: true, sent: 0, failed: 0, skipped: 0, emailError },
      { status: 200 }
    );
  }
}
