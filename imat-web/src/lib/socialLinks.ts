export type SocialPlatform =
  | "twitter"
  | "instagram"
  | "github"
  | "linkedin"
  | "youtube"
  | "facebook";

export type SocialLinkRecord = {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  is_enabled: boolean;
  sort_order: number;
};

export const defaultSocialLinks: SocialLinkRecord[] = [
  {
    id: "twitter",
    platform: "twitter",
    label: "Twitter/X",
    url: "https://x.com/",
    is_enabled: true,
    sort_order: 1,
  },
  {
    id: "instagram",
    platform: "instagram",
    label: "Instagram",
    url: "https://instagram.com/",
    is_enabled: true,
    sort_order: 2,
  },
  {
    id: "github",
    platform: "github",
    label: "GitHub",
    url: "https://github.com/",
    is_enabled: true,
    sort_order: 3,
  },
  {
    id: "linkedin",
    platform: "linkedin",
    label: "LinkedIn",
    url: "https://linkedin.com/",
    is_enabled: true,
    sort_order: 4,
  },
  {
    id: "youtube",
    platform: "youtube",
    label: "YouTube",
    url: "https://youtube.com/",
    is_enabled: true,
    sort_order: 5,
  },
  {
    id: "facebook",
    platform: "facebook",
    label: "Facebook",
    url: "https://facebook.com/",
    is_enabled: true,
    sort_order: 6,
  },
];

export function mergeSocialLinks(rows: Partial<SocialLinkRecord>[] | null | undefined) {
  const map = new Map((rows ?? []).map((row) => [row.platform, row]));

  return defaultSocialLinks
    .map((fallback) => {
      const dbRow = map.get(fallback.platform);
      return {
        ...fallback,
        ...(dbRow ?? {}),
        id: String(dbRow?.id ?? fallback.id),
        platform: fallback.platform,
      } as SocialLinkRecord;
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}