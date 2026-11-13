import { Link } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip } from "@/components/chip";
import { EntryRow } from "@/components/entry-row";
import { Icon, ICONS } from "@/components/icon";
import { BottomTabInset } from "@/constants/theme";
import { listEntries, listTags } from "@/data/entries";
import { ENTRY_TYPE_LABELS, ENTRY_TYPES, type EntryType } from "@/domain/entry";
import { useDbQuery } from "@/hooks/use-db-query";

export default function CollectionScreen() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<EntryType | null>(null);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"and" | "or">("and");

  const items = useDbQuery(() => listEntries({ search, type, favoriteOnly, tagNames, tagMode }));
  const allTags = useDbQuery(listTags);

  const filtering = search.trim() !== "" || type !== null || favoriteOnly || tagNames.length > 0;
  const toggleTag = (name: string) =>
    setTagNames((prev) => (prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]));

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white dark:bg-black">
      <View className="gap-3 px-4 pb-2 pt-2">
        <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">수집함</Text>
        <View className="flex-row items-center gap-2 rounded-xl bg-zinc-100 px-3 dark:bg-zinc-900">
          <Icon name={ICONS.search} size={16} color="#8B8D98" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="제목, 메모, 태그 검색"
            placeholderTextColor="#8B8D98"
            returnKeyType="search"
            clearButtonMode="while-editing"
            className="flex-1 py-2.5 text-base text-zinc-900 dark:text-zinc-100"
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12 flex-grow-0"
        contentContainerClassName="items-center gap-2 px-4 py-2">
        <Chip label="♥" selected={favoriteOnly} onPress={() => setFavoriteOnly((v) => !v)} />
        {ENTRY_TYPES.map((t) => (
          <Chip
            key={t}
            label={ENTRY_TYPE_LABELS[t]}
            selected={type === t}
            onPress={() => setType((cur) => (cur === t ? null : t))}
          />
        ))}
        {allTags.length > 0 && <View className="mx-1 h-5 w-px bg-zinc-300 dark:bg-zinc-700" />}
        {tagNames.length > 1 && (
          <Chip
            label={tagMode === "and" ? "모두 포함" : "하나라도"}
            onPress={() => setTagMode((m) => (m === "and" ? "or" : "and"))}
          />
        )}
        {allTags.map((tag) => (
          <Chip
            key={tag.name}
            label={`#${tag.name} ${tag.count}`}
            selected={tagNames.includes(tag.name)}
            onPress={() => toggleTag(tag.name)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EntryRow entry={item} />}
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: BottomTabInset + 96 }}
        ListEmptyComponent={
          <View className="items-center gap-1 px-8 pt-24">
            <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              {filtering ? "조건에 맞는 항목이 없어요" : "아직 비어 있어요"}
            </Text>
            {!filtering && (
              <Text className="text-center text-sm text-zinc-500">
                + 버튼으로 본 것, 읽은 것을 모아 보세요.
              </Text>
            )}
          </View>
        }
      />

      <Link href="/entry/new" asChild>
        <Pressable
          accessibilityLabel="추가"
          className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-zinc-900 shadow-lg active:opacity-80 dark:bg-zinc-100"
          style={{ bottom: BottomTabInset + 20 }}>
          <Icon name={ICONS.add} size={24} color="#FFFFFF" />
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}
