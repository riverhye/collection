import { kakaoBookAdapter } from "@/adapters/kakao-book";
import { tmdbMovieAdapter, tmdbTvAdapter } from "@/adapters/tmdb";
import { STRONG_ID_KEYS, type SearchResult, type SourceAdapter } from "@/adapters/types";
import { youtubeAdapter } from "@/adapters/youtube";
import type { Entry, EntryType } from "@/domain/entry";
import type { ParsedLink } from "@/domain/link";

/** One adapter per type for now; article (OG parsing via proxy) comes later. */
const ADAPTERS: Partial<Record<EntryType, SourceAdapter>> = {
  movie: tmdbMovieAdapter,
  tv: tmdbTvAdapter,
  book: kakaoBookAdapter,
  youtube: youtubeAdapter,
};

export function getAdapter(type: EntryType): SourceAdapter | undefined {
  return ADAPTERS[type];
}

/** Looks up a pasted YouTube/TMDB link. Returns null for other sites (articles need the proxy, Phase 2). */
export async function resolveLink(link: ParsedLink): Promise<{ type: EntryType; result: SearchResult } | null> {
  if (link.kind === "web") return null;
  const type: EntryType = link.kind === "youtube" ? "youtube" : link.mediaType;
  const id = link.kind === "youtube" ? link.videoId : link.id;
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
