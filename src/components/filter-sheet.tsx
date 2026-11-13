import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Chip } from "@/components/chip";
import { DateFilter } from "@/components/date-filter";
import { listGenres, listTags } from "@/data/entries";
import type { DateRange } from "@/domain/date-range";
import { useDbQuery } from "@/hooks/use-db-query";

export type CollectionFilters = {
  tagNames: string[];
  tagMode: "and" | "or";
  dateRange: DateRange | null;
  genres: string[];
};

export const NO_FILTERS: CollectionFilters = { tagNames: [], tagMode: "and", dateRange: null, genres: [] };

export function hasFilters(f: CollectionFilters) {
  return f.tagNames.length > 0 || f.dateRange !== null || f.genres.length > 0;
}

/** One-line summary of the active filters, e.g. "#인생작 #재관람(모두) · 26.03.01~26.03.31 · 드라마". */
export function describeFilters(f: CollectionFilters): string {
  const parts: string[] = [];
  if (f.tagNames.length > 0) {
    const tags = f.tagNames.map((t) => `#${t}`).join(" ");
    parts.push(f.tagNames.length > 1 ? `${tags} (${f.tagMode === "and" ? "모두" : "하나라도"})` : tags);
  }
  if (f.dateRange)
    parts.push(`${f.dateRange.from.slice(2).replaceAll("-", ".")}~${f.dateRange.to.slice(2).replaceAll("-", ".")}`);
  if (f.genres.length > 0) parts.push(f.genres.join(", "));
  return parts.join(" · ");
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold text-zinc-500">{title}</Text>
      {children}
    </View>
  );
}

type Props = {
  visible: boolean;
  value: CollectionFilters;
  onChange: (value: CollectionFilters) => void;
  onClose: () => void;
};

export function FilterSheet({ visible, value, onChange, onClose }: Props) {
  const tags = useDbQuery(listTags);
  const genres = useDbQuery(listGenres);
  const set = (patch: Partial<CollectionFilters>) => onChange({ ...value, ...patch });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white dark:bg-zinc-950">
        <View className="flex-row items-center justify-between px-4 py-4">
          <Pressable onPress={() => onChange(NO_FILTERS)} hitSlop={8} disabled={!hasFilters(value)}>
            <Text
              className={hasFilters(value) ? "text-base text-blue-600 dark:text-blue-400" : "text-base text-zinc-400"}
            >
              초기화
            </Text>
          </Pressable>
          <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">필터</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text className="text-base font-semibold text-blue-600 dark:text-blue-400">완료</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="gap-8 px-4 pb-16">
          <Section title="태그">
            {tags.length === 0 ? (
              <Text className="text-sm text-zinc-400">아직 태그가 없어요</Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {tags.map((t) => (
                  <Chip
                    key={t.name}
                    label={`#${t.name} ${t.count}`}
                    selected={value.tagNames.includes(t.name)}
                    onPress={() => set({ tagNames: toggle(value.tagNames, t.name) })}
                  />
                ))}
              </View>
            )}
            {value.tagNames.length > 1 && (
              <View className="flex-row gap-2">
                <Chip label="모두 포함" selected={value.tagMode === "and"} onPress={() => set({ tagMode: "and" })} />
                <Chip label="하나라도" selected={value.tagMode === "or"} onPress={() => set({ tagMode: "or" })} />
              </View>
            )}
          </Section>

          <Section title="기간">
            <View className="-mx-4">
              <DateFilter value={value.dateRange} onChange={(dateRange) => set({ dateRange })} />
            </View>
          </Section>

          <Section title="장르">
            {genres.length === 0 ? (
              <Text className="text-sm text-zinc-400">검색으로 추가한 영화·TV에 장르가 붙어요</Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {genres.map((g) => (
                  <Chip
                    key={g.name}
                    label={`${g.name} ${g.count}`}
                    selected={value.genres.includes(g.name)}
                    onPress={() => set({ genres: toggle(value.genres, g.name) })}
                  />
                ))}
              </View>
            )}
          </Section>
        </ScrollView>
      </View>
    </Modal>
  );
}
