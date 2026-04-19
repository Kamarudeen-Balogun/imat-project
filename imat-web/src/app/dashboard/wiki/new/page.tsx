"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, PlusCircle } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { logActivityEvent } from "@/lib/activity/logEvent";
import { toast } from "react-hot-toast";

const ALLOWED_ROLES = ["documentation_officer", "president", "admin"];
const CATEGORIES = ["SOPs", "Assessment Guides", "Past Reports", "Decisions", "Operations"];

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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

export default function NewWikiPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
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

      if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
        toast.error("You are not allowed to create knowledge base entries.");
        router.replace("/dashboard/wiki");
        return;
      }

      setLoading(false);
    };

    setup();
  }, [router, supabase]);

  const slugPreview = useMemo(() => toSlug(slug || title), [slug, title]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!title.trim() || !slugPreview) {
      toast.error("Title and slug are required.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("wiki_pages")
      .insert({
        title: title.trim(),
        slug: slugPreview,
        category,
        author_id: userId,
        last_edited_by: userId,
        content_tiptap_json: textToTiptap(content),
      })
      .select("id, slug")
      .single();

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Slug already exists. Choose another one." : "Failed to create page.");
      setSaving(false);
      return;
    }

    await logActivityEvent(supabase, {
      eventType: "wiki_created",
      entityType: "wiki_page",
      entityId: data?.id,
      title: `Created wiki page: ${title.trim()}`,
      actorId: userId,
      details: { slug: data?.slug, category },
      isRelevant: true,
    });

    toast.success("Knowledge page created.");
    router.push(`/dashboard/wiki/${data.slug}`);
  };

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-16">
      <Link href="/dashboard/wiki" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-8">
        <ArrowLeft size={16} /> Back to Knowledge Base
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">Create Knowledge Page</h1>
        <p className="text-text2">Document decisions, procedures, and implementation notes for team continuity.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-borderDark bg-bg2 p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-borderDark bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary"
              placeholder="e.g. Newsroom publishing runbook"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-borderDark bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary">
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Slug (optional)</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full rounded-lg border border-borderDark bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary"
            placeholder="auto-generated-from-title"
          />
          <p className="mt-2 text-xs text-text3">Final slug: {slugPreview || "-"}</p>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[320px] rounded-lg border border-borderDark bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary"
            placeholder="Write the context, decisions, and implementation notes here..."
          />
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Link href="/dashboard/wiki" className="px-5 py-3 rounded-lg border border-borderDark text-text3 hover:text-textDefault hover:border-text3 text-center">Cancel</Link>
          <button type="submit" disabled={saving} className="px-5 py-3 rounded-lg bg-primary hover:bg-blue-500 text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-70">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />} Save Page
          </button>
        </div>
      </form>
    </div>
  );
}
