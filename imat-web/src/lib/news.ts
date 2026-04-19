export function createAnnouncementSlug(title: string) {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");

  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);

  return `${baseSlug || "news"}-${suffix}`;
}

export function getAnnouncementHref(slugOrId: string) {
  return `/newsroom/${slugOrId}`;
}