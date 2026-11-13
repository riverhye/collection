import type { EntryMeta, EntryType } from "@/domain/entry";

export type SearchResult = {
  /** Strong identifier value (tmdbId / isbn / videoId), also used as the list key. */
  externalId: string;
  title: string;
  /** Secondary line in the result list: year, author · publisher, channel… */
  subtitle: string;
  thumbnail: string | null;
  url: string | null;
  meta: EntryMeta;
};

export interface SourceAdapter {
  search(query: string, signal: AbortSignal): Promise<SearchResult[]>;
  /** Fills fields the search response lacks (director, runtime, duration). Called once when a result is picked. */
  details?(result: SearchResult): Promise<SearchResult>;
  /** Fetched when the detail screen opens; not stored (PLAN §2 summary rule). */
  summary?(meta: Record<string, unknown>, signal: AbortSignal): Promise<string | null>;
}

/** Meta key holding each type's strong identifier, used for dedup. */
export const STRONG_ID_KEYS: Partial<Record<EntryType, string>> = {
  movie: "tmdbId",
  tv: "tmdbId",
  book: "isbn",
  youtube: "videoId",
};

export function requireKey(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} 키가 없어요. .env.local을 확인하세요.`);
  return value;
}

export async function getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`검색 실패 (${res.status})`);
  return (await res.json()) as T;
}
