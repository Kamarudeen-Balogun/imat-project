import { createSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, User } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

type WikiPage = {
  id: string;
  title: string;
  slug: string;
  category: string;
  updated_at: string;
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

    canEdit = ["documentation_officer", "president", "admin"].includes(profile?.role ?? "");
  }

  const { data, error } = await supabase
    .from("wiki_pages")
    .select("id, title, slug, category, updated_at, content_tiptap_json, author:users!wiki_pages_author_id_fkey(full_name)")
    .eq("slug", slug)
    .single();

  if (error || !data) notFound();

  const page = data as unknown as WikiPage;
  const contentLines = extractText(page.content_tiptap_json);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      <Link href="/dashboard/wiki" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-8">
        <ArrowLeft size={16} /> Back to Knowledge Base
      </Link>

      <div className="bg-bg2 border border-borderDark rounded-2xl p-8">
        <div className="inline-flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-5 w-fit">
          <BookOpen size={14} /> {page.category}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-textDefault mb-4">{page.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-text3 font-mono border-b border-borderDark pb-4 mb-6">
          <span className="flex items-center gap-2"><User size={14} /> {page.author?.full_name ?? "IMAT"}</span>
          <span>{format(new Date(page.updated_at), "MMMM d, yyyy")}</span>
          {canEdit && (
            <Link href={`/dashboard/wiki/${page.slug}/edit`} className="ml-auto px-3 py-1.5 rounded border border-borderDark hover:border-primary hover:text-primary transition-colors text-xs font-semibold">
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