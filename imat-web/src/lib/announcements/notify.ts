import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAnnouncementHref } from "@/lib/news";
import { markdownToPlainText } from "@/lib/markdown";
import { sendAnnouncementEmails } from "@/lib/announcementEmail";
import { sendAnnouncementPushNotifications } from "@/lib/push/server";

// Server-side notification delivery for announcements.
//
// Root cause of the missing notification row (2026-11-28 throwaway publish
// test): the in-app fan-out was the ONLY publish side-effect that ran through
// the user-scoped client under RLS, with a nested-EXISTS insert policy, and the
// code never checked the insert error — so it failed silently while the
// admin-client mail and push paths succeeded. Every insert here now runs
// through the service-role client and logs its outcome, like mail/push
// already do. Callers must still check the caller's role themselves.

export type ApprovalKind = "announcement" | "wiki" | "evidence";

const APPROVAL_QUEUE_HREF: Record<ApprovalKind, string> = {
  announcement: "/dashboard/news",
  wiki: "/dashboard/wiki",
  evidence: "/dashboard/evidence",
};

export async function notifyUsers(input: {
  recipientIds: string[];
  actorId: string;
  type: "news_update" | "system";
  title: string;
  body: string;
  href: string;
  announcementId?: string | null;
}): Promise<{ inserted: number; error: string | null }> {
  if (input.recipientIds.length === 0) return { inserted: 0, error: null };

  const supabase = createSupabaseAdminClient();
  const rows = input.recipientIds.map((recipientId) => ({
    recipient_id: recipientId,
    created_by: input.actorId,
    announcement_id: input.announcementId ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href,
  }));

  const { data, error } = await supabase.from("notifications").insert(rows).select("id");
  if (error) {
    console.warn("Notification insert failed.", error);
    return { inserted: 0, error: error.message };
  }
  return { inserted: data?.length ?? 0, error: null };
}

async function approverIds(): Promise<string[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("status", "active")
    .in("role", ["owner", "admin"]);
  return (data ?? []).map((row) => row.id);
}

/** Notify all owner/admin users that an item is waiting for review. */
export async function notifyApproversOfSubmission(input: {
  kind: ApprovalKind;
  itemId: string;
  title: string;
  actorId: string;
}): Promise<{ inserted: number; error: string | null }> {
  const recipients = await approverIds();
  return notifyUsers({
    recipientIds: recipients.filter((id) => id !== input.actorId),
    actorId: input.actorId,
    type: "system",
    title: `Needs review: ${input.title}`,
    body: `A ${input.kind} item was submitted for approval. Review it in the ${input.kind === "announcement" ? "Newsroom Manager" : input.kind === "wiki" ? "Knowledge Base" : "Evidence Gallery"}.`,
    href: APPROVAL_QUEUE_HREF[input.kind],
    announcementId: input.kind === "announcement" ? input.itemId : null,
  });
}

/** Notify an item's author of an approve/reject decision. */
export async function notifyAuthorOfDecision(input: {
  kind: ApprovalKind;
  itemId: string;
  authorId: string;
  actorId: string;
  title: string;
  approved: boolean;
  reviewNote?: string | null;
}): Promise<{ inserted: number; error: string | null }> {
  const href =
    input.kind === "announcement"
      ? getAnnouncementHref(input.itemId)
      : APPROVAL_QUEUE_HREF[input.kind];
  return notifyUsers({
    recipientIds: [input.authorId],
    actorId: input.actorId,
    type: "system",
    title: input.approved ? `Approved: ${input.title}` : `Returned for changes: ${input.title}`,
    body: input.approved
      ? `Your ${input.kind} item was approved and is now live.`
      : `Your ${input.kind} item was returned for changes.${input.reviewNote ? ` Note from the reviewer: ${input.reviewNote}` : ""}`,
    href,
    announcementId: input.kind === "announcement" ? input.itemId : null,
  });
}

type AnnouncementRow = {
  id: string;
  slug: string | null;
  title: string;
  body: string;
  visibility: "public" | "members_only";
  status: "draft" | "pending_approval" | "published" | null;
};

