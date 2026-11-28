import Link from "next/link";
import { BookOpen, Clock3 } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { canApproveContent, isMemberAuthor } from "@/lib/access";
import { approveWikiPage, rejectWikiPage } from "./actions";

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
  author: { full_name: string } | null;
};

export default async function WikiIndexPage() {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Any member (except applicants, who are not members yet) can write.
  // Wiki editors publish directly; everyone else submits for approval.
  let canWrite = false;
  let isApprover = false;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    canWrite = isMemberAuthor(profile?.role);
    isApprover = canApproveContent(profile?.role);
  }

  // RLS already limits the rows: published pages for everyone, plus own
  // drafts/pending for authors and everything for approvers.
  const { data, error } = await supabase
    .from("wiki_pages")
    .select("id, title, slug, category, updated_at, status, review_note, author_id, author:users!wiki_pages_author_id_fkey(full_name)")
    .order("updated_at", { ascending: false });

  const pages = (data ?? []) as unknown as WikiPage[];
  const pendingCount = pages.filter((page) => page.status === "pending_approval").length;

   return (
     <div className="mx-auto max-w-6xl animate-in fade-in duration-500 px-4 py-6 sm:px-6">
       <Breadcrumbs className="mb-8" />

      <div className="mb-8 flex flex-col gap-3">
        <div className="inline-flex items-center gap-2 text-primary font-mono text-sm uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full border border-primary/20 w-fit">
          <BookOpen size={16} /> Knowledge Base
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault">Operational wiki and internal guides</h1>
        <p className="text-text2 max-w-2xl">Reference notes, procedures, and internal knowledge pages for IMAT members.</p>
        {isApprover && pendingCount > 0 && (
          <p className="w-fit rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
            {pendingCount} page{pendingCount === 1 ? "" : "s"} awaiting review
          </p>
        )}
        {isApprover && (
          <Link href="/dashboard/approvals" className="block w-fit text-sm font-semibold text-primary hover:underline">
            View all approvals →
          </Link>
        )}
        {canWrite && (
          <div>
            <Link href="/dashboard/wiki/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:brightness-110 text-white font-semibold text-sm transition-colors">
              Create Page
            </Link>
          </div>
        )}
      </div>

      {error || pages.length === 0 ? (
        <div className="glass-panel rounded-xl border border-soft border-dashed p-8 text-center">
          <BookOpen size={40} className="mx-auto text-text3 mb-4" />
          <h3 className="text-lg font-bold text-textDefault mb-2">No articles yet</h3>
          <p className="text-text3 text-sm">No articles yet. Ask a documentation officer or an admin to add the first guide.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pages.map((page) => (
            <article key={page.id} className="group glass-panel rounded-xl p-6 transition-colors hover:border-primary shadow-lg shadow-black/5">
              <Link href={`/dashboard/wiki/${page.slug}`} className="block">
                <div className="text-xs font-mono uppercase tracking-wider text-text3 mb-3 flex flex-wrap items-center gap-2">
                  <span>{page.category}</span>
                  {page.status === "pending_approval" && (
                    <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">Pending approval</span>
                  )}
                  {page.status === "draft" && (
                    <span className="rounded-full border border-soft bg-bg px-2 py-0.5 text-[10px] font-semibold text-text3">Draft</span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-textDefault group-hover:text-primary transition-colors mb-3 line-clamp-2">{page.title}</h2>
                <div className="flex items-center justify-between gap-4 text-xs text-text3 font-mono mt-6 pt-4 border-t border-soft">
                  <span className="flex items-center gap-2"><Clock3 size={14} /> {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}</span>
                  <span>{page.author?.full_name ?? "IMAT"}</span>
                </div>
              </Link>
              {page.status === "draft" && page.review_note && page.author_id === user?.id && (
                <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-textDefault">
                  <span className="font-semibold">Returned for changes: </span>
                  {page.review_note}
                </p>
              )}
              {page.status === "pending_approval" && isApprover && (
                <div className="mt-4 space-y-3 border-t border-soft pt-4">
                  <form action={approveWikiPage}>
                    <input type="hidden" name="wiki_page_id" value={page.id} />
                    <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-colors">
                      Approve & publish
                    </button>
                  </form>
                  <form action={rejectWikiPage} className="space-y-2">
                    <input type="hidden" name="wiki_page_id" value={page.id} />
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
              {page.status === "pending_approval" && !isApprover && page.author_id === user?.id && (
                <p className="mt-4 text-xs text-text3">Waiting for an owner or admin to review this page.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
