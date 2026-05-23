export const ANNOUNCEMENT_CARD_SELECT =
  "id, slug, title, body, visibility, published_at, image_url, author:users!announcements_author_id_fkey(full_name)";

export const ANNOUNCEMENT_CARD_SELECT_WITH_PIN =
  "id, slug, title, body, visibility, published_at, image_url, is_pinned, author:users!announcements_author_id_fkey(full_name)";

export const ANNOUNCEMENT_MANAGER_SELECT =
  "id, slug, title, visibility, published_at, updated_at, image_url, author:users!announcements_author_id_fkey(full_name)";

export const ANNOUNCEMENT_MANAGER_SELECT_WITH_PIN =
  "id, slug, title, visibility, published_at, updated_at, image_url, is_pinned, author:users!announcements_author_id_fkey(full_name)";

export function isMissingPinnedColumn(error: { code?: string; message?: string } | null | undefined) {
  return Boolean(error && (error.code === "42703" || /is_pinned/i.test(error.message ?? "")));
}

export function normalizeAnnouncementAuthor<T extends { author: { full_name: string | null } | { full_name: string | null }[] | null }>(
  item: T
) {
  return {
    ...item,
    author: Array.isArray(item.author) ? item.author[0] ?? null : item.author,
  };
}
