import { createSupabaseClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Calendar, User } from "lucide-react";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getAnnouncementHref } from "@/lib/news";
import { canEditContent, canDeleteContent } from "@/lib/access";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type Announcement = {
  id: string;
  slug: string | null;
  title: string;
  body: string;
  visibility: "public" | "members_only";
  published_at: string;
  updated_at: string;
  updated_by: string | null;
  image_url: string | null;
  author: { full_name: string } | null;
  updater: { full_name: string | null } | null;
};

async function loadAnnouncement(supabase: Awaited<ReturnType<typeof createSupabaseClient>>, idOrSlug: string) {
  const bySlug = await supabase
    .from("announcements")
    .select("id, slug, title, body, visibility, published_at, updated_at, updated_by, image_url, author:users!announcements_author_id_fkey(full_name), updater:users!announcements_updated_by_fkey(full_name)")
    .eq("slug", idOrSlug)
    .maybeSingle();

  if (bySlug.data) {
    return bySlug.data as unknown as Announcement;
  }

  const byId = await supabase
    .from("announcements")
    .select("id, slug, title, body, visibility, published_at, updated_at, updated_by, image_url, author:users!announcements_author_id_fkey(full_name), updater:users!announcements_updated_by_fkey(full_name)")
    .eq("id", idOrSlug)
    .maybeSingle();

  return (byId.data ?? null) as Announcement | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseClient();
  const data = await loadAnnouncement(supabase, id);

  if (!data) return { title: "Not Found | IMAT FUTA" };

  return {
    title: `${data.title} | IMAT FUTA Newsroom`,
    description: data.body.substring(0, 160) + "...",
  };
}

export default async function NewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user?.id) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    role = profile?.role ?? null;
  }

  const data = await loadAnnouncement(supabase, id);

  if (!data) notFound();

  if (data.visibility !== "public" && !user) {
    notFound();
  }

  const post = data as unknown as Announcement;
  const authorName = post.author?.full_name ?? "IMAT Official";
  const canonicalHref = getAnnouncementHref(post.slug ?? post.id);
  const hasBeenUpdated = new Date(post.updated_at).getTime() > new Date(post.published_at).getTime();
  const canManage = canEditContent(role);
  const canRemove = canDeleteContent(role);

  // If a user lands on the UUID path but a slug exists, normalize to the readable URL.
  if (post.slug && id !== post.slug) {
    redirect(canonicalHref);
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <div className="bg-bg2 border-b border-borderDark pt-10 pb-20">
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
          <Link
            href="/newsroom"
            className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-12"
          >
            <ArrowLeft size={16} /> Back to Newsroom
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-primary mb-4">
            {post.visibility === "public" ? "Public Broadcast" : "Members Only"}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-textDefault leading-tight mb-8">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm font-mono text-text3 border-t border-b border-borderDark py-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              {format(new Date(post.published_at), "MMMM d, yyyy")}
            </div>
            <div className="flex items-center gap-2">
              <User size={16} />
              {authorName}
            </div>
            {hasBeenUpdated && (
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                Updated {format(new Date(post.updated_at), "MMMM d, yyyy")}
              </div>
            )}
          </div>

          {hasBeenUpdated && role && (
            <div className="mt-4 rounded-xl border border-borderDark bg-bg px-4 py-3 text-sm text-text3">
              <span className="font-semibold text-textDefault">Updated by:</span> {post.updater?.full_name ?? "IMAT Official"} on {format(new Date(post.updated_at), "MMMM d, yyyy")}
            </div>
          )}

          {canManage && (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={`/dashboard/news/${post.slug ?? post.id}`} className="inline-flex items-center gap-2 rounded-lg border border-borderDark px-4 py-2 text-sm font-semibold text-textDefault hover:border-primary hover:text-primary transition-colors">
                Edit broadcast
              </Link>
              {canRemove && (
                <Link href={`/dashboard/news/${post.slug ?? post.id}`} className="inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/20 transition-colors">
                  Open manager
                </Link>
              )}
            </div>
          )}

          {post.image_url && (
            <div className="mt-10 overflow-hidden rounded-2xl border border-borderDark bg-bg">
              <Image
                src={post.image_url}
                alt={post.title}
                width={1400}
                height={788}
                sizes="(max-width: 768px) 100vw, 960px"
                quality={80}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          )}

          <div className="mt-6 flex items-center gap-3 text-xs font-mono text-text3">
            <span className="rounded-full border border-borderDark bg-bg px-3 py-1">{canonicalHref}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-16 space-y-6">
        {post.body.split("\n").map((paragraph, idx) =>
          paragraph.trim() ? (
            <p key={idx} className="text-text2 leading-relaxed text-lg">
              {paragraph}
            </p>
          ) : (
            <br key={idx} />
          )
        )}
      </div>
    </div>
  );
}
