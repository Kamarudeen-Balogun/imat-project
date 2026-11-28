import Link from "next/link";
import { BookOpen, Clock3 } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export const dynamic = "force-dynamic";

type WikiPage = {
  id: string;
  title: string;
  slug: string;
  category: string;
  updated_at: string;
  author: { full_name: string } | null;
};

export default async function WikiIndexPage() {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canWrite = false;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    canWrite = ["documentation_officer", "president", "admin", "owner"].includes(profile?.role ?? "");
  }

  const { data, error } = await supabase
    .from("wiki_pages")
    .select("id, title, slug, category, updated_at, author:users!wiki_pages_author_id_fkey(full_name)")
    .order("updated_at", { ascending: false });

  const pages = (data ?? []) as unknown as WikiPage[];

   return (
     <div className="mx-auto max-w-6xl animate-in fade-in duration-500 px-4 py-6 sm:px-6">
       <Breadcrumbs className="mb-8" />

      <div className="mb-8 flex flex-col gap-3">
        <div className="inline-flex items-center gap-2 text-primary font-mono text-sm uppercase tracking-wider bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 w-fit">
          <BookOpen size={16} /> Knowledge Base
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault">Operational wiki and internal guides</h1>
        <p className="text-text2 max-w-2xl">Reference notes, procedures, and internal knowledge pages for IMAT members.</p>
        {canWrite && (
          <div>
            <Link href="/dashboard/wiki/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-blue-500 text-white font-semibold text-sm transition-colors">
              Create Page
            </Link>
          </div>
        )}
      </div>

      {error || pages.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-soft border-dashed p-8 text-center">
          <BookOpen size={40} className="mx-auto text-text3 mb-4" />
          <h3 className="text-lg font-bold text-textDefault mb-2">No articles yet</h3>
          <p className="text-text3 text-sm">No articles yet. Ask a documentation officer or an admin to add the first guide.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pages.map((page) => (
            <Link key={page.id} href={`/dashboard/wiki/${page.slug}`} className="group glass-panel rounded-2xl p-6 transition-colors hover:border-primary shadow-lg shadow-black/5">
              <div className="text-xs font-mono uppercase tracking-wider text-text3 mb-3">{page.category}</div>
              <h2 className="text-xl font-bold text-textDefault group-hover:text-primary transition-colors mb-3 line-clamp-2">{page.title}</h2>
              <div className="flex items-center justify-between gap-4 text-xs text-text3 font-mono mt-6 pt-4 border-t border-soft">
                <span className="flex items-center gap-2"><Clock3 size={14} /> {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}</span>
                <span>{page.author?.full_name ?? "IMAT"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
