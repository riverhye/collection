// Backup file format. No React Native imports here.

import { ENTRY_TYPES, type EntryType, type EntryWithTags } from "@/domain/entry";

export const BACKUP_VERSION = 1;

type BackupEntry = Omit<EntryWithTags, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string };
type BackupFile = { app: "collection"; version: number; exportedAt: string; entries: BackupEntry[] };

export function serializeBackup(entries: EntryWithTags[], now = new Date()): string {
  const file: BackupFile = {
    app: "collection",
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    entries: entries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString() })),
  };
  return JSON.stringify(file, null, 2);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function date(value: unknown, fallback: Date): Date {
  const d = typeof value === "string" ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d : fallback;
}

/** Validates a backup file; throws a message suitable for showing to the user. */
export function parseBackup(text: string): EntryWithTags[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("백업 파일을 읽을 수 없어요 (JSON 형식이 아니에요).");
  }
  const file = data as Partial<BackupFile>;
  if (file?.app !== "collection" || !Array.isArray(file.entries)) {
    throw new Error("이 앱의 백업 파일이 아니에요.");
  }
  if (typeof file.version !== "number" || file.version > BACKUP_VERSION) {
    throw new Error("더 새로운 버전의 앱에서 만든 백업이에요. 앱을 업데이트한 뒤 불러오세요.");
  }
  const now = new Date();
  return file.entries.flatMap((raw): EntryWithTags[] => {
    const e = raw as Partial<BackupEntry>;
    const id = str(e.id);
    const title = str(e.title);
    if (!id || !title) return [];
    const createdAt = date(e.createdAt, now);
    return [
      {
        id,
        title,
        type: ENTRY_TYPES.includes(e.type as EntryType) ? (e.type as EntryType) : "etc",
        source: str(e.source),
        url: str(e.url),
        thumbnail: str(e.thumbnail),
        memo: str(e.memo),
        favorite: e.favorite === true,
        meta: e.meta && typeof e.meta === "object" ? e.meta : null,
        experiencedDate: str(e.experiencedDate),
        createdAt,
        updatedAt: date(e.updatedAt, createdAt),
        tags: Array.isArray(e.tags) ? e.tags.filter((t): t is string => typeof t === "string" && t !== "") : [],
      },
    ];
  });
}
