"use server";

import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canApproveContent } from "@/lib/access";
import { logActivityEvent } from "@/lib/activity/logEvent";
import {
  notifyApproversOfSubmission,
  notifyAuthorOfDecision,
  runPublishSideEffects,
} from "@/lib/announcements/notify";

/**
 * Approval workflow for broadcasts (server actions — the enforcement point).
 *
 * Allowed transitions:
 *   draft -> pending_approval   (author, or an approver on their behalf)
 *   pending_approval -> published (owner/admin only; runs the publish fan-out)
 *   pending_approval -> draft   (owner/admin only, with a review note)
 * Direct publish stays owner/admin only. Buttons alone never enforce this.
 */

type AnnouncementRow = {
  id: string;
  slug: string | null;
  title: string;
  status: "draft" | "pending_approval" | "published" | null;
  author_id: string | null;
  visibility: "public" | "members_only";
};

async function requireApprover() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!canApproveContent(profile?.role)) redirect("/dashboard");
  return { user, role: profile?.role ?? null };
}

async function loadAnnouncement(id: string): Promise<AnnouncementRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("announcements")
    .select("id, slug, title, status, author_id, visibility")
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as AnnouncementRow | null;
}

export async function submitAnnouncementForApproval(formData: FormData) {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const announcementId = String(formData.get("announcement_id") ?? "").trim();
  if (!announcementId) redirect("/dashboard/news");

  const announcement = await loadAnnouncement(announcementId);
  if (!announcement) redirect("/dashboard/news");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAuthor = announcement.author_id === user.id;
  const isApprover = canApproveContent(profile?.role);
  if (!isAuthor && !isApprover) redirect("/dashboard");
  if (announcement.status !== "draft") redirect("/dashboard/news");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("announcements")
    .update({
      status: "pending_approval",
      submitted_by: user.id,
      review_note: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", announcementId);
  if (error) redirect("/dashboard/news");

  await notifyApproversOfSubmission({
    kind: "announcement",
    itemId: announcementId,
    title: announcement.title,
    actorId: user.id,
  });

  await logActivityEvent(admin, {
    eventType: "announcement_submitted",
    entityType: "announcement",
    entityId: announcementId,
    title: `Submitted broadcast for approval: ${announcement.title}`,
    actorId: user.id,
    details: { slug: announcement.slug },
    isRelevant: true,
  });

  redirect("/dashboard/news");
}

export async function approveAnnouncement(formData: FormData) {
  const { user } = await requireApprover();

  const announcementId = String(formData.get("announcement_id") ?? "").trim();
  if (!announcementId) redirect("/dashboard/news");

  const announcement = await loadAnnouncement(announcementId);
  if (!announcement || announcement.status !== "pending_approval") redirect("/dashboard/news");

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("announcements")
    .update({
      status: "published",
      published_at: now,
      reviewed_by: user.id,
      review_note: null,
      updated_at: now,
    })
    .eq("id", announcementId);
  if (error) redirect("/dashboard/news");

  // The existing publish path, verbatim: in-app fan-out + push + email.
  await runPublishSideEffects(announcementId, user.id);

  if (announcement.author_id && announcement.author_id !== user.id) {
    await notifyAuthorOfDecision({
      kind: "announcement",
      itemId: announcementId,
      authorId: announcement.author_id,
      actorId: user.id,
      title: announcement.title,
      approved: true,
    });
  }

  await logActivityEvent(admin, {
    eventType: "announcement_published",
    entityType: "announcement",
    entityId: announcementId,
    title: `Approved and published broadcast: ${announcement.title}`,
    actorId: user.id,
    details: { slug: announcement.slug },
    isRelevant: true,
  });

  redirect("/dashboard/news");
}

export async function rejectAnnouncement(formData: FormData) {
  const { user } = await requireApprover();

  const announcementId = String(formData.get("announcement_id") ?? "").trim();
  const reviewNote = String(formData.get("review_note") ?? "").trim().slice(0, 500);
  if (!announcementId || !reviewNote) redirect("/dashboard/news");

  const announcement = await loadAnnouncement(announcementId);
  if (!announcement || announcement.status !== "pending_approval") redirect("/dashboard/news");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("announcements")
    .update({
      status: "draft",
      reviewed_by: user.id,
      review_note: reviewNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", announcementId);
  if (error) redirect("/dashboard/news");

  if (announcement.author_id && announcement.author_id !== user.id) {
    await notifyAuthorOfDecision({
      kind: "announcement",
      itemId: announcementId,
      authorId: announcement.author_id,
      actorId: user.id,
      title: announcement.title,
      approved: false,
      reviewNote,
    });
  }

  await logActivityEvent(admin, {
    eventType: "announcement_updated",
    entityType: "announcement",
    entityId: announcementId,
    title: `Returned broadcast for changes: ${announcement.title}`,
    actorId: user.id,
    details: { slug: announcement.slug },
    isRelevant: true,
  });

  redirect("/dashboard/news");
}
