import { getJson, requireKey, type SearchResult, type SourceAdapter } from "@/adapters/types";

const BASE = "https://www.googleapis.com/youtube/v3";

type SearchItem = {
  id: { videoId: string };
  snippet: { title: string; channelTitle: string; publishedAt: string; thumbnails: { medium?: { url: string } } };
};
type Snippet = SearchItem["snippet"];
type VideoItem = { id: string; contentDetails?: { duration: string }; snippet?: Snippet & { description: string } };

function key() {
  return requireKey(process.env.EXPO_PUBLIC_YOUTUBE_API_KEY, "YouTube");
}

/** The search API returns HTML-escaped titles ("Tom &amp; Jerry"). */
function decodeEntities(text: string) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** "PT1H2M3S" → 3723 */
export function parseIsoDuration(iso: string): number | undefined {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return undefined;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

function video(id: unknown, part: string, signal?: AbortSignal) {
  return getJson<{ items: VideoItem[] }>(`${BASE}/videos?part=${part}&id=${id}&key=${key()}`, { signal });
}

function toResult(videoId: string, snippet: Snippet): SearchResult {
  const channel = decodeEntities(snippet.channelTitle);
  return {
    externalId: videoId,
    title: decodeEntities(snippet.title),
    subtitle: [channel, snippet.publishedAt.slice(0, 10)].join(" · "),
    thumbnail: snippet.thumbnails.medium?.url ?? null,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    meta: { videoId, channel, publishedAt: snippet.publishedAt.slice(0, 10) },
  };
}

export const youtubeAdapter: SourceAdapter = {
  async search(query, signal) {
    const data = await getJson<{ items: SearchItem[] }>(
      `${BASE}/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(query)}&key=${key()}`,
      { signal },
    );
    return data.items.map(({ id, snippet }) => toResult(id.videoId, snippet));
  },

  async lookup(videoId) {
    // videos.list costs 1 quota unit (search costs 100).
    const data = await video(videoId, "snippet,contentDetails");
    const item = data.items[0];
    if (!item?.snippet) return null;
    const result = toResult(videoId, item.snippet);
    const iso = item.contentDetails?.duration;
    return { ...result, meta: { ...result.meta, duration: iso ? parseIsoDuration(iso) : undefined } };
  },

  async details(result) {
    const data = await video(result.externalId, "contentDetails");
    const iso = data.items[0]?.contentDetails?.duration;
    return { ...result, meta: { ...result.meta, duration: iso ? parseIsoDuration(iso) : undefined } };
  },

  async summary(meta, signal) {
    if (!meta.videoId) return null;
    const data = await video(meta.videoId, "snippet", signal);
    return data.items[0]?.snippet?.description || null;
  },
};
