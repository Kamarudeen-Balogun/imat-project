"use server";

import { revalidatePath } from "next/cache";
import {
  approvePendingItem,
  rejectPendingItem,
  requireApprover,
  type ApprovalKind,
} from "@/lib/approvals/decide";

/**
 * Decisions from the central /dashboard/approvals queue.
 *
 * Same decision logic as the per-section actions (news / wiki / evidence) —
 * they all delegate to lib/approvals/decide. The only difference is where
 * the approver ends up: these stay on the queue (revalidate, no redirect),
 * while the per-section actions redirect back to their own manager page.
 */

const MANAGER_PATH: Record<ApprovalKind, string> = {
  announcement: "/dashboard/news",
  wiki: "/dashboard/wiki",
  evidence: "/dashboard/evidence",
};

function parseKind(value: FormDataEntryValue | null): ApprovalKind | null {
  const kind = String(value ?? "").trim();
  if (kind === "announcement" || kind === "wiki" || kind === "evidence") return kind;
  return null;
}

export async function approveApproval(formData: FormData) {
  const { user } = await requireApprover();

  const kind = parseKind(formData.get("kind"));
  const itemId = String(formData.get("item_id") ?? "").trim();
  if (!kind || !itemId) return;

  const { ok } = await approvePendingItem(kind, itemId, user.id);
  if (!ok) return;

  revalidatePath("/dashboard/approvals");
  revalidatePath(MANAGER_PATH[kind]);
}

export async function rejectApproval(formData: FormData) {
  const { user } = await requireApprover();

  const kind = parseKind(formData.get("kind"));
  const itemId = String(formData.get("item_id") ?? "").trim();
  // A rejection without a reason is blocked server-side, exactly like the
  // per-section actions: nothing changes and the item stays in the queue.
  const reviewNote = String(formData.get("review_note") ?? "").trim().slice(0, 500);
  if (!kind || !itemId || !reviewNote) return;

  const { ok } = await rejectPendingItem(kind, itemId, user.id, reviewNote);
  if (!ok) return;

  revalidatePath("/dashboard/approvals");
  revalidatePath(MANAGER_PATH[kind]);
}
