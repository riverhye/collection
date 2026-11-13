import { getJson, requireKey, type SearchResult, type SourceAdapter } from "@/adapters/types";

const BASE = "https://api.themoviedb.org/3";
const IMAGE = "https://image.tmdb.org/t/p/w342";

type Kind = "movie" | "tv";
type SearchItem = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
};
type Detail = {
  overview: string;
  genres: { name: string }[];
  runtime?: number;
  number_of_seasons?: number;
  credits?: { crew: { job: string; name: string }[] };
};

function headers() {
  // Static reference so Expo inlines it at build time.
  return { Authorization: `Bearer ${requireKey(process.env.EXPO_PUBLIC_TMDB_TOKEN, "TMDB")}` };
}

function detail(kind: Kind, id: unknown, language: string, signal?: AbortSignal) {
  const extra = kind === "movie" ? "&append_to_response=credits" : "";
  return getJson<Detail>(`${BASE}/${kind}/${id}?language=${language}${extra}`, { headers: headers(), signal });
}

function createTmdbAdapter(kind: Kind): SourceAdapter {
  return {
    async search(query, signal) {
      const data = await getJson<{ results: SearchItem[] }>(
        `${BASE}/search/${kind}?language=ko-KR&query=${encodeURIComponent(query)}`,
        { headers: headers(), signal },
      );
      return data.results.slice(0, 15).map((item): SearchResult => {
        const title = item.title ?? item.name ?? "";
        const original = item.original_title ?? item.original_name;
        const year = Number((item.release_date ?? item.first_air_date ?? "").slice(0, 4)) || undefined;
        return {
          externalId: String(item.id),
          title,
          subtitle: [year, original !== title ? original : null].filter(Boolean).join(" · "),
          thumbnail: item.poster_path ? `${IMAGE}${item.poster_path}` : null,
          url: `https://www.themoviedb.org/${kind}/${item.id}`,
          meta: { tmdbId: item.id, year },
        };
      });
    },

    async details(result) {
      const d = await detail(kind, result.externalId, "ko-KR");
      const genres = d.genres.map((g) => g.name);
      const extra =
        kind === "movie"
          ? { director: d.credits?.crew.find((c) => c.job === "Director")?.name, runtime: d.runtime || undefined }
          : { seasons: d.number_of_seasons };
      return { ...result, meta: { ...result.meta, genres, ...extra } };
    },

    async summary(meta, signal) {
      if (!meta.tmdbId) return null;
      const ko = await detail(kind, meta.tmdbId, "ko-KR", signal);
      if (ko.overview) return ko.overview;
      const en = await detail(kind, meta.tmdbId, "en-US", signal);
      return en.overview || null;
    },
  };
}

export const tmdbMovieAdapter = createTmdbAdapter("movie");
export const tmdbTvAdapter = createTmdbAdapter("tv");
