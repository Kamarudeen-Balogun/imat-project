import { createSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Calendar, Play, User } from "lucide-react";
import Image from "next/image";
import optimizeCloudinaryUrl from "@/lib/cloudinary";
import { notFound, redirect } from "next/navigation";
import { extractAnnouncementSuffix, getAnnouncementHref, toCompactAnnouncementSlug } from "@/lib/news";
import { markdownToPlainText } from "@/lib/markdown";
import { parseVideoUrl } from "@/lib/video";
import ArticleBody from "@/components/news/ArticleBody";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type Announcement = {
  id: string;
  slug: string | null;
  author_id: string | null;
  title: string;
  body: string;
  visibility: "public" | "members_only";
  published_at: string;
  updated_at: string;
  image_url: string | null;
  topic: string | null;
  excerpt: string | null;
  status: "draft" | "published" | null;
  video_url: string | null;
};

function normalizeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function createNewsroomAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadAnnouncement(supabase: Awaited<ReturnType<typeof createSupabaseClient>>, idOrSlug: string) {
  const normalizedIncoming = idOrSlug.toLowerCase();
  const selectColumns = "id, slug, author_id, title, body, visibility, published_at, updated_at, image_url, topic, excerpt, status, video_url";

  const bySlug = await supabase
    .from("announcements")
    .select(selectColumns)
    .eq("slug", normalizedIncoming)
    .limit(1);

  if (bySlug.data && bySlug.data.length > 0) {
    return bySlug.data[0] as unknown as Announcement;
  }

  // Legacy safety net for older manually edited slugs with case differences.
  const bySlugCaseInsensitive = await supabase
    .from("announcements")
    .select(selectColumns)
    .ilike("slug", idOrSlug)
    .limit(1);

  if (bySlugCaseInsensitive.data && bySlugCaseInsensitive.data.length > 0) {
    return bySlugCaseInsensitive.data[0] as unknown as Announcement;
  }

  const byId = await supabase
    .from("announcements")
    .select(selectColumns)
    .eq("id", idOrSlug)
    .limit(1);

  if (byId.data && byId.data.length > 0) {
    return byId.data[0] as unknown as Announcement;
  }

  const suffix = extractAnnouncementSuffix(normalizedIncoming);
  if (suffix) {
    const bySuffix = await supabase
      .from("announcements")
      .select(selectColumns)
      .ilike("slug", `%-${suffix}`)
      .order("published_at", { ascending: false })
      .limit(1);

    if (bySuffix.data && bySuffix.data.length > 0) {
      return bySuffix.data[0] as unknown as Announcement;
    }
  }

  // Final fallback: support legacy links whose slug formatting differs (e.g., missing hyphens).
  const recent = await supabase
    .from("announcements")
    .select(selectColumns)
    .not("slug", "is", null)
    .order("published_at", { ascending: false })
    .limit(150);

  if (recent.data && recent.data.length > 0) {
    const requested = normalizeSlug(idOrSlug);
    const matched = recent.data.find((row) => {
      if (!row.slug) return false;
      return normalizeSlug(String(row.slug)) === requested;
    });

    if (matched) {
      return matched as unknown as Announcement;
    }
  }

  const publicScan = await supabase
    .from("announcements")
    .select(selectColumns)
    .eq("visibility", "public")
    .order("published_at", { ascending: false });

  if (publicScan.data && publicScan.data.length > 0) {
    const requestedVariants = new Set([
      normalizedIncoming,
      normalizeSlug(idOrSlug),
      toCompactAnnouncementSlug(idOrSlug).toLowerCase(),
      normalizeSlug(toCompactAnnouncementSlug(idOrSlug)),
      extractAnnouncementSuffix(normalizedIncoming) ?? "",
    ].filter(Boolean));

    const found = publicScan.data.find((row) => {
      const rowSlug = String(row.slug ?? "").toLowerCase();
      const rowId = String(row.id).toLowerCase();
      const rowCompact = toCompactAnnouncementSlug(row.slug ?? row.id).toLowerCase();
      const rowCompactNormalized = normalizeSlug(rowCompact);
      const rowNormalized = normalizeSlug(rowSlug || rowId);

      if (requestedVariants.has(rowSlug) || requestedVariants.has(rowId) || requestedVariants.has(rowCompact)) {
        return true;
      }

      return requestedVariants.has(rowCompactNormalized) || requestedVariants.has(rowNormalized);
    });

    if (found) {
      return found as unknown as Announcement;
    }
  }

  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminSupabase = createNewsroomAdminClient();
  const supabase = adminSupabase ?? (await createSupabaseClient());
  const data = await loadAnnouncement(supabase, id);

  if (!data || data.status !== "published") return { title: "Not Found | IMAT FUTA" };

  const canonicalHref = getAnnouncementHref(data.slug ?? data.id);
  const description = data.excerpt?.trim() || `${markdownToPlainText(data.body).substring(0, 160)}...`;

  return {
    title: `${data.title} | IMAT FUTA Newsroom`,
    description,
    alternates: {
      canonical: canonicalHref,
    },
    openGraph: {
      type: "article",
      title: data.title,
      description,
      url: canonicalHref,
      publishedTime: data.published_at,
      modifiedTime: data.updated_at,
      images: data.image_url
        ? [
            {
              url: data.image_url && data.image_url.includes('res.cloudinary.com') ? optimizeCloudinaryUrl(data.image_url) : data.image_url,
              alt: data.title,
            },
          ]
        : undefined,
    },
  };
}

