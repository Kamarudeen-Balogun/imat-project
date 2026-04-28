import { NextResponse } from "next/server";

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://imat-futa.vercel.app").replace(/\/$/, "");
  const sitemapUrl = `${siteUrl}/sitemap.xml`;

  const endpoints = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ];

  const results = await Promise.all(
    endpoints.map(async (url) => {
      try {
        const res = await fetch(url, { method: "GET" });
        return { url, status: res.status, ok: res.ok };
      } catch (err) {
        return { url, error: String(err) };
      }
    })
  );

  return NextResponse.json({ sitemap: sitemapUrl, results });
}

export async function POST() {
  return GET();
}
