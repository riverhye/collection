import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useColorScheme } from "react-native";

export type IconName = SymbolViewProps["name"];

export const ICONS = {
  add: { ios: "plus", android: "add", web: "add" },
  search: { ios: "magnifyingglass", android: "search", web: "search" },
  clear: { ios: "xmark.circle.fill", android: "cancel", web: "cancel" },
  heart: { ios: "heart", android: "favorite_border", web: "favorite_border" },
  heartFill: { ios: "heart.fill", android: "favorite", web: "favorite" },
  link: { ios: "arrow.up.right.square", android: "open_in_new", web: "open_in_new" },
  trash: { ios: "trash", android: "delete", web: "delete" },
  refresh: { ios: "arrow.clockwise", android: "refresh", web: "refresh" },
  filter: { ios: "line.3.horizontal.decrease", android: "filter_list", web: "filter_list" },
  list: { ios: "list.bullet", android: "list", web: "list" },
  grid: { ios: "square.grid.3x3", android: "grid_view", web: "grid_view" },
  calendar: { ios: "calendar", android: "calendar_month", web: "calendar_month" },
  chevronLeft: { ios: "chevron.left", android: "chevron_left", web: "chevron_left" },
  chevronRight: { ios: "chevron.right", android: "chevron_right", web: "chevron_right" },
} satisfies Record<string, IconName>;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

/** SF Symbol on iOS, Material Symbol on Android. Defaults to the current text color. */
export function Icon({ name, size = 20, color }: Props) {
  const scheme = useColorScheme();
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color ?? (scheme === "dark" ? "#EDEEF0" : "#1C2024")}
    />
  );
}
