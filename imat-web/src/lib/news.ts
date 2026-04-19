function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractAnnouncementSuffix(slugOrId: string) {
  const match = slugOrId.toLowerCase().match(/-([a-z0-9]{8})$/);
  return match?.[1] ?? null;
}

export function toCompactAnnouncementSlug(slugOrId: string) {
  const normalized = slugify(slugOrId);
  const suffix = extractAnnouncementSuffix(normalized);

  if (!suffix) {
    return normalized || slugOrId;
  }

  const prefix = normalized.slice(0, -(suffix.length + 1));
  const compactPrefix = prefix
    .split("-")
    .filter(Boolean)
    .slice(0, 2)
    .join("-")
    .slice(0, 22);

  return `${compactPrefix || "news"}-${suffix}`;
}

export function createAnnouncementSlug(title: string) {
  const normalizedTitle = slugify(title);
  const compactBase = normalizedTitle
    .split("-")
    .filter(Boolean)
    .slice(0, 2)
    .join("-")
    .slice(0, 22);

  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);

  return `${compactBase || "news"}-${suffix}`;
}

export function getAnnouncementHref(slugOrId: string) {
  return `/newsroom/${toCompactAnnouncementSlug(slugOrId)}`;
}