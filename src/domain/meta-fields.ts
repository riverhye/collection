import type { EntryType } from "@/domain/entry";

export type MetaField = { key: string; label: string; kind: "text" | "number" };

/** Manually editable meta fields per type. Phase 2 adapters fill the same keys automatically. */
export const META_FIELDS: Record<EntryType, MetaField[]> = {
  movie: [
    { key: "year", label: "연도", kind: "number" },
    { key: "director", label: "감독", kind: "text" },
    { key: "runtime", label: "러닝타임(분)", kind: "number" },
  ],
  tv: [
    { key: "year", label: "연도", kind: "number" },
    { key: "seasons", label: "시즌 수", kind: "number" },
  ],
  youtube: [{ key: "channel", label: "채널", kind: "text" }],
  book: [
    { key: "author", label: "저자", kind: "text" },
    { key: "publisher", label: "출판사", kind: "text" },
  ],
  article: [
    { key: "siteName", label: "사이트", kind: "text" },
    { key: "author", label: "글쓴이", kind: "text" },
    { key: "summary", label: "요약", kind: "text" },
  ],
  etc: [],
};
