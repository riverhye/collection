import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Icon, ICONS } from "@/components/icon";
import { TypeTile } from "@/components/type-tile";
import type { EntryWithTags } from "@/domain/entry";

/** Grid cell: poster (or type tile) with the title under it. */
export function EntryTile({ entry, width }: { entry: EntryWithTags; width: number }) {
  return (
    <Link href={{ pathname: "/entry/[id]", params: { id: entry.id } }} asChild>
      <Pressable style={{ width }} className="gap-1.5 active:opacity-70">
        <View>
          <TypeTile type={entry.type} thumbnail={entry.thumbnail} size={width} />
          {entry.favorite && (
            <View className="absolute right-1.5 top-1.5">
              <Icon name={ICONS.heartFill} size={14} color="#E5484D" />
            </View>
          )}
        </View>
        <Text numberOfLines={2} className="text-sm text-zinc-900 dark:text-zinc-100">
          {entry.title}
        </Text>
      </Pressable>
    </Link>
  );
}
