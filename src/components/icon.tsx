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
