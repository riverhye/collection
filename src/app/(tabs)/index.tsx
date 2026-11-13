import { Link } from "expo-router";
import { useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip } from "@/components/chip";
import { DateFilter } from "@/components/date-filter";
import { EntryCalendar } from "@/components/entry-calendar";
import { EntryRow } from "@/components/entry-row";
import { EntryTile } from "@/components/entry-tile";
import { Icon, ICONS, type IconName } from "@/components/icon";
import { BottomTabInset } from "@/constants/theme";
import { listEntries, listTags } from "@/data/entries";
import { getListView, setListView, type ListView } from "@/data/settings";
import type { DateRange } from "@/domain/date-range";
import { ENTRY_TYPE_LABELS, ENTRY_TYPES, type EntryType } from "@/domain/entry";
import { useDbQuery } from "@/hooks/use-db-query";

const VIEWS: { view: ListView; icon: IconName; label: string }[] = [
  { view: "list", icon: ICONS.list, label: "리스트" },
  { view: "grid", icon: ICONS.grid, label: "그리드" },
  { view: "calendar", icon: ICONS.calendar, label: "캘린더" },
];
/** Swiping the list steps through these, same as tapping the type chips (null = 전체). */
const TYPE_ORDER: (EntryType | null)[] = [null, ...ENTRY_TYPES];
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 500;
const GRID_COLUMNS = 3;
const GRID_GAP = 12;
const SIDE_PADDING = 16;

export default function CollectionScreen() {
  const { width } = useWindowDimensions();
  const scheme = useColorScheme();
  const [view, setView] = useState<ListView>(getListView);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<EntryType | null>(null);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"and" | "or">("and");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);

  const chipScroll = useRef<ScrollViewInstance>(null);
  const chipX = useRef(new Map<EntryType | null, number>());

  const selectType = (next: EntryType | null) => {
    setType(next);
    // Keep the selected chip in view when the change came from a swipe.
    const x = chipX.current.get(next);
    if (x != null) chipScroll.current?.scrollTo({ x: Math.max(0, x - 48), animated: true });
  };

  // Horizontal swipe on the list = tap the next/previous type chip. Vertical moves fail it, so scrolling still works.
  const swipe = usePanGesture({
    activeOffsetX: [-25, 25],
    failOffsetY: [-15, 15],
    runOnJS: true,
    onDeactivate: (e) => {
      if (e.canceled) return;
      if (Math.abs(e.translationX) < SWIPE_DISTANCE && Math.abs(e.velocityX) < SWIPE_VELOCITY) return;
      const i = TYPE_ORDER.indexOf(type);
      const next = TYPE_ORDER[i + (e.translationX < 0 ? 1 : -1)];
      if (next !== undefined) selectType(next);
    },
  });

  const items = useDbQuery(() =>
    listEntries({
      search,
      type,
      favoriteOnly,
      tagNames,
      tagMode,
      dateFrom: dateRange?.from,
      dateTo: dateRange?.to,
    }),
  );
  const allTags = useDbQuery(listTags);

  const filtering = search.trim() !== "" || type !== null || favoriteOnly || tagNames.length > 0 || dateRange !== null;
  const toggleTag = (name: string) =>
    setTagNames((prev) => (prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]));
  const chooseView = (next: ListView) => {
    setListView(next);
    setView(next);
  };
  const tileWidth = Math.floor((width - SIDE_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
  const bottomPadding = BottomTabInset + 96;

  const header = (
    <>
      <ScrollView
        ref={chipScroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12 flex-grow-0"
        contentContainerClassName="items-center gap-2 px-4 py-2"
      >
        <Chip label="♥" selected={favoriteOnly} onPress={() => setFavoriteOnly((v) => !v)} />
        <Chip
          label={dateRange ? `${dateRange.from.slice(2)} ~ ${dateRange.to.slice(2)}` : "기간"}
          selected={dateRange !== null || showDateFilter}
          onPress={() => setShowDateFilter((v) => !v)}
        />
        <View onLayout={(e) => chipX.current.set(null, e.nativeEvent.layout.x)}>
          <Chip label="전체" selected={type === null} onPress={() => selectType(null)} />
        </View>
        {ENTRY_TYPES.map((t) => (
          <View key={t} onLayout={(e) => chipX.current.set(t, e.nativeEvent.layout.x)}>
            <Chip
              label={ENTRY_TYPE_LABELS[t]}
              selected={type === t}
              onPress={() => selectType(type === t ? null : t)}
            />
          </View>
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
      {showDateFilter && <DateFilter value={dateRange} onChange={setDateRange} />}
    </>
  );

  const empty = (
    <View className="items-center gap-1 px-8 pt-24">
      <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        {filtering ? "조건에 맞는 항목이 없어요" : "아직 비어 있어요"}
      </Text>
      {!filtering && (
        <Text className="text-center text-sm text-zinc-500">+ 버튼으로 본 것, 읽은 것을 모아 보세요.</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white dark:bg-black">
      <View className="gap-3 px-4 pb-2 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">수집함</Text>
          <View className="flex-row gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
            {VIEWS.map((v) => (
              <Pressable
                key={v.view}
                onPress={() => chooseView(v.view)}
                accessibilityLabel={v.label}
                accessibilityState={{ selected: view === v.view }}
                className={`rounded-md px-2.5 py-1.5 ${view === v.view ? "bg-white dark:bg-zinc-700" : ""}`}
              >
                <Icon name={v.icon} size={16} color={view === v.view ? undefined : "#8B8D98"} />
              </Pressable>
            ))}
          </View>
        </View>
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

      {header}

      <GestureDetector gesture={swipe}>
        <View className="flex-1">
          {view === "calendar" ? (
            <ScrollView
              keyboardDismissMode="on-drag"
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={{ paddingBottom: bottomPadding }}
            >
              <EntryCalendar entries={items} width={width - 16} />
            </ScrollView>
          ) : (
            <FlatList
              // numColumns can't change on a mounted FlatList, so remount per view.
              key={view}
              data={items}
              keyExtractor={(item) => item.id}
              numColumns={view === "grid" ? GRID_COLUMNS : 1}
              columnWrapperStyle={view === "grid" ? { gap: GRID_GAP, paddingHorizontal: SIDE_PADDING } : undefined}
              renderItem={({ item }) =>
                view === "grid" ? <EntryTile entry={item} width={tileWidth} /> : <EntryRow entry={item} />
              }
              ItemSeparatorComponent={view === "grid" ? () => <View style={{ height: GRID_GAP + 4 }} /> : undefined}
              keyboardDismissMode="on-drag"
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={{ paddingBottom: bottomPadding }}
              ListEmptyComponent={empty}
            />
          )}
        </View>
      </GestureDetector>

      <Link href="/entry/new" asChild>
        <Pressable
          accessibilityLabel="추가"
          className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-zinc-900 shadow-lg active:opacity-80 dark:bg-zinc-100"
          style={{ bottom: BottomTabInset + 20 }}
        >
          <Icon name={ICONS.add} size={24} color={scheme === "dark" ? "#1C2024" : "#FFFFFF"} />
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}
