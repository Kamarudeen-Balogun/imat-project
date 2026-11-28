import type { Metadata } from "next";

/**
 * Shared SEO helpers for IMAT FUTA.
 *
 * The live site is https://imat-futa.vercel.app/ (the Vercel URL).
 * imat.codeflowx.dev is email-only (Resend sender) and is NOT the website
 * address, so it must never appear in canonical / OG / Twitter URLs.
 * NEXT_PUBLIC_SITE_URL may override the base, but its fallback is the
 * Vercel URL.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://imat-futa.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "IMAT FUTA";

/** Served by src/app/og-image.png/route.ts — a real 1200x630 PNG. */
export const OG_IMAGE_PATH = "/og-image.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT = "IMAT — Infrastructure Maintenance Awareness Team, FUTA";
export const OG_IMAGE_TYPE = "image/png";

export const DEFAULT_DESCRIPTION =
  "Track, report, and advocate for better campus infrastructure at FUTA.";

export function ogImage() {
  return {
    url: OG_IMAGE_PATH,
    secureUrl: `${SITE_URL}${OG_IMAGE_PATH}`,
    type: OG_IMAGE_TYPE,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: OG_IMAGE_ALT,
  };
}

export type PageMetaInput = {
  /** Full page title, e.g. "About IMAT · IMAT FUTA". */
  title: string;
  description: string;
  /** Path starting with "/", e.g. "/about". */
  path: string;
  /**
   * OG/Twitter image. Defaults to the site OG card. Pass a string URL or an
   * object for a per-page image (e.g. an article photo or an issue photo).
   */
  image?: string | { url: string; alt: string; width?: number; height?: number };
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

/**
 * Build complete, platform-correct metadata for a shareable page:
 * canonical URL, full Open Graph tags (og:title, og:description, og:url,
 * og:site_name, og:type, og:image + og:image:secure_url/type/width/height/alt)
 * and a Twitter summary_large_image card with the same title, description
 * and image — so WhatsApp, Telegram, Facebook, LinkedIn, iMessage and X
 * all render the same preview.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
}: PageMetaInput): Metadata {
  const url = `${SITE_URL}${path}`;
  const ogImg =
    image === undefined
      ? ogImage()
      : typeof image === "string"
        ? { url: image, alt: title }
        : image;
  const imageUrl = typeof ogImg.url === "string" ? ogImg.url : OG_IMAGE_PATH;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type,
      ...(type === "article"
        ? { publishedTime, modifiedTime }
        : {}),
      images: [ogImg],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
