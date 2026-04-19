"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { logActivityEvent } from "@/lib/activity/logEvent";
import { toast } from "react-hot-toast";
import { canEditWiki, canDeleteWiki } from "@/lib/access";

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
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);

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

      if (!profile || !canEditWiki(profile.role)) {
        toast.error("You are not allowed to edit knowledge pages.");
        router.replace("/dashboard/wiki");
        return;
      }

      setRole(profile.role);

      const { data, error } = await supabase
        .from("wiki_pages")
        .select("id, title, slug, category, content_tiptap_json")
        .eq("slug", params.slug)
        .single();

      if (error || !data) {
        toast.error("Knowledge page not found.");
        router.replace("/dashboard/wiki");
        return;
      }

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

    setSaving(true);

    const { error } = await supabase
      .from("wiki_pages")
      .update({
        title: title.trim(),
        slug: slugPreview,
        category,
        last_edited_by: userId,
        content_tiptap_json: textToTiptap(content),
      })
      .eq("id", pageId);

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Slug already exists. Choose another one." : "Failed to save changes.");
      setSaving(false);
      return;
    }

    await logActivityEvent(supabase, {
      eventType: "wiki_updated",
      entityType: "wiki_page",
      entityId: pageId,
      title: `Updated wiki page: ${title.trim()}`,
      actorId: userId,
      details: {
        slug: slugPreview,
        category,
      },
      isRelevant: true,
    });

    toast.success("Knowledge page updated.");
    router.push(`/dashboard/wiki/${slugPreview}`);
  };

  const handleDelete = async () => {
    if (!pageId || !userId || !canDeleteWiki(role)) {
      toast.error("You are not allowed to delete knowledge pages.");
      return;
    }

    const confirmed = window.confirm("Delete this knowledge page? This will remove it from the website and database.");
    if (!confirmed) return;

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
    router.push("/dashboard/wiki");
    router.refresh();
  };

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-16">
      <Link href={`/dashboard/wiki/${params.slug}`} className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-8">
        <ArrowLeft size={16} /> Back to Page
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">Edit Knowledge Page</h1>
        <p className="text-text2">Update runbooks, decisions, and implementation notes.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-borderDark bg-bg2 p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-borderDark bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" required />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-borderDark bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" required />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-lg border border-borderDark bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" />
          <p className="mt-2 text-xs text-text3">Final slug: {slugPreview || "-"}</p>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Content</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full min-h-[320px] rounded-lg border border-borderDark bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" />
        </div>

        <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            {canDeleteWiki(role) && (
              <button type="button" onClick={handleDelete} disabled={saving || deleting} className="inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-5 py-3 text-danger font-semibold hover:bg-danger/20 transition-colors disabled:opacity-70">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete Page
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Link href={`/dashboard/wiki/${params.slug}`} className="px-5 py-3 rounded-lg border border-borderDark text-text3 hover:text-textDefault hover:border-text3 text-center">Cancel</Link>
            <button type="submit" disabled={saving || deleting} className="px-5 py-3 rounded-lg bg-primary hover:bg-blue-500 text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-70">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
