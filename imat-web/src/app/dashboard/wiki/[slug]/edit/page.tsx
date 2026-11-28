"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save, Trash2 } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { logActivityEvent } from "@/lib/activity/logEvent";
import { toast } from "react-hot-toast";
import { canApproveContent, canEditWiki, canDeleteWiki } from "@/lib/access";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { sanitizePlainText } from "@/lib/inputSanitizer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { approveWikiPage, rejectWikiPage, submitWikiPageForApproval } from "../../actions";

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";

  const current = node as { content?: unknown[]; text?: string };
  const textParts: string[] = [];

  if (typeof current.text === "string" && current.text.trim()) {
    textParts.push(current.text.trim());
  }

  if (Array.isArray(current.content)) {
    current.content.forEach((child) => {
      const childText = extractText(child);
      if (childText) textParts.push(childText);
    });
  }

  return textParts.join("\n");
}

function textToTiptap(text: string) {
  const paragraphs = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ type: "paragraph", content: [{ type: "text", text: line }] }));

  return {
    type: "doc",
    content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph" }],
  };
}

export default function EditWikiPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);
  const [pageStatus, setPageStatus] = useState<"draft" | "pending_approval" | "published" | null>(null);
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [isPageAuthor, setIsPageAuthor] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Operations");
  const [content, setContent] = useState("");

  useEffect(() => {
    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        router.replace("/login");
        return;
      }

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!profile) {
        toast.error("You are not allowed to edit knowledge pages.");
        router.replace("/dashboard/wiki");
        return;
      }

      setRole(profile.role);

      const { data, error } = await supabase
        .from("wiki_pages")
        .select("id, title, slug, category, content_tiptap_json, status, review_note, author_id")
        .eq("slug", params.slug)
        .single();

      if (error || !data) {
        toast.error("Knowledge page not found.");
        router.replace("/dashboard/wiki");
        return;
      }

      // Approvers and wiki editors can edit anything. Other members can edit
      // their own pages — editing a published page sends it back for approval.
      const isAuthor = (data as { author_id?: string | null }).author_id === session.user.id;
      if (!canApproveContent(profile.role) && !canEditWiki(profile.role) && !isAuthor) {
        toast.error("You are not allowed to edit this knowledge page.");
        router.replace("/dashboard/wiki");
        return;
      }

      setIsPageAuthor(isAuthor);
      setPageStatus((data as { status?: "draft" | "pending_approval" | "published" | null }).status ?? null);
      setReviewNote((data as { review_note?: string | null }).review_note ?? null);
      setPageId(data.id);
      setTitle(data.title);
      setSlug(data.slug);
      setCategory(data.category);
      setContent(extractText(data.content_tiptap_json));
      setLoading(false);
    };

    setup();
  }, [params.slug, router, supabase]);

  const slugPreview = useMemo(() => toSlug(slug || title), [slug, title]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !pageId) return;

    const safeTitle = sanitizePlainText(title, 160);
    const safeSlug = sanitizePlainText(slugPreview, 160);
    const safeCategory = sanitizePlainText(category, 80);
    const safeContent = sanitizePlainText(content, 20000);

    setSaving(true);

    // A non-approver, non-editor author editing a published page sends it
    // back for approval — the page leaves the index until an owner/admin
    // approves the new version. Approvers and wiki editors keep the status.
    const isApprover = canApproveContent(role);
    const isEditor = canEditWiki(role);
    const flipsToPending = isPageAuthor && !isApprover && !isEditor && pageStatus === "published";

    const { error } = await supabase
      .from("wiki_pages")
      .update({
        title: safeTitle,
        slug: safeSlug,
        category: safeCategory,
        last_edited_by: userId,
        content_tiptap_json: textToTiptap(safeContent),
        ...(flipsToPending ? { status: "pending_approval", submitted_by: userId, review_note: null } : {}),
      })
      .eq("id", pageId);

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Slug already exists. Choose another one." : "Failed to save changes.");
      setSaving(false);
      return;
    }

    if (flipsToPending) {
      try {
        await fetch("/api/approvals/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "wiki", id: pageId, mode: "submitted" }),
        });
      } catch (error) {
        console.warn("Approval notification failed.", error);
      }
    }

    await logActivityEvent(supabase, {
      eventType: flipsToPending ? "wiki_submitted" : "wiki_updated",
      entityType: "wiki_page",
      entityId: pageId,
      title: flipsToPending ? `Submitted wiki edit for approval: ${safeTitle}` : `Updated wiki page: ${safeTitle}`,
      actorId: userId,
      details: {
        slug: safeSlug,
        category: safeCategory,
      },
      isRelevant: true,
    });

    toast.success(flipsToPending ? "Saved and submitted for approval — the page is hidden until an owner or admin approves it." : "Knowledge page updated.");
    router.push(`/dashboard/wiki/${slugPreview}`);
  };

  const handleDelete = async () => {
    if (!pageId || !userId || !canDeleteWiki(role)) {
      toast.error("You are not allowed to delete knowledge pages.");
      return;
    }

    setDeleting(true);

    const { error } = await supabase.from("wiki_pages").delete().eq("id", pageId);

    if (error) {
      toast.error("Failed to delete knowledge page.");
      setDeleting(false);
      return;
    }

    await logActivityEvent(supabase, {
      eventType: "wiki_deleted",
      entityType: "wiki_page",
      entityId: pageId,
      title: `Deleted wiki page: ${title.trim()}`,
      actorId: userId,
      details: {
        slug: slugPreview,
        category,
      },
      isRelevant: true,
    });

    toast.success("Knowledge page deleted.");
    setShowDeleteConfirm(false);
    router.push("/dashboard/wiki");
    router.refresh();
  };

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-16">
      <Breadcrumbs className="mb-8" />

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">Edit Knowledge Page</h1>
        <p className="text-text2">Update runbooks, decisions, and implementation notes.</p>
        {pageStatus === "pending_approval" && !canApproveContent(role) && (
          <p className="mt-4 rounded-xl border border-soft bg-bg px-4 py-3 text-sm text-text2">
            Waiting for an owner or admin to review this page. Your edits here stay in the queue — they will not publish on save.
          </p>
        )}
        {pageStatus === "draft" && reviewNote && isPageAuthor && (
          <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-textDefault">
            <span className="font-semibold">Returned for changes: </span>
            {reviewNote}
          </p>
        )}
        {pageStatus === "published" && isPageAuthor && !canApproveContent(role) && !canEditWiki(role) && (
          <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-textDefault">
            Saving changes to this published page will send it back for approval — it leaves the index until an owner or admin approves the new version.
          </p>
        )}
      </div>

      {pageStatus === "pending_approval" && canApproveContent(role) && pageId && (
        <div className="mb-6 space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-5">
          <p className="text-sm font-semibold text-textDefault">Waiting for your approval.</p>
          <form action={approveWikiPage}>
            <input type="hidden" name="wiki_page_id" value={pageId} />
            <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-colors">
              Approve & publish
            </button>
          </form>
          <form action={rejectWikiPage} className="space-y-2">
            <input type="hidden" name="wiki_page_id" value={pageId} />
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

      <form onSubmit={handleSave} className="space-y-6 rounded-xl border border-soft bg-bg2 p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-soft bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" required />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-soft bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" required />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-lg border border-soft bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" />
          <p className="mt-2 text-xs text-text3">Final slug: {slugPreview || "-"}</p>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Content</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full min-h-[320px] rounded-lg border border-soft bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" />
        </div>

        <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            {canDeleteWiki(role) && (
              <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={saving || deleting} className="inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-5 py-3 text-danger font-semibold hover:bg-danger/20 transition-colors disabled:opacity-70">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete Page
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Link href={`/dashboard/wiki/${params.slug}`} className="px-5 py-3 rounded-lg border border-soft text-text3 hover:text-textDefault hover:border-text3 text-center">Cancel</Link>
            {pageStatus === "draft" && isPageAuthor && !canApproveContent(role) && !canEditWiki(role) && pageId && (
              <form action={submitWikiPageForApproval}>
                <input type="hidden" name="wiki_page_id" value={pageId} />
                <button type="submit" disabled={saving || deleting} className="w-full px-5 py-3 rounded-lg bg-accent text-white font-semibold hover:brightness-110 transition-colors disabled:opacity-70">
                  Submit for approval
                </button>
              </form>
            )}
            <button type="submit" disabled={saving || deleting} className="px-5 py-3 rounded-lg bg-primary hover:brightness-110 text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-70">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
            </button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete knowledge page?"
        description={`This will permanently remove ${title.trim() || "this page"} from the website and database.`}
        confirmLabel={deleting ? "Deleting..." : "Yes, delete"}
        busy={deleting}
        onClose={() => {
          if (deleting) return;
          setShowDeleteConfirm(false);
        }}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </div>
  );
}
