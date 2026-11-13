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
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip } from "@/components/chip";
import { EntryCalendar } from "@/components/entry-calendar";
import { EntryRow } from "@/components/entry-row";
import { EntryTile } from "@/components/entry-tile";
import {
  describeFilters,
  FilterSheet,
  hasFilters,
  NO_FILTERS,
  type CollectionFilters,
} from "@/components/filter-sheet";
import { Icon, ICONS, type IconName } from "@/components/icon";
import { BottomTabInset } from "@/constants/theme";
import { listEntries } from "@/data/entries";
import { getListView, setListView, type ListView } from "@/data/settings";
import { ENTRY_TYPE_LABELS, ENTRY_TYPES, type EntryType } from "@/domain/entry";
import { useDbQuery } from "@/hooks/use-db-query";

const VIEWS: { view: ListView; icon: IconName; label: string }[] = [
  { view: "list", icon: ICONS.list, label: "리스트" },
  { view: "grid", icon: ICONS.grid, label: "그리드" },
  { view: "calendar", icon: ICONS.calendar, label: "캘린더" },
];
/** One swipeable page per type (null = 전체); the chip row is their tab bar. */
const PAGES: (EntryType | null)[] = [null, ...ENTRY_TYPES];
const GRID_COLUMNS = 3;
const GRID_GAP = 12;
const SIDE_PADDING = 16;

type PageProps = {
  type: EntryType | null;
  search: string;
  filters: CollectionFilters;
  favoritesOnly: boolean;
  view: ListView;
  width: number;
  filtering: boolean;
};

function TypePage({ type, search, filters, favoritesOnly, view, width, filtering }: PageProps) {
  const items = useDbQuery(() =>
    listEntries({
      search,
      type,
      favoriteOnly: favoritesOnly,
      tagNames: filters.tagNames,
      tagMode: filters.tagMode,
      dateFrom: filters.dateRange?.from,
      dateTo: filters.dateRange?.to,
      genres: filters.genres,
    }),
  );
  const tileWidth = Math.floor((width - SIDE_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
  const bottomPadding = BottomTabInset + 96;

  if (view === "calendar") {
    return (
      <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={{ paddingTop: 8, paddingBottom: bottomPadding }}>
        <EntryCalendar entries={items} width={width - 16} />
      </ScrollView>
    );
  }

  return (
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
      contentContainerStyle={{ paddingTop: 8, paddingBottom: bottomPadding }}
      ListEmptyComponent={
        <View className="items-center gap-1 px-8 pt-24">
          <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            {filtering || type
              ? "조건에 맞는 항목이 없어요"
              : favoritesOnly
                ? "♥ 누른 항목이 없어요"
                : "아직 비어 있어요"}
          </Text>
          {!filtering && !type && !favoritesOnly && (
            <Text className="text-center text-sm text-zinc-500">+ 버튼으로 본 것, 읽은 것을 모아 보세요.</Text>
          )}
        </View>
      }
    />
  );
}

type Props = { title: string; favoritesOnly?: boolean };

export function CollectionScreen({ title, favoritesOnly = false }: Props) {
  const { width } = useWindowDimensions();
  const scheme = useColorScheme();
  const [view, setView] = useState<ListView>(getListView);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CollectionFilters>(NO_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
  const pager = useRef<ScrollViewInstance>(null);
  const chipScroll = useRef<ScrollViewInstance>(null);
  const chipX = useRef(new Map<number, number>());

  const filtering = search.trim() !== "" || hasFilters(filters);

  const showPage = (index: number, fromSwipe: boolean) => {
    setPage(index);
    if (!fromSwipe) pager.current?.scrollTo({ x: index * width, animated: true });
    const x = chipX.current.get(index);
    if (x != null) chipScroll.current?.scrollTo({ x: Math.max(0, x - 48), animated: true });
  };
  const chooseView = (next: ListView) => {
    setListView(next);
    setView(next);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white dark:bg-black">
      <View className="gap-3 px-4 pb-1 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{title}</Text>
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
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center gap-2 rounded-xl bg-zinc-100 px-3 dark:bg-zinc-900">
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
          <Pressable
            onPress={() => setSheetOpen(true)}
            accessibilityLabel="필터"
            className={`flex-row items-center gap-1.5 rounded-xl px-3 py-2.5 active:opacity-70 ${
              hasFilters(filters) ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-100 dark:bg-zinc-900"
            }`}
          >
            <Icon
              name={ICONS.filter}
              size={16}
              color={hasFilters(filters) ? (scheme === "dark" ? "#1C2024" : "#FFFFFF") : undefined}
            />
            <Text
              className={
                hasFilters(filters)
                  ? "text-base text-white dark:text-zinc-900"
                  : "text-base text-zinc-900 dark:text-zinc-100"
              }
            >
              필터
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={chipScroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12 flex-grow-0"
        contentContainerClassName="items-center gap-2 px-4 py-2"
      >
        {PAGES.map((t, i) => (
          <View key={t ?? "all"} onLayout={(e) => chipX.current.set(i, e.nativeEvent.layout.x)}>
            <Chip label={t ? ENTRY_TYPE_LABELS[t] : "전체"} selected={page === i} onPress={() => showPage(i, false)} />
          </View>
        ))}
      </ScrollView>

      {hasFilters(filters) && (
        <View className="flex-row items-center gap-2 px-4 pb-1">
          <Text
            onPress={() => setSheetOpen(true)}
            numberOfLines={1}
            className="flex-1 text-sm text-zinc-600 dark:text-zinc-400"
          >
            {describeFilters(filters)}
          </Text>
          <Pressable onPress={() => setFilters(NO_FILTERS)} hitSlop={10} accessibilityLabel="필터 지우기">
            <Icon name={ICONS.clear} size={16} color="#8B8D98" />
          </Pressable>
        </View>
      )}

      {/* Native horizontal paging: swipe between types; each page scrolls vertically on its own. */}
      <View className="flex-1" onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}>
        {pagerHeight > 0 && (
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              if (index !== page) showPage(index, true);
            }}
          >
            {PAGES.map((t, i) => (
              <View key={t ?? "all"} style={{ width, height: pagerHeight }}>
                {/* Only the current page and its neighbours run queries. */}
                {Math.abs(i - page) <= 1 && (
                  <TypePage
                    type={t}
                    search={search}
                    filters={filters}
                    favoritesOnly={favoritesOnly}
                    view={view}
                    width={width}
                    filtering={filtering}
                  />
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <Link href="/entry/new" asChild>
        <Pressable
          accessibilityLabel="추가"
          className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-zinc-900 shadow-lg active:opacity-80 dark:bg-zinc-100"
          style={{ bottom: BottomTabInset + 20 }}
        >
          <Icon name={ICONS.add} size={24} color={scheme === "dark" ? "#1C2024" : "#FFFFFF"} />
        </Pressable>
      </Link>

      <FilterSheet visible={sheetOpen} value={filters} onChange={setFilters} onClose={() => setSheetOpen(false)} />
    </SafeAreaView>
  );
}
