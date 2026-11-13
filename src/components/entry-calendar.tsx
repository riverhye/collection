import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { EntryRow } from "@/components/entry-row";
import { Icon, ICONS } from "@/components/icon";
import { TypeTile } from "@/components/type-tile";
import { monthCells, toYmd } from "@/domain/date-range";
import type { EntryWithTags } from "@/domain/entry";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** Month view of entries by 본 날. Entries without 본 날 aren't shown here (PLAN §3). */
export function EntryCalendar({ entries, width }: { entries: EntryWithTags[]; width: number }) {
  const today = toYmd(new Date());
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(null);

  const byDay = new Map<string, EntryWithTags[]>();
  for (const e of entries) {
    if (e.experiencedDate) byDay.set(e.experiencedDate, [...(byDay.get(e.experiencedDate) ?? []), e]);
  }
  const cells = monthCells(month.year, month.month);
  const cellWidth = Math.floor(width / 7);
  const shift = (delta: number) => {
    setSelected(null);
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const selectedEntries = selected ? (byDay.get(selected) ?? []) : [];
  const monthCount = cells.reduce((n, day) => n + (day ? (byDay.get(day)?.length ?? 0) : 0), 0);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between px-4">
        <Pressable onPress={() => shift(-1)} hitSlop={12} accessibilityLabel="이전 달">
          <Icon name={ICONS.chevronLeft} size={18} />
        </Pressable>
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {month.year}년 {month.month + 1}월 · {monthCount}개
        </Text>
        <Pressable onPress={() => shift(1)} hitSlop={12} accessibilityLabel="다음 달">
          <Icon name={ICONS.chevronRight} size={18} />
        </Pressable>
      </View>

      <View className="flex-row flex-wrap px-2">
        {WEEKDAYS.map((w) => (
          <Text key={w} style={{ width: cellWidth }} className="pb-1 text-center text-xs text-zinc-500">
            {w}
          </Text>
        ))}
        {cells.map((day, i) => {
          if (!day) return <View key={`empty-${i}`} style={{ width: cellWidth, height: cellWidth * 1.25 }} />;
          const dayEntries = byDay.get(day) ?? [];
          const first = dayEntries[0];
          const isSelected = day === selected;
          return (
            <Pressable
              key={day}
              onPress={() => setSelected(isSelected ? null : day)}
              style={{ width: cellWidth, height: cellWidth * 1.25 }}
              className={`items-center gap-0.5 rounded-md pt-1 ${isSelected ? "bg-zinc-200 dark:bg-zinc-800" : ""}`}>
              <Text
                className={`text-xs ${day === today ? "font-bold text-blue-600 dark:text-blue-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                {Number(day.slice(8))}
              </Text>
              {first && (
                <View>
                  <TypeTile type={first.type} thumbnail={first.thumbnail} size={cellWidth * 0.55} />
                  {dayEntries.length > 1 && (
                    <View className="absolute -right-2 -top-1 rounded-full bg-zinc-900 px-1 dark:bg-zinc-100">
                      <Text className="text-[10px] text-white dark:text-zinc-900">{dayEntries.length}</Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {selected && (
        <View>
          <Text className="px-4 pb-1 text-sm font-medium text-zinc-500">{selected}</Text>
          {selectedEntries.length === 0 ? (
            <Text className="px-4 text-sm text-zinc-400">이 날 기록이 없어요</Text>
          ) : (
            selectedEntries.map((e) => <EntryRow key={e.id} entry={e} />)
          )}
        </View>
      )}
      {monthCount === 0 && !selected && (
        <Text className="px-4 text-center text-sm text-zinc-400">
          이 달에 본 날이 기록된 항목이 없어요.{"\n"}항목의 &apos;본 날&apos;을 추가하면 여기에 보여요.
        </Text>
      )}
    </View>
  );
}
