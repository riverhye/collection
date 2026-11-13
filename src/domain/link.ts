// Pasted-link parsing. No React Native imports here.

export type ParsedLink =
  | { kind: "youtube"; videoId: string; url: string }
  | { kind: "tmdb"; mediaType: "movie" | "tv"; id: string; url: string }
  | { kind: "web"; url: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** True when the whole text is a single link (what a paste into the title box looks like). */
export function looksLikeLink(text: string): boolean {
  const t = text.trim();
  return /^(https?:\/\/|www\.|m\.|youtu\.be\/|youtube\.com\/)\S+$/i.test(t);
}

export function parseLink(raw: string): ParsedLink | null {
  let text = raw.trim();
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  // youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /live/ID, /embed/ID
  let videoId: string | null = null;
  if (host === "youtu.be") videoId = segments[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (segments[0] === "watch") videoId = url.searchParams.get("v");
    else if (["shorts", "live", "embed", "v"].includes(segments[0])) videoId = segments[1] ?? null;
  }
  if (videoId && YOUTUBE_ID.test(videoId)) {
    return { kind: "youtube", videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
  }

  // themoviedb.org/movie/496243-parasite, /tv/61678
  if (host === "themoviedb.org" && (segments[0] === "movie" || segments[0] === "tv")) {
    const id = /^(\d+)/.exec(segments[1] ?? "")?.[1];
    if (id) return { kind: "tmdb", mediaType: segments[0], id, url: `https://www.themoviedb.org/${segments[0]}/${id}` };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return { kind: "web", url: url.toString() };
}
