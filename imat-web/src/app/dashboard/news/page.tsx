import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, Edit3, Megaphone, Plus } from "lucide-react";
import { format } from "date-fns";
import { createSupabaseClient } from "@/lib/supabase/server";
import { canEditContent } from "@/lib/access";

export const dynamic = "force-dynamic";

type AnnouncementRow = {
  id: string;
  slug: string | null;
  title: string;
  visibility: "public" | "members_only";
  published_at: string;
  updated_at: string;
  author: { full_name: string | null } | null;
  updater: { full_name: string | null } | null;
};

export default async function DashboardNewsPage() {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canEditContent(profile?.role)) {
    redirect("/dashboard");
  }

  const { data } = await supabase
    .from("announcements")
    .select("id, slug, title, visibility, published_at, updated_at, author:users!announcements_author_id_fkey(full_name), updater:users!announcements_updated_by_fkey(full_name)")
    .order("published_at", { ascending: false });

  const announcements = (data ?? []) as unknown as AnnouncementRow[];

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <Link href="/dashboard/campaigns/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
          <Plus size={16} /> New Broadcast
        </Link>
      </div>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-primary mb-4">
          <Megaphone size={14} /> Newsroom Manager
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">Manage published broadcasts</h1>
        <p className="text-text2 max-w-2xl">Edit, update, or delete announcements. Updates preserve the original public link while refreshing timestamps and notifications.</p>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-2xl border border-borderDark border-dashed bg-bg2 p-12 text-center text-text3">
          No announcements found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {announcements.map((item) => (
            <article key={item.id} className="rounded-2xl border border-borderDark bg-bg2 p-6 shadow-lg shadow-black/5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-borderDark bg-bg px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-text3 mb-3">
                    {item.visibility === "public" ? "Public" : "Members Only"}
                  </div>
                  <h2 className="text-xl font-bold text-textDefault">{item.title}</h2>
                </div>
                <span className="rounded-full bg-bg px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-text3 border border-borderDark">
                  {item.slug ?? item.id.slice(0, 8)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text3 border-t border-borderDark pt-4 mt-4">
                <span className="inline-flex items-center gap-2"><Calendar size={14} /> Published {format(new Date(item.published_at), "MMM d, yyyy")}</span>
                <span>Updated {format(new Date(item.updated_at), "MMM d, yyyy")}</span>
              </div>

              <div className="mt-3 text-sm text-text2">
                By {item.author?.full_name ?? "IMAT Official"}
              </div>

              <div className="mt-3 text-xs text-text3">
                Last edited by {item.updater?.full_name ?? item.author?.full_name ?? "IMAT Official"}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/dashboard/news/${item.slug ?? item.id}`} className="inline-flex items-center gap-2 rounded-lg border border-borderDark px-4 py-2 text-sm font-semibold text-textDefault hover:border-primary hover:text-primary transition-colors">
                  <Edit3 size={16} /> Edit
                </Link>
                <Link href={`/newsroom/${item.slug ?? item.id}`} className="inline-flex items-center gap-2 rounded-lg border border-borderDark px-4 py-2 text-sm font-semibold text-text3 hover:border-text3 hover:text-textDefault transition-colors">
                  View public page <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}