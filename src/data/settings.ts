import Storage from "expo-sqlite/kv-store";

export type DetailMode = "view" | "edit";

const DETAIL_MODE_KEY = "settings.detailMode";

export function getDetailMode(): DetailMode {
  return Storage.getItemSync(DETAIL_MODE_KEY) === "edit" ? "edit" : "view";
}

export function setDetailMode(mode: DetailMode) {
  Storage.setItemSync(DETAIL_MODE_KEY, mode);
}

export type ListView = "list" | "grid" | "calendar";

const LIST_VIEW_KEY = "settings.listView";

export function getListView(): ListView {
  const value = Storage.getItemSync(LIST_VIEW_KEY);
  return value === "grid" || value === "calendar" ? value : "list";
}

export function setListView(view: ListView) {
  Storage.setItemSync(LIST_VIEW_KEY, view);
}

const LAST_BACKUP_KEY = "settings.lastBackupAt";

export function getLastBackupAt(): Date | null {
  const value = Storage.getItemSync(LAST_BACKUP_KEY);
  return value ? new Date(value) : null;
}

export function setLastBackupAt(date: Date) {
  Storage.setItemSync(LAST_BACKUP_KEY, date.toISOString());
}
