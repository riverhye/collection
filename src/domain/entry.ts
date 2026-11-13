// Domain types. No React Native imports here.

export const ENTRY_TYPES = ["movie", "tv", "youtube", "book", "article", "etc"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  movie: "영화",
  tv: "TV",
  youtube: "유튜브",
  book: "책",
  article: "글",
  etc: "기타",
};

export type MovieMeta = { tmdbId?: number; year?: number; director?: string; genres?: string[]; runtime?: number };
export type TvMeta = { tmdbId?: number; year?: number; seasons?: number; genres?: string[] };
export type YoutubeMeta = { videoId?: string; channel?: string; duration?: number; publishedAt?: string };
export type BookMeta = { isbn?: string; author?: string; publisher?: string; pubDate?: string; pageCount?: number };
export type ArticleMeta = { siteName?: string; author?: string; publishedAt?: string; summary?: string };
export type EtcMeta = Record<string, unknown>;

export type EntryMeta = MovieMeta | TvMeta | YoutubeMeta | BookMeta | ArticleMeta | EtcMeta;

export type Entry = {
  id: string;
  title: string;
  type: EntryType;
  source: string | null;
  url: string | null;
  thumbnail: string | null;
  memo: string | null;
  favorite: boolean;
  meta: EntryMeta | null;
  /** YYYY-MM-DD, the day the user actually watched/read it */
  experiencedDate: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EntryWithTags = Entry & { tags: string[] };

export type EntryInput = {
  title: string;
  type?: EntryType;
  source?: string | null;
  url?: string | null;
  thumbnail?: string | null;
  memo?: string | null;
  favorite?: boolean;
  meta?: EntryMeta | null;
  experiencedDate?: string | null;
  tags?: string[];
};

/** Strong-identifier form of a URL for dedup: lowercased host, no www./m., no tracking params, no trailing slash. */
export function normalizeUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  const params = new URLSearchParams(url.search);
  for (const key of [...params.keys()]) {
    if (key.startsWith("utm_") || key === "fbclid" || key === "gclid" || key === "si") params.delete(key);
  }
  const query = params.toString();
  const path = url.pathname.replace(/\/+$/, "");
  return `https://${host}${path}${query ? `?${query}` : ""}`;
}

/** Splits "a, b,  #c" into ["a", "b", "c"], trimmed and de-duplicated. */
export function parseTags(raw: string): string[] {
  const names = raw
    .split(/[,\n]/)
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean);
  return [...new Set(names)];
}
