// YouTube / Vimeo links for broadcast posts.
//
// The newsroom renders a pasted link as an embedded player; the email
// version cannot embed a player, so it shows the video thumbnail (YouTube)
// or a play button (Vimeo) linking out to the video. Only youtube.com,
// youtu.be, vimeo.com and player.vimeo.com are ever accepted — anything
// else is treated as "not a video" and never rendered.

export type ParsedVideo = {
  provider: "youtube" | "vimeo";
  id: string;
  /** Canonical watch URL (used by the email play link). */
  watchUrl: string;
  /** Privacy-enhanced embed URL (youtube-nocookie for YouTube). */
  embedUrl: string;
  /** Static thumbnail URL, or null when the provider has none without an API call (Vimeo). */
  thumbnailUrl: string | null;
};

function youtubeIdFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const fromQuery = url.searchParams.get("v");
    if (fromQuery && /^[A-Za-z0-9_-]{6,20}$/.test(fromQuery)) return fromQuery;

    const parts = url.pathname.split("/").filter(Boolean);
    if ((parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" || parts[0] === "v") && parts[1]) {
      return /^[A-Za-z0-9_-]{6,20}$/.test(parts[1]) ? parts[1] : null;
    }
  }

  return null;
}

function vimeoIdFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = host === "player.vimeo.com" && parts[0] === "video" ? parts[1] : parts[0];
    return id && /^\d{5,20}$/.test(id) ? id : null;
  }

  return null;
}

export function parseVideoUrl(rawUrl: string): ParsedVideo | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const youtubeId = youtubeIdFromUrl(url);
  if (youtubeId) {
    return {
      provider: "youtube",
      id: youtubeId,
      watchUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  const vimeoId = vimeoIdFromUrl(url);
  if (vimeoId) {
    return {
      provider: "vimeo",
      id: vimeoId,
      watchUrl: `https://vimeo.com/${vimeoId}`,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      thumbnailUrl: null,
    };
  }

  return null;
}

export function isVideoUrl(rawUrl: string): boolean {
  return parseVideoUrl(rawUrl) !== null;
}
