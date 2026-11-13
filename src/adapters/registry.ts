import { articleAdapter } from "@/adapters/article";
import { kakaoBookAdapter } from "@/adapters/kakao-book";
import { tmdbMovieAdapter, tmdbTvAdapter } from "@/adapters/tmdb";
import { STRONG_ID_KEYS, type SearchResult, type SourceAdapter } from "@/adapters/types";
import { youtubeAdapter } from "@/adapters/youtube";
import type { Entry, EntryType } from "@/domain/entry";
import type { ParsedLink } from "@/domain/link";

/** One adapter per type for now. */
const ADAPTERS: Partial<Record<EntryType, SourceAdapter>> = {
  movie: tmdbMovieAdapter,
  tv: tmdbTvAdapter,
  book: kakaoBookAdapter,
  youtube: youtubeAdapter,
  article: articleAdapter,
};

/** Types that support live title search. */
export function canSearch(type: EntryType): boolean {
  return !!ADAPTERS[type]?.search;
}

export function getAdapter(type: EntryType): SourceAdapter | undefined {
  return ADAPTERS[type];
}

/** Looks up a pasted link: YouTube/TMDB by ID, any other site as an article via its Open Graph tags. */
export async function resolveLink(link: ParsedLink): Promise<{ type: EntryType; result: SearchResult } | null> {
  const type: EntryType = link.kind === "youtube" ? "youtube" : link.kind === "tmdb" ? link.mediaType : "article";
  const id = link.kind === "youtube" ? link.videoId : link.kind === "tmdb" ? link.id : link.url;
  const result = await getAdapter(type)?.lookup?.(id);
  return result ? { type, result } : null;
}

/** The entry's external ID if its source supports looking it up again (for 새로고침). */
export function refreshableId(entry: Entry): string | null {
  const key = STRONG_ID_KEYS[entry.type];
  const value = key ? (entry.meta as Record<string, unknown> | null)?.[key] : undefined;
  if (value == null || value === "" || !getAdapter(entry.type)?.lookup) return null;
  return String(value);
}

/** Fetches the latest data for an entry by its external ID. */
export async function lookupEntry(entry: Entry): Promise<SearchResult | null> {
  const id = refreshableId(entry);
  return id ? ((await getAdapter(entry.type)!.lookup!(id)) ?? null) : null;
}
