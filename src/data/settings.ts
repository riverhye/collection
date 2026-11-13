import Storage from "expo-sqlite/kv-store";

export type DetailMode = "view" | "edit";

const DETAIL_MODE_KEY = "settings.detailMode";

export function getDetailMode(): DetailMode {
  return Storage.getItemSync(DETAIL_MODE_KEY) === "edit" ? "edit" : "view";
}

export function setDetailMode(mode: DetailMode) {
  Storage.setItemSync(DETAIL_MODE_KEY, mode);
}
