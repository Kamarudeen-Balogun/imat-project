import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imat-futa.vercel.app";
  const now = new Date();

  const routes = [
    "",
    "/about",
    "/evidence",
    "/issues",
    "/report",
    "/apply",
    "/members",
    "/newsroom",
    "/login",
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/newsroom" || route === "/report" ? 0.9 : 0.7,
  }));
}
