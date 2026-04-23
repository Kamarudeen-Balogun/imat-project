import { createSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Calendar, User } from "lucide-react";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { extractAnnouncementSuffix, getAnnouncementHref, toCompactAnnouncementSlug } from "@/lib/news";
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
  const selectColumns = "id, slug, author_id, title, body, visibility, published_at, updated_at, image_url";

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

  if (!data) return { title: "Not Found | IMAT FUTA" };

  return {
    title: `${data.title} | IMAT FUTA Newsroom`,
    description: data.body.substring(0, 160) + "...",
  };
}

export default async function NewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminSupabase = createNewsroomAdminClient();
  const contentSupabase = adminSupabase ?? (await createSupabaseClient());

  const data = await loadAnnouncement(contentSupabase, id);

  if (!data) notFound();

  const post = data as unknown as Announcement;
  const canonicalHref = getAnnouncementHref(post.slug ?? post.id);
  const canonicalSegment = canonicalHref.split("/").pop() ?? "";
  const hasBeenUpdated = new Date(post.updated_at).getTime() > new Date(post.published_at).getTime();
  const authorName = post.author_id
    ? (await contentSupabase.from("users").select("full_name").eq("id", post.author_id).maybeSingle()).data?.full_name ?? "IMAT Official"
    : "IMAT Official";

  // Normalize legacy long links and UUID paths to the compact canonical URL.
  if (canonicalSegment && id.toLowerCase() !== canonicalSegment.toLowerCase()) {
    redirect(canonicalHref);
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <div className="bg-bg2 border-b border-borderDark pt-10 pb-20">
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
          <Breadcrumbs className="mb-8" />
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

          {hasBeenUpdated && (
            <div className="mt-4 rounded-xl border border-borderDark bg-bg px-4 py-3 text-sm text-text3">
              <span className="font-semibold text-textDefault">Updated on:</span> {format(new Date(post.updated_at), "MMMM d, yyyy")}
            </div>
          )}

          {post.image_url && (
            <div className="mt-10 overflow-hidden rounded-2xl border border-borderDark bg-bg">
              <Image
                src={post.image_url}
                alt={post.title}
                width={1400}
                height={788}
                unoptimized
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
