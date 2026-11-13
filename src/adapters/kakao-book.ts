import { getJson, requireKey, type SearchResult, type SourceAdapter } from "@/adapters/types";

type Doc = {
  title: string;
  authors: string[];
  publisher: string;
  datetime: string;
  /** "10-digit 13-digit", either may be empty */
  isbn: string;
  thumbnail: string;
  url: string;
  contents: string;
};

function search(params: string, signal: AbortSignal) {
  const key = requireKey(process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY, "카카오");
  return getJson<{ documents: Doc[] }>(`https://dapi.kakao.com/v3/search/book?size=15&${params}`, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal,
  });
}

function pickIsbn(raw: string) {
  const parts = raw.split(" ").filter(Boolean);
  return parts.find((p) => p.length === 13) ?? parts[0] ?? "";
}

export const kakaoBookAdapter: SourceAdapter = {
  async search(query, signal) {
    const data = await search(`query=${encodeURIComponent(query)}`, signal);
    return data.documents.map((doc): SearchResult => {
      const isbn = pickIsbn(doc.isbn);
      const author = doc.authors.join(", ");
      return {
        externalId: isbn || doc.url,
        title: doc.title,
        subtitle: [author, doc.publisher].filter(Boolean).join(" · "),
        thumbnail: doc.thumbnail || null,
        url: doc.url || null,
        meta: {
          isbn: isbn || undefined,
          author: author || undefined,
          publisher: doc.publisher || undefined,
          pubDate: doc.datetime ? doc.datetime.slice(0, 10) : undefined,
        },
      };
    });
  },

  async summary(meta, signal) {
    if (typeof meta.isbn !== "string" || !meta.isbn) return null;
    const data = await search(`target=isbn&query=${meta.isbn}`, signal);
    return data.documents[0]?.contents || null;
  },
};
