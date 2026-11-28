"use server";

import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canApproveContent } from "@/lib/access";
import { logActivityEvent } from "@/lib/activity/logEvent";
import { notifyApproversOfSubmission, notifyAuthorOfDecision } from "@/lib/announcements/notify";

/**
 * Approval workflow for evidence items (server actions — the enforcement point).
 *
 * Allowed transitions:
 *   draft -> pending_approval   (author, or an approver on their behalf)
 *   pending_approval -> published (owner/admin only)
 *   pending_approval -> draft   (owner/admin only, with a review note)
 * Evidence editors (documentation_officer) publish directly on create;
 * every other member submits for approval. Buttons alone never enforce this.
 */

type EvidenceRow = {
  id: string;
  title: string;
  status: "draft" | "pending_approval" | "published" | null;
  created_by: string | null;
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

async function loadEvidenceItem(id: string): Promise<EvidenceRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("evidence_gallery").select("id, title, status, created_by").eq("id", id).maybeSingle();
  return (data ?? null) as EvidenceRow | null;
}

export async function submitEvidenceForApproval(formData: FormData) {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const itemId = String(formData.get("evidence_id") ?? "").trim();
  if (!itemId) redirect("/dashboard/evidence");

  const item = await loadEvidenceItem(itemId);
  if (!item) redirect("/dashboard/evidence");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAuthor = item.created_by === user.id;
  const isApprover = canApproveContent(profile?.role);
  if (!isAuthor && !isApprover) redirect("/dashboard");
  if (item.status !== "draft") redirect("/dashboard/evidence");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("evidence_gallery")
    .update({ status: "pending_approval", submitted_by: user.id, review_note: null, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) redirect("/dashboard/evidence");

  await notifyApproversOfSubmission({ kind: "evidence", itemId, title: item.title, actorId: user.id });

  await logActivityEvent(admin, {
    eventType: "evidence_submitted",
    entityType: "evidence",
    entityId: itemId,
    title: `Submitted evidence for approval: ${item.title}`,
    actorId: user.id,
    details: {},
    isRelevant: true,
  });

  redirect("/dashboard/evidence");
}

export async function approveEvidence(formData: FormData) {
  const { user } = await requireApprover();

  const itemId = String(formData.get("evidence_id") ?? "").trim();
  if (!itemId) redirect("/dashboard/evidence");

  const item = await loadEvidenceItem(itemId);
  if (!item || item.status !== "pending_approval") redirect("/dashboard/evidence");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("evidence_gallery")
    .update({ status: "published", reviewed_by: user.id, review_note: null, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) redirect("/dashboard/evidence");

  if (item.created_by && item.created_by !== user.id) {
    await notifyAuthorOfDecision({
      kind: "evidence",
      itemId,
      authorId: item.created_by,
      actorId: user.id,
      title: item.title,
      approved: true,
    });
  }

  await logActivityEvent(admin, {
    eventType: "evidence_approved",
    entityType: "evidence",
    entityId: itemId,
    title: `Approved evidence: ${item.title}`,
    actorId: user.id,
    details: {},
    isRelevant: true,
  });

  redirect("/dashboard/evidence");
}

export async function rejectEvidence(formData: FormData) {
  const { user } = await requireApprover();

  const itemId = String(formData.get("evidence_id") ?? "").trim();
  const reviewNote = String(formData.get("review_note") ?? "").trim().slice(0, 500);
  if (!itemId || !reviewNote) redirect("/dashboard/evidence");

  const item = await loadEvidenceItem(itemId);
  if (!item || item.status !== "pending_approval") redirect("/dashboard/evidence");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("evidence_gallery")
    .update({ status: "draft", reviewed_by: user.id, review_note: reviewNote, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) redirect("/dashboard/evidence");

  if (item.created_by && item.created_by !== user.id) {
    await notifyAuthorOfDecision({
      kind: "evidence",
      itemId,
      authorId: item.created_by,
      actorId: user.id,
      title: item.title,
      approved: false,
      reviewNote,
    });
  }

  await logActivityEvent(admin, {
    eventType: "evidence_rejected",
    entityType: "evidence",
    entityId: itemId,
    title: `Returned evidence for changes: ${item.title}`,
    actorId: user.id,
    details: {},
    isRelevant: true,
  });

  redirect("/dashboard/evidence");
}
