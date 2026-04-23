import { createSupabaseClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowRight, Megaphone, Calendar } from "lucide-react";
import Image from "next/image";
import NewsroomNotificationSettings from "./NewsroomNotificationSettings";
import NotificationsHistoryPanel from "./NotificationsHistoryPanel";
import { canEditContent } from "@/lib/access";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export const metadata = {
  title: "Newsroom | IMAT FUTA",
  description: "Official announcements, advocacy campaigns, and updates from the Infrastructure Maintenance Awareness Team.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Announcement = {
  id: string;
  slug: string | null;
  title: string;
  body: string;
  visibility: "public" | "members_only";
  published_at: string;
  image_url: string | null;
  author: { full_name: string } | null;
};

export default async function NewsroomPage() {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user?.id) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    role = profile?.role ?? null;
  }
  
   const announcementQuery = supabase
     .from("announcements")
     .select("id, slug, title, body, visibility, published_at, image_url, author:users!announcements_author_id_fkey(full_name)")
     .order("published_at", { ascending: false });

   const { data, error } = user
     ? await announcementQuery.in("visibility", ["public", "members_only"])
     : await announcementQuery.eq("visibility", "public");

   const newsItems = (data ?? []) as unknown as Announcement[];

   return (
     <div className="relative min-h-screen">
       <div className="mx-auto max-w-7xl border-b border-borderDark px-4 py-6 sm:px-6">
         <Breadcrumbs className="mb-4" />
       </div>

      <div className="border-b border-borderDark py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="glass-panel space-y-6 rounded-2xl px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="inline-flex items-center gap-2 text-primary font-mono text-sm uppercase tracking-wider bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 w-fit">
              <Megaphone size={16} /> Official Broadcasts
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {canEditContent(role) && (
                <Link href="/dashboard/news" className="inline-flex items-center gap-2 rounded-full border border-borderDark bg-bg2 px-4 py-2 text-xs sm:text-sm font-semibold text-textDefault hover:border-primary hover:text-primary transition-colors">
                  Manage broadcasts
                </Link>
              )}
              <NewsroomNotificationSettings />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-textDefault max-w-3xl leading-tight">
            Advocacy Campaigns & Campus Updates
          </h1>
          <p className="text-lg text-text2 max-w-2xl leading-relaxed">
            Stay informed on the latest infrastructure developments, official reports, and student advocacy efforts driven by IMAT across the FUTA campus.
          </p>
        </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        {error || newsItems.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-borderDark border-dashed py-20 text-center">
            <Megaphone size={48} className="mx-auto text-borderLit mb-4" />
            <h3 className="text-xl font-bold text-textDefault mb-2">No active broadcasts</h3>
            <p className="text-text3 text-sm max-w-sm mx-auto">Check back later for official announcements and structural health campaign updates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {newsItems.map((item) => {
              const authorName = item.author?.full_name ?? "IMAT Official";
              return (
                <Link
                  key={item.id}
                  href={`/newsroom/${item.slug ?? item.id}`}
                  className="group glass-panel flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:border-primary hover:shadow-primary/5"
                >
                  <div className="relative aspect-[16/9] bg-bg3 overflow-hidden">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg2 to-bg3 text-text3">
                        <Megaphone size={28} />
                      </div>
                    )}
                  </div>
                  <div className="flex h-full flex-col bg-gradient-to-br from-bg2 to-bg p-8">
                    <div className="flex items-center gap-2 text-text3 font-mono text-[10px] uppercase tracking-widest mb-4">
                      <Calendar size={14} />
                      {format(new Date(item.published_at), "MMM d, yyyy")}
                    </div>

                    <h3 className="text-xl font-bold text-textDefault mb-4 group-hover:text-primary transition-colors line-clamp-3">
                      {item.title}
                    </h3>

                    {item.visibility === "members_only" && (
                      <div className="mb-4 inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-warning w-fit">
                        Members Only
                      </div>
                    )}

                    <p className="text-sm text-text2 line-clamp-3 mb-8 flex-grow">
                      {item.body}
                    </p>

                    <div className="pt-6 border-t border-borderDark mt-auto flex items-center justify-between">
                      <div className="text-xs text-text3 font-medium">By {authorName}</div>
                      <div className="text-primary flex items-center gap-1 text-sm font-bold opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        Read <ArrowRight size={16} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Notifications History Panel */}
      <NotificationsHistoryPanel />
    </div>
  );
}
