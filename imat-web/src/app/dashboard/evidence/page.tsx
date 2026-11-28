"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { canApproveContent, canEditEvidenceGallery, isMemberAuthor } from "@/lib/access";
import { logActivityEvent } from "@/lib/activity/logEvent";
import { toast } from "react-hot-toast";
import { Check, Edit3, Loader2, Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import EvidenceGalleryGrid, { type EvidenceGalleryItem } from "@/components/evidence/EvidenceGalleryGrid";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { sanitizePlainText, sanitizeUrl } from "@/lib/inputSanitizer";
import { approveEvidence, rejectEvidence, submitEvidenceForApproval } from "./actions";

// Manager rows carry the approval fields the public grid does not need.
type ManagerEvidenceItem = EvidenceGalleryItem & {
  status?: "draft" | "pending_approval" | "published" | null;
  review_note?: string | null;
  created_by?: string | null;
};

const MANAGER_SELECT = "id, title, description, category, before_image_url, after_image_url, sort_order, is_active, status, review_note, created_by, defect_id";

const emptyItem: ManagerEvidenceItem = {
  id: "new-item",
  title: "",
  description: "",
  category: "Drainage",
  before_image_url: "",
  after_image_url: null,
  sort_order: undefined,
  is_active: true,
  status: "published",
  defect_id: null,
};

export default function DashboardEvidencePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ManagerEvidenceItem[]>([]);
  const [newItem, setNewItem] = useState<ManagerEvidenceItem>(emptyItem);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ManagerEvidenceItem | null>(null);
  const [defectOptions, setDefectOptions] = useState<Array<{ id: string; title: string }>>([]);

  const isEditor = canEditEvidenceGallery(role);
  const isApprover = canApproveContent(role);
  const pendingCount = items.filter((item) => item.status === "pending_approval").length;

  // Attach the linked defect title to each item so the gallery preview can
  // show which issue an evidence item documents.
  const itemsWithDefects = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        defect: item.defect_id ? defectOptions.find((d) => d.id === item.defect_id) ?? null : null,
      })),
    [items, defectOptions]
  );

  // Editors and approvers can edit any item; other members can only edit
  // their own drafts and pending submissions — never a published item.
  const canEditItem = (item: ManagerEvidenceItem) =>
    isEditor || isApprover || (item.created_by === userId && item.status !== "published");
  const canDeleteItem = (item: ManagerEvidenceItem) =>
    isEditor || isApprover || (item.created_by === userId && item.status !== "published");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase.from("users").select("role").eq("id", session.user.id).single();
      const currentRole = profile?.role ?? null;
      setRole(currentRole);
      setUserId(session.user.id);

      // Any member (except applicants, who are not members yet) can submit
      // evidence. Editors publish directly; everyone else goes through approval.
      if (!isMemberAuthor(currentRole)) {
        router.push("/dashboard");
        return;
      }

      const { data } = await supabase
        .from("evidence_gallery")
        .select(MANAGER_SELECT)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      setItems((data ?? []) as ManagerEvidenceItem[]);

      const { data: defects } = await supabase
        .from("defects")
        .select("id, title")
        .order("created_at", { ascending: false })
        .limit(50);
      setDefectOptions((defects ?? []) as Array<{ id: string; title: string }>);
      setLoading(false);
    };

    void init();
  }, [router, supabase]);

  const uploadToCloudinary = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset =
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PHOTOS ||
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_ANNOUNCEMENTS;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary upload settings are missing.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Image upload failed.");
    }

    const data = (await response.json()) as { secure_url?: string };
    if (!data.secure_url) {
      throw new Error("Upload succeeded but image URL is missing.");
    }

    return data.secure_url;
  };

  const onUpload = async (kind: "new-before" | "new-after" | `item-before-${string}` | `item-after-${string}`, file?: File) => {
    if (!file) return;

    setUploading(kind);
    try {
      const url = await uploadToCloudinary(file);
      if (kind === "new-before") {
        setNewItem((current) => ({ ...current, before_image_url: url }));
      } else if (kind === "new-after") {
        setNewItem((current) => ({ ...current, after_image_url: url }));
      } else if (kind.startsWith("item-before-")) {
        const id = kind.replace("item-before-", "");
        setItems((current) => current.map((item) => (item.id === id ? { ...item, before_image_url: url } : item)));
      } else {
        const id = kind.replace("item-after-", "");
        setItems((current) => current.map((item) => (item.id === id ? { ...item, after_image_url: url } : item)));
      }
      toast.success("Image uploaded.");
    } catch {
      console.error("Evidence upload failed.");
      toast.error("Could not upload image.");
    } finally {
      setUploading(null);
    }
  };

  const saveItem = async (item: ManagerEvidenceItem, isNew = false) => {
    const safeTitle = sanitizePlainText(item.title, 120);
    const safeDescription = sanitizePlainText(item.description, 4000);
    const safeBeforeImageUrl = sanitizeUrl(item.before_image_url.trim());
    const safeAfterImageUrl = item.after_image_url ? sanitizeUrl(item.after_image_url.trim()) : null;

    if (!safeTitle || !safeDescription || !safeBeforeImageUrl) {
      toast.error("Title, description, and before image are required.");
      return;
    }

    setSaving(item.id);

    let resolvedSortOrder = Number.isFinite(Number(item.sort_order))
      ? Number(item.sort_order)
      : undefined;

    if (isNew && resolvedSortOrder === undefined) {
      const { data: highest } = await supabase
        .from("evidence_gallery")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      resolvedSortOrder = (highest?.sort_order ?? 0) + 1;
    }

    const payload: {
      title: string;
      description: string;
      category: string;
      before_image_url: string;
      after_image_url: string | null;
      defect_id: string | null;
      sort_order?: number;
      is_active: boolean;
      updated_at: string;
      created_by?: string | null;
      status?: "draft" | "pending_approval" | "published";
      submitted_by?: string | null;
    } = {
      title: safeTitle,
      description: safeDescription,
      category: item.category.trim() || "Other",
      before_image_url: safeBeforeImageUrl,
      after_image_url: safeAfterImageUrl,
      defect_id: item.defect_id ?? null,
      is_active: Boolean(item.is_active),
      updated_at: new Date().toISOString(),
    };

    if (resolvedSortOrder !== undefined) {
      payload.sort_order = resolvedSortOrder;
    }

    // Editors publish directly; every other member submits for approval.
    // created_by is what makes the author policies work — older rows were
    // inserted without it, so set it on every new item.
    const submittingForApproval = isNew && !isEditor && !isApprover;
    if (isNew) {
      payload.created_by = userId;
      payload.status = submittingForApproval ? "pending_approval" : "published";
      if (submittingForApproval) payload.submitted_by = userId;
    }

    const request = isNew
      ? supabase.from("evidence_gallery").insert({ ...payload, created_at: new Date().toISOString() }).select("id")
      : supabase.from("evidence_gallery").update(payload).eq("id", item.id);

    const { data: saved, error } = await request;

    if (error) {
      toast.error(isNew ? "Could not add evidence item." : "Could not save evidence item.");
    } else {
      if (submittingForApproval) {
        const newId = (saved as unknown as Array<{ id: string }> | null)?.[0]?.id;
        if (newId) {
          try {
            await fetch("/api/approvals/notify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kind: "evidence", id: newId, mode: "submitted" }),
            });
          } catch (error) {
            console.warn("Approval notification failed.", error);
          }
        }
        if (newId && userId) {
          await logActivityEvent(supabase, {
            eventType: "evidence_submitted",
            entityType: "evidence",
            entityId: newId,
            title: `Submitted evidence for approval: ${safeTitle}`,
            actorId: userId,
            details: {},
            isRelevant: true,
          });
        }
        toast.success("Submitted for approval. An owner or admin will review it before it appears on the public board.");
      } else {
        toast.success(isNew ? "Evidence item added." : "Evidence item saved.");
      }
      const { data } = await supabase
        .from("evidence_gallery")
        .select(MANAGER_SELECT)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      setItems((data ?? []) as ManagerEvidenceItem[]);
      if (isNew) {
        setNewItem(emptyItem);
      }
    }

    setSaving(null);
  };

  const deleteItem = (itemId: string) => {
    const targetItem = items.find((item) => item.id === itemId) ?? null;
    setPendingDeleteItem(targetItem);
  };

  const confirmDeleteItem = async () => {
    if (!pendingDeleteItem) return;

    setSaving(pendingDeleteItem.id);
    const { error } = await supabase.from("evidence_gallery").delete().eq("id", pendingDeleteItem.id);
    if (error) {
      toast.error("Could not delete evidence item.");
    } else {
      toast.success("Evidence item deleted.");
      setItems((current) => current.filter((item) => item.id !== pendingDeleteItem.id));
    }
    setPendingDeleteItem(null);
    setSaving(null);
  };

  const updateItem = (itemId: string, patch: Partial<ManagerEvidenceItem>) => {
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-xl p-8 text-center text-text3">
        <Loader2 size={20} className="mx-auto mb-3 animate-spin" />
        Loading evidence gallery...
      </div>
    );
  }

  if (!role || !isMemberAuthor(role)) {
    return null;
  }

  const categoryOptions = ["Drainage", "Roads", "Walkways", "Structures", "Other"];

   return (
     <div className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-6 animate-in fade-in duration-500 sm:px-6">
       <Breadcrumbs className="mb-8" />
       <div className="flex flex-wrap items-center justify-end gap-4">
        <Link href="/evidence" className="text-sm font-semibold text-accent hover:text-accent2 transition-colors">
          View public gallery
        </Link>
      </div>

      <div className="glass-panel space-y-3 rounded-xl p-6 md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-primary">
          <Edit3 size={14} /> Evidence Gallery Manager
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault">Edit the before-and-after gallery</h1>
        <p className="text-text2 max-w-3xl">
          {isEditor || isApprover
            ? "Admin and documentation officers can update titles, descriptions, categories, images, and ordering. The public gallery will reflect these changes immediately."
            : "Submit before-and-after evidence for the public board. Your item only appears publicly once an owner or admin approves it."}
        </p>
        {isApprover && pendingCount > 0 && (
          <p className="w-fit rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
            {pendingCount} item{pendingCount === 1 ? "" : "s"} awaiting review
          </p>
        )}
      </div>

      <div className="glass-panel space-y-4 rounded-xl p-6 shadow-lg shadow-black/5">
        <h2 className="text-lg font-bold text-textDefault">Add new evidence item</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-text3">Title</span>
            <input
              value={newItem.title}
              onChange={(event) => setNewItem((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
              placeholder="Blocked Drain Grate"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-text3">Category</span>
            <select
              value={newItem.category}
              onChange={(event) => setNewItem((current) => ({ ...current, category: event.target.value }))}
              className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-text3">Related defect (optional)</span>
            <select
              value={newItem.defect_id ?? ""}
              onChange={(event) => setNewItem((current) => ({ ...current, defect_id: event.target.value || null }))}
              className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
            >
              <option value="">None — standalone evidence</option>
              {defectOptions.map((defect) => (
                <option key={defect.id} value={defect.id}>{defect.id} — {defect.title}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-mono uppercase tracking-wider text-text3">Description</span>
            <textarea
              value={newItem.description}
              onChange={(event) => setNewItem((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
              placeholder="Short context for the evidence item"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-text3">Before image URL</span>
            <input
              value={newItem.before_image_url}
              onChange={(event) => setNewItem((current) => ({ ...current, before_image_url: event.target.value }))}
              className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
              placeholder="https://..."
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
                <Upload size={14} /> Upload before
                <input type="file" accept="image/*" className="hidden" onChange={(event) => void onUpload("new-before", event.target.files?.[0])} />
              </label>
              {uploading === "new-before" && <span className="text-xs text-text3">Uploading...</span>}
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-text3">After image URL</span>
            <input
              value={newItem.after_image_url ?? ""}
              onChange={(event) => setNewItem((current) => ({ ...current, after_image_url: event.target.value || null }))}
              className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
              placeholder="Optional"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
                <Upload size={14} /> Upload after
                <input type="file" accept="image/*" className="hidden" onChange={(event) => void onUpload("new-after", event.target.files?.[0])} />
              </label>
              {uploading === "new-after" && <span className="text-xs text-text3">Uploading...</span>}
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-text3">Sort order (optional)</span>
            <input
              type="number"
              value={newItem.sort_order ?? ""}
              onChange={(event) =>
                setNewItem((current) => ({
                  ...current,
                  sort_order: event.target.value === "" ? undefined : Number(event.target.value),
                }))
              }
              className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
              placeholder="Auto (next position)"
            />
          </label>
          <label className="space-y-2 flex items-end">
            <span className="sr-only">Create new item</span>
            <button
              type="button"
              onClick={() => void saveItem(newItem, true)}
              disabled={saving === newItem.id}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <Plus size={16} /> {isEditor || isApprover ? "Add item" : "Submit for approval"}
            </button>
          </label>
        </div>
        {!isEditor && !isApprover && (
          <p className="text-xs text-text3">Submitting sends your item to an owner or admin for approval — it only appears on the public board once they approve it.</p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          No evidence items found.
        </div>
      ) : (
        <div className="space-y-6">
          <EvidenceGalleryGrid items={itemsWithDefects.filter((item) => item.status === "published")} mobileHorizontal compact className="md:overflow-visible" />

          <div className="grid gap-6">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-soft bg-bg2 p-5 space-y-4 shadow-lg shadow-black/5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-text3">{item.category}</span>
                  {item.status === "pending_approval" && (
                    <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">Pending approval</span>
                  )}
                  {item.status === "draft" && (
                    <span className="rounded-full border border-soft bg-bg px-2 py-0.5 text-[10px] font-semibold text-text3">Draft</span>
                  )}
                  {item.status === "published" && (
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Published</span>
                  )}
                </div>
                {item.status === "draft" && item.review_note && item.created_by === userId && (
                  <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-textDefault">
                    <span className="font-semibold">Returned for changes: </span>
                    {item.review_note}
                  </p>
                )}
                {item.status === "pending_approval" && isApprover && (
                  <div className="space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-4">
                    <p className="text-sm font-semibold text-textDefault">Waiting for your approval — publishing shows this on the public board.</p>
                    <form action={approveEvidence}>
                      <input type="hidden" name="evidence_id" value={item.id} />
                      <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-colors">
                        Approve & publish
                      </button>
                    </form>
                    <form action={rejectEvidence} className="space-y-2">
                      <input type="hidden" name="evidence_id" value={item.id} />
                      <textarea
                        name="review_note"
                        required
                        maxLength={500}
                        rows={2}
                        placeholder="Short note for the author (required)"
                        className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:outline-none focus:border-primary"
                      />
                      <button type="submit" className="w-full rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/20 transition-colors">
                        Reject — back to draft
                      </button>
                    </form>
                  </div>
                )}
                {item.status === "pending_approval" && !isApprover && item.created_by === userId && (
                  <p className="text-xs text-text3">Waiting for an owner or admin to review this item.</p>
                )}
                {item.status === "draft" && item.created_by === userId && !isEditor && !isApprover && (
                  <form action={submitEvidenceForApproval}>
                    <input type="hidden" name="evidence_id" value={item.id} />
                    <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-colors">
                      Submit for approval
                    </button>
                  </form>
                )}
                {canEditItem(item) ? (
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                  <div className="space-y-3">
                    <label className="space-y-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-text3">Title</span>
                      <input
                        value={item.title}
                        onChange={(event) => updateItem(item.id, { title: event.target.value })}
                        className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-text3">Description</span>
                      <textarea
                        value={item.description}
                        onChange={(event) => updateItem(item.id, { description: event.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="space-y-2">
                        <span className="text-xs font-mono uppercase tracking-wider text-text3">Category</span>
                        <select
                          value={item.category}
                          onChange={(event) => updateItem(item.id, { category: event.target.value })}
                          className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
                        >
                          {categoryOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs font-mono uppercase tracking-wider text-text3">Sort order</span>
                        <input
                          type="number"
                          value={item.sort_order ?? ""}
                          onChange={(event) =>
                            updateItem(item.id, {
                              sort_order: event.target.value === "" ? undefined : Number(event.target.value),
                            })
                          }
                          className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
                          placeholder="Keep existing"
                        />
                      </label>
                      <label className="flex items-end gap-2 rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault">
                        <input
                          type="checkbox"
                          checked={Boolean(item.is_active)}
                          onChange={(event) => updateItem(item.id, { is_active: event.target.checked })}
                          className="h-4 w-4 accent-primary"
                        />
                        Active in public gallery
                      </label>
                    </div>
                    <label className="space-y-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-text3">Related defect (optional)</span>
                      <select
                        value={item.defect_id ?? ""}
                        onChange={(event) => updateItem(item.id, { defect_id: event.target.value || null })}
                        className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
                      >
                        <option value="">None — standalone evidence</option>
                        {defectOptions.map((defect) => (
                          <option key={defect.id} value={defect.id}>{defect.id} — {defect.title}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="space-y-4">
                    <label className="space-y-2 block">
                      <span className="text-xs font-mono uppercase tracking-wider text-text3">Before image URL</span>
                      <input
                        value={item.before_image_url}
                        onChange={(event) => updateItem(item.id, { before_image_url: event.target.value })}
                        className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
                          <Upload size={14} /> Upload before
                          <input type="file" accept="image/*" className="hidden" onChange={(event) => void onUpload(`item-before-${item.id}`, event.target.files?.[0])} />
                        </label>
                        {uploading === `item-before-${item.id}` && <span className="text-xs text-text3">Uploading...</span>}
                      </div>
                    </label>
                    <label className="space-y-2 block">
                      <span className="text-xs font-mono uppercase tracking-wider text-text3">After image URL</span>
                      <input
                        value={item.after_image_url ?? ""}
                        onChange={(event) => updateItem(item.id, { after_image_url: event.target.value || null })}
                        className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
                          <Upload size={14} /> Upload after
                          <input type="file" accept="image/*" className="hidden" onChange={(event) => void onUpload(`item-after-${item.id}`, event.target.files?.[0])} />
                        </label>
                        {uploading === `item-after-${item.id}` && <span className="text-xs text-text3">Uploading...</span>}
                      </div>
                    </label>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => void saveItem(item)}
                        disabled={saving === item.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        <Check size={16} /> Save changes
                      </button>
                      {canDeleteItem(item) && (
                        <button
                          type="button"
                          onClick={() => void deleteItem(item.id)}
                          disabled={saving === item.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                ) : (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-textDefault">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-text2">{item.description}</p>
                  <p className="text-xs text-text3">
                    {item.status === "published"
                      ? "Published — only documentation officers and approvers can change it."
                      : "Submitted by another member — waiting for an owner or admin to review it."}
                  </p>
                  {canDeleteItem(item) && (
                    <button
                      type="button"
                      onClick={() => void deleteItem(item.id)}
                      disabled={saving === item.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  )}
                </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteItem)}
        title="Delete evidence item?"
        description={`This will permanently remove ${pendingDeleteItem?.title ?? "this item"} from the gallery.`}
        confirmLabel={saving === pendingDeleteItem?.id ? "Deleting..." : "Yes, delete"}
        busy={saving === pendingDeleteItem?.id}
        onClose={() => {
          if (saving === pendingDeleteItem?.id) return;
          setPendingDeleteItem(null);
        }}
        onConfirm={() => {
          void confirmDeleteItem();
        }}
      />
    </div>
  );
}

