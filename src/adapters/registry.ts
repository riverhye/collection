import { kakaoBookAdapter } from "@/adapters/kakao-book";
import { tmdbMovieAdapter, tmdbTvAdapter } from "@/adapters/tmdb";
import type { SearchResult, SourceAdapter } from "@/adapters/types";
import { youtubeAdapter } from "@/adapters/youtube";
import type { EntryType } from "@/domain/entry";
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
