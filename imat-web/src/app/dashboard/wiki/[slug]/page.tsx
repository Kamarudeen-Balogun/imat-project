import { createSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BookOpen, User } from "lucide-react";
import { format } from "date-fns";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { canApproveContent, canEditWiki } from "@/lib/access";

export const dynamic = "force-dynamic";

type WikiPage = {
  id: string;
  title: string;
  slug: string;
  category: string;
  updated_at: string;
  status: "draft" | "pending_approval" | "published" | null;
  review_note: string | null;
  author_id: string | null;
  content_tiptap_json: unknown;
  author: { full_name: string } | null;
};

function extractText(node: unknown): string[] {
  if (!node || typeof node !== "object") return [];

  const current = node as { type?: string; content?: unknown[]; text?: string };
  const lines: string[] = [];

  if (typeof current.text === "string" && current.text.trim()) {
    lines.push(current.text.trim());
  }

  if (Array.isArray(current.content)) {
    current.content.forEach((child) => {
      lines.push(...extractText(child));
    });
  }

  return lines;
}

export default async function WikiPageDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canEdit = false;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    // Approvers and wiki editors can edit anything. Authors of their own
    // draft/pending pages get edit access below, once the page is loaded.
    canEdit = canApproveContent(profile?.role) || canEditWiki(profile?.role);
  }

  const { data, error } = await supabase
    .from("wiki_pages")
    .select("id, title, slug, category, updated_at, status, review_note, author_id, content_tiptap_json, author:users!wiki_pages_author_id_fkey(full_name)")
    .eq("slug", slug)
    .single();

  if (error || !data) notFound();

  const page = data as unknown as WikiPage;
  const isPageAuthor = user?.id != null && page.author_id === user.id;
  // Authors may open the editor for their own pages at any status — editing
  // a published page sends it back for approval (see the edit page).
  canEdit = canEdit || isPageAuthor;
  const contentLines = extractText(page.content_tiptap_json);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      <Breadcrumbs className="mb-8" />

      <div className="bg-bg2 border border-soft rounded-xl p-8">
        <div className="inline-flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full border border-primary/20 mb-5 w-fit">
          <BookOpen size={14} /> {page.category}
        </div>
        {page.status === "pending_approval" && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
            Pending approval — not live yet
          </div>
        )}
        {page.status === "draft" && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-soft bg-bg px-3 py-1 text-xs font-semibold text-text3">
            Draft — not live yet
          </div>
        )}
        <h1 className="text-3xl md:text-4xl font-bold text-textDefault mb-4">{page.title}</h1>
        {page.status === "draft" && page.review_note && isPageAuthor && (
          <p className="mb-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-textDefault">
            <span className="font-semibold">Returned for changes: </span>
            {page.review_note}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-sm text-text3 font-mono border-b border-soft pb-4 mb-6">
          <span className="flex items-center gap-2"><User size={14} /> {page.author?.full_name ?? "IMAT"}</span>
          <span>{format(new Date(page.updated_at), "MMMM d, yyyy")}</span>
          {canEdit && (
            <Link href={`/dashboard/wiki/${page.slug}/edit`} className="ml-auto px-3 py-1.5 rounded border border-soft hover:border-primary hover:text-primary transition-colors text-xs font-semibold">
              Edit Page
            </Link>
          )}
        </div>

        <div className="space-y-4 text-text2 leading-relaxed">
          {contentLines.length > 0 ? (
            contentLines.map((line, index) => <p key={index}>{line}</p>)
          ) : (
            <p className="italic text-text3">This page does not yet have content.</p>
          )}
        </div>
      </div>
    </div>
  );
}