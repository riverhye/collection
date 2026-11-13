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

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mmss = `${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
  return h ? `${h}:${mmss}` : mmss;
}

/** Label/value rows for the detail screen's info section. */
export function metaRows(type: EntryType, meta: Record<string, unknown>): { label: string; value: string }[] {
  const rows = META_FIELDS[type]
    .filter((f) => f.key !== "summary" && meta[f.key] != null && meta[f.key] !== "")
    .map((f) => ({ label: f.label, value: String(meta[f.key]) }));
  if (Array.isArray(meta.genres) && meta.genres.length > 0) rows.push({ label: "장르", value: meta.genres.join(", ") });
  if (typeof meta.duration === "number") rows.push({ label: "길이", value: formatDuration(meta.duration) });
  if (typeof meta.pubDate === "string") rows.push({ label: "출간일", value: meta.pubDate });
  if (typeof meta.publishedAt === "string") rows.push({ label: "게시일", value: meta.publishedAt });
  if (typeof meta.isbn === "string") rows.push({ label: "ISBN", value: meta.isbn });
  return rows;
}
