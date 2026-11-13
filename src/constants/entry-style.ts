import type { SymbolViewProps } from "expo-symbols";

import type { EntryType } from "@/domain/entry";

export const TYPE_ICONS: Record<EntryType, SymbolViewProps["name"]> = {
  movie: { ios: "film", android: "movie", web: "movie" },
  tv: { ios: "tv", android: "tv", web: "tv" },
  youtube: { ios: "play.rectangle", android: "smart_display", web: "smart_display" },
  book: { ios: "book", android: "menu_book", web: "menu_book" },
  article: { ios: "doc.text", android: "article", web: "article" },
  etc: { ios: "square.grid.2x2", android: "category", web: "category" },
};

/** Fallback tile color when an entry has no thumbnail. */
export const TYPE_COLORS: Record<EntryType, string> = {
  movie: "#E5484D",
  tv: "#8E4EC6",
  youtube: "#F76B15",
  book: "#30A46C",
  article: "#0090FF",
  etc: "#8B8D98",
};