/** In-app fan-out for a published announcement (replaces the old user-client insert). */
export async function fanOutNewsNotifications(announcementId: string, actorId: string): Promise<{ inserted: number; error: string | null }> {
  const supabase = createSupabaseAdminClient();
  const { data: announcement, error: loadError } = await supabase
    .from("announcements")
    .select("id, slug, title, body, visibility, status")
    .eq("id", announcementId)
    .single();

  if (loadError || !announcement) {
    console.warn("Notification fan-out failed: announcement not found.", loadError);
    return { inserted: 0, error: "Announcement not found." };
  }

  const row = announcement as AnnouncementRow;
  if (row.status !== "published") {
    return { inserted: 0, error: "Announcement is not published." };
  }

  let recipientsQuery = supabase
    .from("users")
    .select("id")
    .eq("status", "active")
    .eq("notifications_enabled", true);
  if (row.visibility === "members_only") {
    recipientsQuery = recipientsQuery.neq("role", "applicant");
  }
  const { data: recipients } = await recipientsQuery;
  if (!recipients || recipients.length === 0) return { inserted: 0, error: null };

  const { data: existing } = await supabase
    .from("notifications")
    .select("recipient_id")
    .eq("announcement_id", announcementId)
    .eq("type", "news_update");
  const alreadyNotified = new Set((existing ?? []).map((item) => item.recipient_id));
  const fresh = recipients.filter((recipient) => !alreadyNotified.has(recipient.id));
  if (fresh.length === 0) return { inserted: 0, error: null };

  return notifyUsers({
    recipientIds: fresh.map((recipient) => recipient.id),
    actorId,
    type: "news_update",
    title: row.title,
    body: markdownToPlainText(row.body).slice(0, 180) || row.title,
    href: getAnnouncementHref(row.slug ?? row.id),
    announcementId: row.id,
  });
}

/** Sync the title/body of existing in-app rows after an edit (replaces the old user-client update, which RLS silently blocked for other recipients). Also drops applicant rows when the post was flipped to members-only — the old client-side delete never worked (no DELETE policy for the user client), so those rows used to linger. */
export async function syncNewsNotificationContent(announcementId: string, title: string, body: string): Promise<{ updated: number; error: string | null }> {
  const supabase = createSupabaseAdminClient();
  const { data: announcement } = await supabase
    .from("announcements")
    .select("id, slug, status, visibility")
    .eq("id", announcementId)
    .single();
  if (!announcement || announcement.status !== "published") {
    return { updated: 0, error: "Announcement is not published." };
  }
  const { data, error } = await supabase
    .from("notifications")
    .update({ title, body, href: getAnnouncementHref(announcement.slug ?? announcement.id) })
    .eq("announcement_id", announcementId)
    .select("id");
  if (error) {
    console.warn("Notification sync failed.", error);
    return { updated: 0, error: error.message };
  }
  if ((announcement as { visibility?: string }).visibility === "members_only") {
    const { data: applicants } = await supabase.from("users").select("id").eq("status", "active").eq("role", "applicant");
    const applicantIds = (applicants ?? []).map((row) => row.id);
    if (applicantIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .eq("announcement_id", announcementId)
        .eq("type", "news_update")
        .in("recipient_id", applicantIds);
      if (deleteError) console.warn("Applicant notification cleanup failed.", deleteError);
    }
  }
  return { updated: data?.length ?? 0, error: null };
}

/** The full publish side-effects, verbatim: in-app fan-out + push + email. */
export async function runPublishSideEffects(announcementId: string, actorId: string): Promise<void> {
  const fanOut = await fanOutNewsNotifications(announcementId, actorId);
  if (fanOut.error) console.warn("Notification fan-out failed.", fanOut.error);

  try {
    await sendAnnouncementPushNotifications(announcementId);
  } catch (error) {
    console.warn("Push notification delivery failed.", error);
  }

  try {
    await sendAnnouncementEmails(announcementId);
  } catch (error) {
    console.warn("Announcement email delivery failed.", error);
  }
}
