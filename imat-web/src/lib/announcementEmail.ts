// Announcement (newsroom) emails, sent via Resend through the shared
// email lib. Supabase email is NEVER used.
//
// The announcement email IS the notification email: one email per
// in-app notification row, never two. A row is emailed only once —
// rows with email_sent_at set are never re-selected — and only to
// recipients who are active with notifications enabled.

import { announcementEmail, sendEmail } from "@/lib/email";
import { getAnnouncementHref } from "@/lib/news";
import { markdownToPlainText } from "@/lib/markdown";
import { parseVideoUrl } from "@/lib/video";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AnnouncementEmailResult = {
  sent: number;
  failed: number;
  skipped: number;
};

type RecipientRow = {
  email: string | null;
  status: string | null;
  notifications_enabled: boolean | null;
};

type NotificationRow = {
  id: string;
  type: string;
  // supabase-js types an embedded many-to-one join as object-or-array.
  recipient: RecipientRow | RecipientRow[] | null;
};

function normalizeJoined<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function buildExcerpt(body: string, fallback: string): string {
  return markdownToPlainText(body).slice(0, 180) || fallback;
}

/**
 * Send the announcement email to every not-yet-emailed notification
 * recipient for an announcement. Per-recipient failures are counted
 * and never stop the others. Never throws: any unexpected error is
 * logged and returned as counts.
 */
export async function sendAnnouncementEmails(announcementId: string): Promise<AnnouncementEmailResult> {
  const counts: AnnouncementEmailResult = { sent: 0, failed: 0, skipped: 0 };

  try {
    const supabase = createSupabaseAdminClient();

    const { data: announcement, error: announcementError } = await supabase
      .from("announcements")
      .select("id, slug, title, body, visibility, excerpt, video_url, author:users!announcements_author_id_fkey(full_name)")
      .eq("id", announcementId)
      .single();

    if (announcementError || !announcement) {
      console.error("Announcement email: unable to load announcement.", announcementError ?? null);
      return counts;
    }

    const author = normalizeJoined(
      announcement.author as { full_name: string | null } | { full_name: string | null }[] | null
    );
    const authorName = author?.full_name ?? "IMAT Official";
    // Prefer the standfirst the author wrote; fall back to the body.
    const excerpt =
      (announcement.excerpt as string | null)?.trim() || buildExcerpt(announcement.body ?? "", announcement.title);
    const video = (announcement.video_url as string | null) ? parseVideoUrl(announcement.video_url as string) : null;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://imat-futa.vercel.app";
    const url = `${siteUrl}${getAnnouncementHref(announcement.slug ?? announcement.id)}`;
    const template = announcementEmail({ authorName, title: announcement.title, excerpt, url, video });

    const { data: rows, error: rowsError } = await supabase
      .from("notifications")
      .select("id, type, recipient:users!notifications_recipient_id_fkey(email, status, notifications_enabled)")
      .eq("announcement_id", announcementId)
      .is("email_sent_at", null);

    if (rowsError) {
      console.error("Announcement email: unable to load notification rows.", rowsError);
      return counts;
    }

    for (const row of (rows ?? []) as NotificationRow[]) {
      // "system" rows (none exist today) are not announcement emails.
      if (row.type === "system") {
        counts.skipped += 1;
        continue;
      }

      const recipient = normalizeJoined(row.recipient);
      if (!recipient?.email || recipient.status !== "active" || recipient.notifications_enabled !== true) {
        counts.skipped += 1;
        continue;
      }

      const result = await sendEmail({
        to: recipient.email,
        type: "announcement",
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (!result.ok) {
        console.warn("Announcement email: failed to send.", { notificationId: row.id, error: result.error });
        counts.failed += 1;
        continue;
      }

      const { error: markError } = await supabase
        .from("notifications")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", row.id);

      if (markError) {
        console.warn("Announcement email: sent but could not mark row.", { notificationId: row.id, error: markError });
        counts.failed += 1;
        continue;
      }

      counts.sent += 1;
    }
  } catch (error) {
    console.error("Announcement email: unexpected error.", error);
  }

  return counts;
}
