import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { importEntries, listEntries, type ImportResult } from "@/data/entries";
import { setLastBackupAt } from "@/data/settings";
import { parseBackup, serializeBackup } from "@/domain/backup";
import { toYmd } from "@/domain/date-range";
import type { EntryWithTags } from "@/domain/entry";

/** Writes every entry to a JSON file and opens the share sheet so it can be saved to Files/iCloud Drive. */
export async function exportBackup(): Promise<number> {
  const all = listEntries();
  const now = new Date();
  const file = new File(Paths.cache, `collection-backup-${toYmd(now)}.json`);
  if (file.exists) file.delete();
  file.create();
  await file.write(serializeBackup(all, now));
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json", dialogTitle: "백업 저장" });
  setLastBackupAt(now);
  return all.length;
}

/** Lets the user pick a backup file and parses it; null when cancelled. Throws on an invalid file. */
export async function pickBackup(): Promise<EntryWithTags[] | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: ["application/json", "public.json"], copyToCacheDirectory: true });
  if (picked.canceled) return null;
  return parseBackup(await new File(picked.assets[0].uri).text());
}

export function restoreBackup(items: EntryWithTags[]): ImportResult {
  return importEntries(items);
}
