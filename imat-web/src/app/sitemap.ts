import type { MetadataRoute } from "next";
import { createSupabaseClient } from "@/lib/supabase/server";
import { getAnnouncementHref } from "@/lib/news";

const STATIC_ROUTES = [
  "",
  "/about",
  "/evidence",
  "/issues",
  "/report",
  "/apply",
  "/members",
  "/newsroom",
  "/privacy",
  "/terms",
  "/accessibility",
  "/cookies",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://imat-futa.vercel.app").replace(/\/$/, "");
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/newsroom" || route === "/report" ? 0.9 : 0.7,
  }));

  // Dynamic entries: published public newsroom articles and public issues.
  // Any failure (missing env, DB unreachable) falls back to the static list
  // so /sitemap.xml never breaks.
  try {
    const supabase = await createSupabaseClient();

    const [newsRes, defectsRes] = await Promise.all([
      supabase
        .from("announcements")
        .select("slug, id, updated_at, published_at")
        .eq("status", "published")
        .eq("visibility", "public")
        .order("published_at", { ascending: false })
        .limit(500),
      supabase
        .from("defects")
        .select("id, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1000),
    ]);

    if (!newsRes.error && newsRes.data) {
      for (const row of newsRes.data as { slug: string | null; id: string; updated_at: string; published_at: string }[]) {
        entries.push({
          url: `${siteUrl}${getAnnouncementHref(row.slug ?? row.id)}`,
          lastModified: new Date(row.updated_at || row.published_at),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }

    if (!defectsRes.error && defectsRes.data) {
      for (const row of defectsRes.data as { id: string; updated_at: string }[]) {
        entries.push({
          url: `${siteUrl}/issues/${row.id}`,
          lastModified: new Date(row.updated_at),
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    }
  } catch {
    // Fall through with the static entries only.
  }

  return entries;
}
