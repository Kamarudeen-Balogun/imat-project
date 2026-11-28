"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { canEditContent } from "@/lib/access";
import {
  ANNOUNCEMENT_CARD_SELECT,
  ANNOUNCEMENT_CARD_SELECT_WITH_PIN,
  isMissingPinnedColumn,
  normalizeAnnouncementAuthor,
} from "@/lib/announcements";
import optimizeCloudinaryUrl from "@/lib/cloudinary";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Megaphone, Play } from "lucide-react";
import NewsroomNotificationSettings from "./NewsroomNotificationSettings";
import NotificationsHistoryPanel from "./NotificationsHistoryPanel";
import { markdownToPlainText } from "@/lib/markdown";

type Announcement = {
  id: string;
  slug: string | null;
  title: string;
  body: string;
  visibility: "public" | "members_only";
  published_at: string;
  image_url: string | null;
  is_pinned?: boolean | null;
  topic: string | null;
  excerpt: string | null;
  status: "draft" | "published" | null;
  video_url: string | null;
  author: { full_name: string | null } | null;
};

type RawAnnouncement = Omit<Announcement, "author"> & {
  author: { full_name: string | null } | { full_name: string | null }[] | null;
};

function normalizeAnnouncements(items: RawAnnouncement[]): Announcement[] {
  return items.map(normalizeAnnouncementAuthor);
}

export default function NewsroomClient() {
  const [newsItems, setNewsItems] = useState<Announcement[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadNewsroom = async () => {
      setLoading(true);
      setLoadError(null);

      const supabase = createSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user.id) {
        const { data: profile } = await supabase.from("users").select("role").eq("id", session.user.id).maybeSingle();
        if (!cancelled) {
          setRole(profile?.role ?? null);
        }
      }

      const announcementQuery = supabase
        .from("announcements")
        .select(ANNOUNCEMENT_CARD_SELECT_WITH_PIN)
        .eq("status", "published")
        .order("is_pinned", { ascending: false })
        .order("published_at", { ascending: false });

      const pinnedResult = session
        ? await announcementQuery.in("visibility", ["public", "members_only"])
        : await announcementQuery.eq("visibility", "public");
      let data: unknown[] | null = pinnedResult.data;
      let error = pinnedResult.error;

      if (isMissingPinnedColumn(error)) {
        const fallbackQuery = supabase
          .from("announcements")
          .select(ANNOUNCEMENT_CARD_SELECT)
          .eq("status", "published")
          .order("published_at", { ascending: false });

        const fallback = session
          ? await fallbackQuery.in("visibility", ["public", "members_only"])
          : await fallbackQuery.eq("visibility", "public");

        data = fallback.data as unknown[] | null;
        error = fallback.error;
      }

      if (cancelled) return;

      if (error) {
        setLoadError(error.message);
        setNewsItems([]);
      } else {
        setNewsItems(normalizeAnnouncements((data ?? []) as unknown as RawAnnouncement[]));
      }

      setLoading(false);
    };

    void loadNewsroom();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      <div className="mx-auto max-w-7xl border-b border-borderDark px-4 py-6 sm:px-6">
        <Breadcrumbs className="mb-4" />
      </div>

      <div className="border-b border-borderDark py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="glass-panel space-y-6 rounded-xl px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-sm uppercase tracking-wider text-primary">
                <Megaphone size={16} /> Official Broadcasts
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {canEditContent(role) && (
                  <Link href="/dashboard/news" className="inline-flex items-center gap-2 rounded-full border border-borderDark bg-bg2 px-4 py-2 text-xs font-semibold text-textDefault transition-colors hover:border-primary hover:text-primary sm:text-sm">
                    Manage broadcasts
                  </Link>
                )}
                <NewsroomNotificationSettings />
              </div>
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-textDefault md:text-5xl">
              Advocacy Campaigns & Campus Updates
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-text2">
              Stay informed on the latest infrastructure developments, official reports, and student advocacy efforts driven by IMAT across the FUTA campus.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[28rem] animate-pulse rounded-xl border border-borderDark bg-bg2" />
            ))}
          </div>
        ) : loadError ? (
          <div className="glass-panel rounded-xl border border-borderDark border-dashed py-12 text-center">
            <Megaphone size={40} className="mx-auto mb-4 text-borderLit" />
            <h3 className="mb-2 text-xl font-bold text-textDefault">Unable to load broadcasts</h3>
            <p className="mx-auto max-w-sm text-sm text-text3">{loadError}</p>
          </div>
        ) : newsItems.length === 0 ? (
          <div className="glass-panel rounded-xl border border-borderDark border-dashed py-12 text-center">
            <Megaphone size={40} className="mx-auto mb-4 text-borderLit" />
            <h3 className="mb-2 text-xl font-bold text-textDefault">No active broadcasts</h3>
            <p className="mx-auto max-w-sm text-sm text-text3">Check back later for official announcements and structural health campaign updates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {newsItems.map((item) => {
              const authorName = item.author?.full_name ?? "IMAT Official";
              return (
                <Link
                  key={item.id}
                  href={`/newsroom/${item.slug ?? item.id}`}
                  className="group glass-panel flex flex-col overflow-hidden rounded-xl transition-all duration-300 hover:border-primary hover:shadow-primary/5"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-bg3">
                    {item.image_url ? (
                      <Image
                        src={item.image_url.includes("res.cloudinary.com") ? optimizeCloudinaryUrl(item.image_url) : item.image_url}
                        alt={item.title}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-bg3 text-text3">
                        <Megaphone size={28} />
                      </div>
                    )}
                  </div>
                  <div className="flex h-full flex-col bg-bg2 p-8">
                    <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-text3">
                      <Calendar size={14} />
                      {format(new Date(item.published_at), "MMM d, yyyy")}
                    </div>

                    <h3 className="mb-4 line-clamp-3 text-xl font-bold text-textDefault transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>

                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      {item.topic && (
                        <div className="inline-flex w-fit items-center rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
                          {item.topic}
                        </div>
                      )}
                      {item.video_url && (
                        <div className="inline-flex w-fit items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                          <Play size={12} /> Video
                        </div>
                      )}
                    </div>

                    {item.visibility === "members_only" && (
                      <div className="mb-4 inline-flex w-fit items-center rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-warning">
                        Members Only
                      </div>
                    )}

                    {item.is_pinned && (
                      <div className="mb-4 inline-flex w-fit items-center rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
                        Pinned
                      </div>
                    )}

                    <p className="mb-8 line-clamp-3 flex-grow text-sm text-text2">
                      {item.excerpt?.trim() || markdownToPlainText(item.body).slice(0, 180) || item.title}
                    </p>

                    <div className="mt-auto flex items-center justify-between border-t border-borderDark pt-6">
                      <div className="text-xs font-medium text-text3">By {authorName}</div>
                      <div className="-translate-x-4 flex items-center gap-1 text-sm font-bold text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
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

      <NotificationsHistoryPanel />
    </div>
  );
}
