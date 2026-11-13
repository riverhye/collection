import { kakaoBookAdapter } from "@/adapters/kakao-book";
import { tmdbMovieAdapter, tmdbTvAdapter } from "@/adapters/tmdb";
import type { SourceAdapter } from "@/adapters/types";
import { youtubeAdapter } from "@/adapters/youtube";
import type { EntryType } from "@/domain/entry";

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
