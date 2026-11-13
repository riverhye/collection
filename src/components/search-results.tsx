import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { SearchResult } from "@/adapters/types";
import { TypeTile } from "@/components/type-tile";
import { ENTRY_TYPE_LABELS, type EntryType } from "@/domain/entry";
import type { ResultGroup } from "@/hooks/use-external-search";

type Props = {
  groups: ResultGroup[];
  loading: boolean;
  /** Results shown per group; the rest are hidden. */
  limit?: number;
  onPick: (result: SearchResult, type: EntryType) => void;
  onManual: () => void;
  /** Extra action under the results, e.g. "유튜브에서 찾기". */
  extra?: { label: string; onPress: () => void };
};

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="py-2 active:opacity-60">
      <Text className="text-base text-blue-600 dark:text-blue-400">{label}</Text>
    </Pressable>
  );
}

export function SearchResults({ groups, loading, limit, onPick, onManual, extra }: Props) {
  const showHeaders = groups.length > 1;
  const empty = !loading && groups.every((g) => g.results.length === 0 && !g.error);

  return (
    <View className="gap-1">
      {loading && <ActivityIndicator className="py-2" />}
      {empty && <Text className="py-1 text-sm text-zinc-500">검색 결과가 없어요</Text>}
      {groups.map((group) => {
        if (group.results.length === 0 && !group.error) return null;
        return (
          <View key={group.type} className="gap-1">
            {showHeaders && (
              <Text className="pt-2 text-xs font-semibold text-zinc-500">{ENTRY_TYPE_LABELS[group.type]}</Text>
            )}
            {group.error && <Text className="py-1 text-sm text-red-600">{group.error}</Text>}
            {group.results.slice(0, limit).map((result) => (
              <Pressable
                key={result.externalId}
                onPress={() => onPick(result, group.type)}
                className="flex-row items-center gap-3 rounded-lg py-1.5 active:bg-zinc-100 dark:active:bg-zinc-900">
                <TypeTile type={group.type} thumbnail={result.thumbnail} size={36} />
                <View className="flex-1">
                  <Text numberOfLines={2} className="text-base text-zinc-900 dark:text-zinc-100">
                    {result.title}
                  </Text>
                  {result.subtitle !== "" && (
                    <Text numberOfLines={1} className="text-sm text-zinc-500">
                      {result.subtitle}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        );
      })}
      {extra && <Link label={extra.label} onPress={extra.onPress} />}
      {/* Always available: search only helps, manual entry is never blocked. */}
      <Link label="직접 입력하기" onPress={onManual} />
    </View>
  );
}