export default async function NewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminSupabase = createNewsroomAdminClient();
  const contentSupabase = adminSupabase ?? (await createSupabaseClient());

  const data = await loadAnnouncement(contentSupabase, id);

  // Only published posts are served on the public post page — drafts and
  // items awaiting approval 404 here.
  if (!data || data.status !== "published") notFound();

  const post = data as unknown as Announcement;
  const canonicalHref = getAnnouncementHref(post.slug ?? post.id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imat-futa.vercel.app";
  const canonicalUrl = `${siteUrl}${canonicalHref}`;
  const canonicalSegment = canonicalHref.split("/").pop() ?? "";
  const hasBeenUpdated = new Date(post.updated_at).getTime() > new Date(post.published_at).getTime();
  const video = post.video_url ? parseVideoUrl(post.video_url) : null;
  const authorName = post.author_id
    ? (await contentSupabase.from("users").select("full_name").eq("id", post.author_id).maybeSingle()).data?.full_name ?? "IMAT Official"
    : "IMAT Official";

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt?.trim() || markdownToPlainText(post.body).substring(0, 160),
    image: post.image_url ? [post.image_url] : [`${siteUrl}/images/logo.png`],
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "IMAT FUTA",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/images/logo.png`,
      },
    },
    mainEntityOfPage: canonicalUrl,
  };

  // Normalize legacy long links and UUID paths to the compact canonical URL.
  if (canonicalSegment && id.toLowerCase() !== canonicalSegment.toLowerCase()) {
    redirect(canonicalHref);
  }

  return (
    <div className="min-h-screen bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {/* Hero */}
      <div className="bg-bg2 border-b border-borderDark pt-6 pb-10 sm:pt-10 sm:pb-16">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs className="mb-5 sm:mb-8" />
          <Link
            href="/newsroom"
            className="mb-6 inline-flex items-center gap-2 text-xs font-mono text-text3 transition-colors hover:text-primary sm:mb-10 sm:text-sm"
          >
            <ArrowLeft size={16} /> Back to Newsroom
          </Link>

          <div className="mb-3 flex items-center gap-3 sm:mb-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-borderLit/40 bg-bg shadow-sm">
              <Image src="/images/logo.png" alt="IMAT logo" width={24} height={24} className="h-6 w-6 object-contain" />
            </span>
            <span className="text-xs font-mono uppercase tracking-[0.18em] text-text3">IMAT FUTA · Newsroom</span>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-primary sm:text-xs">
              {post.visibility === "public" ? "Public Broadcast" : "Members Only"}
            </div>
            {post.topic && (
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-accent sm:text-xs">
                {post.topic}
              </div>
            )}
          </div>

          <h1 className="mb-5 text-2xl font-bold leading-tight text-textDefault sm:mb-7 sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mb-5 text-base leading-relaxed text-text2 sm:mb-7 sm:text-lg">
              {post.excerpt}
            </p>
          )}

          <div className="flex flex-col gap-3 border-y border-borderDark py-3 text-xs font-mono text-text3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 sm:py-4 sm:text-sm">
            <div className="flex items-center gap-2 truncate">
              <Calendar size={16} />
              {format(new Date(post.published_at), "MMMM d, yyyy")}
            </div>
            <div className="flex items-center gap-2 truncate">
              <User size={16} />
              {authorName}
            </div>
            {hasBeenUpdated && (
              <div className="flex items-center gap-2 truncate">
                <Calendar size={16} />
                Updated {format(new Date(post.updated_at), "MMMM d, yyyy")}
              </div>
            )}
          </div>

          {hasBeenUpdated && (
            <div className="mt-3 rounded-xl border border-borderDark bg-bg px-3 py-2 text-xs text-text3 sm:mt-4 sm:px-4 sm:py-3 sm:text-sm">
              <span className="font-semibold text-textDefault">Updated on:</span> {format(new Date(post.updated_at), "MMMM d, yyyy")}
            </div>
          )}

          {post.image_url && (
            <div className="mt-6 overflow-hidden rounded-xl border border-borderDark bg-bg sm:mt-8 sm:rounded-xl">
              <Image
                src={post.image_url && post.image_url.includes('res.cloudinary.com') ? optimizeCloudinaryUrl(post.image_url, { width: 1400 }) : post.image_url}
                alt={post.title}
                width={1400}
                height={788}
                unoptimized
                sizes="(max-width: 768px) 100vw, 960px"
                quality={80}
                className="h-auto max-h-[52vh] w-full object-cover sm:max-h-[60vh]"
                priority
              />
            </div>
          )}

          {video && (
            <div className="mt-6 overflow-hidden rounded-xl border border-borderDark bg-black sm:mt-8 sm:rounded-xl">
              <div className="relative aspect-video w-full">
                <iframe
                  src={video.embedUrl}
                  title={`${post.title} — video`}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="flex items-center gap-2 bg-bg px-4 py-3 text-xs text-text3">
                <Play size={14} className="shrink-0 text-primary" />
                <span className="truncate">
                  Watch on {video.provider === "youtube" ? "YouTube" : "Vimeo"} —{" "}
                  <a href={video.watchUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">
                    open the video
                  </a>
                </span>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 text-[10px] font-mono text-text3 sm:mt-6 sm:text-xs">
            <span className="max-w-full truncate rounded-full border border-borderDark bg-bg px-2.5 py-1 sm:px-3">{canonicalHref}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <ArticleBody markdown={post.body} />
      </div>
    </div>
  );
}
