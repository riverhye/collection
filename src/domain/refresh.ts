// Comparing an entry with freshly fetched source data. No React Native imports here.

import type { EntryInput, EntryWithTags } from "@/domain/entry";
import { META_FIELDS } from "@/domain/meta-fields";

export type FieldChange = { label: string; from: string; to: string };

type Fresh = { title: string; thumbnail: string | null; url: string | null; meta: object };

const EXTRA_LABELS: Record<string, string> = {
  genres: "장르",
  duration: "길이",
  pubDate: "출간일",
  publishedAt: "게시일",
  isbn: "ISBN",
};

function show(value: unknown): string {
  if (value == null || value === "") return "(없음)";
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function same(a: unknown, b: unknown) {
  return show(a) === show(b);
}

/**
 * What would change if the fresh data were applied. Fields the source doesn't return are kept,
 * so a refresh never erases something the user typed that the source lacks.
 */
export function diffRefresh(entry: EntryWithTags, fresh: Fresh): { changes: FieldChange[]; patch: Partial<EntryInput> } {
  const changes: FieldChange[] = [];
  const patch: Partial<EntryInput> = {};
  const current = (entry.meta ?? {}) as Record<string, unknown>;
  const freshMeta = fresh.meta as Record<string, unknown>;

  if (fresh.title && !same(entry.title, fresh.title)) {
    changes.push({ label: "제목", from: show(entry.title), to: fresh.title });
    patch.title = fresh.title;
  }
  if (fresh.thumbnail && !same(entry.thumbnail, fresh.thumbnail)) {
    changes.push({ label: "포스터", from: entry.thumbnail ? "이전 이미지" : "(없음)", to: "새 이미지" });
    patch.thumbnail = fresh.thumbnail;
  }
  if (fresh.url && !same(entry.url, fresh.url)) {
    changes.push({ label: "링크", from: show(entry.url), to: fresh.url });
    patch.url = fresh.url;
  }

  const labels: Record<string, string> = { ...EXTRA_LABELS };
  for (const f of META_FIELDS[entry.type]) labels[f.key] = f.label;
  const nextMeta = { ...current };
  for (const [key, value] of Object.entries(freshMeta)) {
    if (value == null || value === "" || same(current[key], value)) continue;
    nextMeta[key] = value;
    if (labels[key]) changes.push({ label: labels[key], from: show(current[key]), to: show(value) });
  }
  if (JSON.stringify(nextMeta) !== JSON.stringify(current)) patch.meta = nextMeta;

  return { changes, patch };
}
