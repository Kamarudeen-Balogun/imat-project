import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient } from "@/lib/supabase/server";
import { canEditContent } from "@/lib/access";
import { sendAnnouncementPushNotifications } from "@/lib/push/server";

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

  try {
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

    if (!canEditContent(profile?.role)) {
      return NextResponse.json({ error: "You do not have permission to send notifications." }, { status: 403 });
    }

    const result = await sendAnnouncementPushNotifications(parsed.data.announcementId);
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push delivery is temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}