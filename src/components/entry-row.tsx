import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Icon, ICONS } from "@/components/icon";
import { TypeTile } from "@/components/type-tile";
import { ENTRY_TYPE_LABELS, type EntryWithTags } from "@/domain/entry";

export function EntryRow({ entry }: { entry: EntryWithTags }) {
  const details = [ENTRY_TYPE_LABELS[entry.type], entry.source, entry.experiencedDate]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={{ pathname: "/entry/[id]", params: { id: entry.id } }} asChild>
      <Pressable className="flex-row items-center gap-3 px-4 py-2.5 active:bg-zinc-100 dark:active:bg-zinc-900">
        <TypeTile type={entry.type} thumbnail={entry.thumbnail} size={40} />
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            {entry.title}
          </Text>
          <Text numberOfLines={1} className="text-sm text-zinc-500 dark:text-zinc-400">
            {details}
          </Text>
          {entry.tags.length > 0 && (
            <Text numberOfLines={1} className="text-sm text-zinc-500 dark:text-zinc-400">
              {entry.tags.map((t) => `#${t}`).join(" ")}
            </Text>
          )}
        </View>
        {entry.favorite && <Icon name={ICONS.heartFill} size={16} color="#E5484D" />}
      </Pressable>
    </Link>
  );
}
