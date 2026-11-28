"use server";

import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canApproveContent } from "@/lib/access";
import { logActivityEvent } from "@/lib/activity/logEvent";
import { notifyApproversOfSubmission, notifyAuthorOfDecision } from "@/lib/announcements/notify";

/**
 * Approval workflow for wiki pages (server actions — the enforcement point).
 *
 * Allowed transitions:
 *   draft -> pending_approval   (author, or an approver on their behalf)
 *   pending_approval -> published (owner/admin only)
 *   pending_approval -> draft   (owner/admin only, with a review note)
 * Wiki editors (documentation_officer/president) publish directly on create;
 * every other member submits for approval. Buttons alone never enforce this.
 */

type WikiRow = {
  id: string;
  slug: string | null;
  title: string;
  status: "draft" | "pending_approval" | "published" | null;
  author_id: string | null;
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

async function loadWikiPage(id: string): Promise<WikiRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("wiki_pages").select("id, slug, title, status, author_id").eq("id", id).maybeSingle();
  return (data ?? null) as WikiRow | null;
}

export async function submitWikiPageForApproval(formData: FormData) {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pageId = String(formData.get("wiki_page_id") ?? "").trim();
  if (!pageId) redirect("/dashboard/wiki");

  const page = await loadWikiPage(pageId);
  if (!page) redirect("/dashboard/wiki");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAuthor = page.author_id === user.id;
  const isApprover = canApproveContent(profile?.role);
  if (!isAuthor && !isApprover) redirect("/dashboard");
  if (page.status !== "draft") redirect("/dashboard/wiki");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("wiki_pages")
    .update({ status: "pending_approval", submitted_by: user.id, review_note: null, updated_at: new Date().toISOString() })
    .eq("id", pageId);
  if (error) redirect("/dashboard/wiki");

  await notifyApproversOfSubmission({ kind: "wiki", itemId: pageId, title: page.title, actorId: user.id });

  await logActivityEvent(admin, {
    eventType: "wiki_submitted",
    entityType: "wiki_page",
    entityId: pageId,
    title: `Submitted wiki page for approval: ${page.title}`,
    actorId: user.id,
    details: { slug: page.slug },
    isRelevant: true,
  });

  redirect("/dashboard/wiki");
}

export async function approveWikiPage(formData: FormData) {
  const { user } = await requireApprover();

  const pageId = String(formData.get("wiki_page_id") ?? "").trim();
  if (!pageId) redirect("/dashboard/wiki");

  const page = await loadWikiPage(pageId);
  if (!page || page.status !== "pending_approval") redirect("/dashboard/wiki");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("wiki_pages")
    .update({ status: "published", reviewed_by: user.id, review_note: null, updated_at: new Date().toISOString() })
    .eq("id", pageId);
  if (error) redirect("/dashboard/wiki");

  if (page.author_id && page.author_id !== user.id) {
    await notifyAuthorOfDecision({
      kind: "wiki",
      itemId: pageId,
      authorId: page.author_id,
      actorId: user.id,
      title: page.title,
      approved: true,
    });
  }

  await logActivityEvent(admin, {
    eventType: "wiki_approved",
    entityType: "wiki_page",
    entityId: pageId,
    title: `Approved wiki page: ${page.title}`,
    actorId: user.id,
    details: { slug: page.slug },
    isRelevant: true,
  });

  redirect("/dashboard/wiki");
}

export async function rejectWikiPage(formData: FormData) {
  const { user } = await requireApprover();

  const pageId = String(formData.get("wiki_page_id") ?? "").trim();
  const reviewNote = String(formData.get("review_note") ?? "").trim().slice(0, 500);
  if (!pageId || !reviewNote) redirect("/dashboard/wiki");

  const page = await loadWikiPage(pageId);
  if (!page || page.status !== "pending_approval") redirect("/dashboard/wiki");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("wiki_pages")
    .update({ status: "draft", reviewed_by: user.id, review_note: reviewNote, updated_at: new Date().toISOString() })
    .eq("id", pageId);
  if (error) redirect("/dashboard/wiki");

  if (page.author_id && page.author_id !== user.id) {
    await notifyAuthorOfDecision({
      kind: "wiki",
      itemId: pageId,
      authorId: page.author_id,
      actorId: user.id,
      title: page.title,
      approved: false,
      reviewNote,
    });
  }

  await logActivityEvent(admin, {
    eventType: "wiki_rejected",
    entityType: "wiki_page",
    entityId: pageId,
    title: `Returned wiki page for changes: ${page.title}`,
    actorId: user.id,
    details: { slug: page.slug },
    isRelevant: true,
  });

  redirect("/dashboard/wiki");
}
