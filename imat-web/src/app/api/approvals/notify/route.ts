import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient } from "@/lib/supabase/server";
import { canApproveContent, canEditContent } from "@/lib/access";
import {
  fanOutNewsNotifications,
  notifyApproversOfSubmission,
  syncNewsNotificationContent,
  type ApprovalKind,
} from "@/lib/announcements/notify";

const bodySchema = z.object({
  kind: z.enum(["announcement", "wiki", "evidence"]),
  id: z.string().uuid(),
  mode: z.enum(["submitted", "fanout", "sync"]),
  title: z.string().max(160).optional(),
  body: z.string().max(400).optional(),
});

const TABLE: Record<ApprovalKind, { table: string; authorColumn: string }> = {
  announcement: { table: "announcements", authorColumn: "author_id" },
  wiki: { table: "wiki_pages", authorColumn: "author_id" },
  evidence: { table: "evidence_gallery", authorColumn: "created_by" },
};

/**
 * Server-side notification delivery for the approval workflow and for publish
 * fan-out. Client code must never insert notification rows directly: the
 * user-scoped insert silently failed under RLS (see lib/announcements/notify.ts).
 */
export async function POST(request: NextRequest) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { kind, id, mode } = parsed.data;

  try {
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    const role = profile?.role ?? null;

    const { table, authorColumn } = TABLE[kind];
    const { data: item } = await supabase
      .from(table)
      .select(`id, title, status, ${authorColumn}`)
      .eq("id", id)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    const isAuthor = (item as unknown as Record<string, unknown>)[authorColumn] === user.id;

    if (mode === "submitted") {
      // Only the author (or an approver) may announce a submission, and only
      // while the item is actually pending approval.
      if (!isAuthor && !canApproveContent(role)) {
        return NextResponse.json({ error: "You do not have permission to do that." }, { status: 403 });
      }
      if ((item as { status?: string | null }).status !== "pending_approval") {
        return NextResponse.json({ error: "Item is not pending approval." }, { status: 409 });
      }
      const result = await notifyApproversOfSubmission({
        kind,
        itemId: id,
        title: (item as unknown as { title: string }).title,
        actorId: user.id,
      });
      return NextResponse.json({ ok: true, ...result }, { status: 200 });
    }

    // fanout/sync are announcement-only and need an editor; the item must be published.
    if (kind !== "announcement") {
      return NextResponse.json({ error: "This mode only applies to announcements." }, { status: 400 });
    }
    if (!canEditContent(role)) {
      return NextResponse.json({ error: "You do not have permission to do that." }, { status: 403 });
    }
    if ((item as { status?: string | null }).status !== "published") {
      return NextResponse.json({ error: "Announcement is not published." }, { status: 409 });
    }

    if (mode === "fanout") {
      const result = await fanOutNewsNotifications(id, user.id);
      return NextResponse.json({ ok: true, ...result }, { status: 200 });
    }

    const result = await syncNewsNotificationContent(
      id,
      parsed.data.title ?? (item as unknown as { title: string }).title,
      parsed.data.body ?? (item as unknown as { title: string }).title
    );
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification delivery is temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
