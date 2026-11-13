import { Image } from "expo-image";
import { View } from "react-native";

import { Icon } from "@/components/icon";
import { TYPE_COLORS, TYPE_ICONS } from "@/constants/entry-style";
import type { EntryType } from "@/domain/entry";

type Props = {
  type: EntryType;
  thumbnail?: string | null;
  size?: number;
};

/** Thumbnail if there is one, otherwise a tile in the type's color with its icon. */
export function TypeTile({ type, thumbnail, size = 48 }: Props) {
  if (thumbnail) {
    return (
      <Image
        source={thumbnail}
        cachePolicy="disk"
        contentFit="cover"
        style={{ width: size, height: size * 1.4, borderRadius: 8 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size * 1.4,
        borderRadius: 8,
        backgroundColor: TYPE_COLORS[type],
        alignItems: "center",
        justifyContent: "center",
      }}>
      <Icon name={TYPE_ICONS[type]} size={size * 0.45} color="#FFFFFF" />
    </View>
  );
}
