import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canApproveContent } from "@/lib/access";
import { logActivityEvent } from "@/lib/activity/logEvent";
import {
  notifyAuthorOfDecision,
  runPublishSideEffects,
  type ApprovalKind,
} from "@/lib/announcements/notify";

/**
 * Shared approval decisions — the single enforcement point for the
 * pending_approval -> published / draft transitions.
 *
 * The per-section server actions (news / wiki / evidence) and the central
 * /dashboard/approvals queue all delegate here, so the transition, the
 * author notification and the activity log can never drift apart. Callers
 * decide what happens after a decision (redirect to their own manager page,
 * or just revalidate the queue) — this module never redirects on success.
 *
 * Allowed transitions:
 *   pending_approval -> published (owner/admin only; announcements run the
 *   full publish fan-out: in-app + push + email)
 *   pending_approval -> draft   (owner/admin only, with a review note)
 */

export type { ApprovalKind };

type PendingRow = {
  id: string;
  slug: string | null;
  title: string;
  status: "draft" | "pending_approval" | "published" | null;
  authorId: string | null;
};

const KIND_TABLE: Record<ApprovalKind, string> = {
  announcement: "announcements",
  wiki: "wiki_pages",
  evidence: "evidence_gallery",
};

const KIND_SELECT: Record<ApprovalKind, string> = {
  announcement: "id, slug, title, status, author_id",
  wiki: "id, slug, title, status, author_id",
  evidence: "id, title, status, created_by",
};

const KIND_AUTHOR_COLUMN: Record<ApprovalKind, "author_id" | "created_by"> = {
  announcement: "author_id",
  wiki: "author_id",
  evidence: "created_by",
};

const KIND_ENTITY_TYPE: Record<ApprovalKind, string> = {
  announcement: "announcement",
  wiki: "wiki_page",
  evidence: "evidence",
};

export async function requireApprover() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!canApproveContent(profile?.role)) redirect("/dashboard");
  return { user, role: profile?.role ?? null };
}

async function loadPendingRow(kind: ApprovalKind, id: string): Promise<PendingRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from(KIND_TABLE[kind])
    .select(KIND_SELECT[kind])
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;
  return {
    id: String(row.id),
    slug: typeof row.slug === "string" ? row.slug : null,
    title: String(row.title ?? ""),
    status: (row.status as PendingRow["status"]) ?? null,
    authorId:
      typeof row[KIND_AUTHOR_COLUMN[kind]] === "string"
        ? (row[KIND_AUTHOR_COLUMN[kind]] as string)
        : null,
  };
}

export async function approvePendingItem(
  kind: ApprovalKind,
  itemId: string,
  actorId: string,
): Promise<{ ok: boolean }> {
  const row = await loadPendingRow(kind, itemId);
  if (!row || row.status !== "pending_approval") return { ok: false };

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: "published",
    reviewed_by: actorId,
    review_note: null,
    updated_at: now,
  };
  if (kind === "announcement") update.published_at = now;
  const { error } = await admin.from(KIND_TABLE[kind]).update(update).eq("id", itemId);
  if (error) return { ok: false };

  // The existing publish path, verbatim: in-app fan-out + push + email.
  if (kind === "announcement") {
    await runPublishSideEffects(itemId, actorId);
  }

  if (row.authorId && row.authorId !== actorId) {
    await notifyAuthorOfDecision({
      kind,
      itemId,
      authorId: row.authorId,
      actorId,
      title: row.title,
      approved: true,
    });
  }

  const approveEvents: Record<ApprovalKind, string> = {
    announcement: "announcement_published",
    wiki: "wiki_approved",
    evidence: "evidence_approved",
  };
  const approveTitles: Record<ApprovalKind, string> = {
    announcement: `Approved and published broadcast: ${row.title}`,
    wiki: `Approved wiki page: ${row.title}`,
    evidence: `Approved evidence: ${row.title}`,
  };
  await logActivityEvent(admin, {
    eventType: approveEvents[kind],
    entityType: KIND_ENTITY_TYPE[kind],
    entityId: itemId,
    title: approveTitles[kind],
    actorId,
    details: row.slug ? { slug: row.slug } : {},
    isRelevant: true,
  });

  return { ok: true };
}

export async function rejectPendingItem(
  kind: ApprovalKind,
  itemId: string,
  actorId: string,
  reviewNote: string,
): Promise<{ ok: boolean }> {
  const row = await loadPendingRow(kind, itemId);
  if (!row || row.status !== "pending_approval") return { ok: false };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from(KIND_TABLE[kind])
    .update({
      status: "draft",
      reviewed_by: actorId,
      review_note: reviewNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  if (error) return { ok: false };

  if (row.authorId && row.authorId !== actorId) {
    await notifyAuthorOfDecision({
      kind,
      itemId,
      authorId: row.authorId,
      actorId,
      title: row.title,
      approved: false,
      reviewNote,
    });
  }

  const rejectEvents: Record<ApprovalKind, string> = {
    announcement: "announcement_updated",
    wiki: "wiki_rejected",
    evidence: "evidence_rejected",
  };
  const rejectTitles: Record<ApprovalKind, string> = {
    announcement: `Returned broadcast for changes: ${row.title}`,
    wiki: `Returned wiki page for changes: ${row.title}`,
    evidence: `Returned evidence for changes: ${row.title}`,
  };
  await logActivityEvent(admin, {
    eventType: rejectEvents[kind],
    entityType: KIND_ENTITY_TYPE[kind],
    entityId: itemId,
    title: rejectTitles[kind],
    actorId,
    details: row.slug ? { slug: row.slug } : {},
    isRelevant: true,
  });

  return { ok: true };
}
