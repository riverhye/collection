import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { draftFromEntry, draftToInput, EntryForm, type EntryDraft } from "@/components/entry-form";
import { Icon, ICONS } from "@/components/icon";
import { TagInput } from "@/components/tag-input";
import { TypeTile } from "@/components/type-tile";
import { createEntry, deleteEntry, getEntry, setFavorite, updateEntry } from "@/data/entries";
import { getDetailMode } from "@/data/settings";
import { ENTRY_TYPE_LABELS, type EntryInput, type EntryWithTags } from "@/domain/entry";
import { metaRows } from "@/domain/meta-fields";
import { useDbQuery } from "@/hooks/use-db-query";
import { useSummary } from "@/hooks/use-summary";

function HeaderButton({ label, onPress, bold }: { label: string; onPress: () => void; bold?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text className={bold ? "text-base font-semibold text-blue-600 dark:text-blue-400" : "text-base text-blue-600 dark:text-blue-400"}>
        {label}
      </Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</Text>
      {children}
    </View>
  );
}

export default function EntryScreen() {
  const { id, draft: duplicateDraft } = useLocalSearchParams<{ id: string; draft?: string }>();
  const entry = useDbQuery(() => getEntry(id));
  const [editing, setEditing] = useState(() => getDetailMode() === "edit");
  const [draft, setDraft] = useState<EntryDraft | null>(() => (entry ? draftFromEntry(entry) : null));
  const summary = useSummary(entry);

  if (!entry) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-zinc-500">항목을 찾을 수 없어요</Text>
      </View>
    );
  }

  const startEdit = () => {
    setDraft(draftFromEntry(entry));
    setEditing(true);
  };
  const saveEdit = () => {
    if (!draft || draft.title.trim() === "") return;
    updateEntry(entry.id, draftToInput(draft, entry.meta as Record<string, unknown> | null));
    setEditing(false);
  };
  const saveAsSeparate = () => {
    if (!duplicateDraft) return;
    const newId = createEntry(JSON.parse(duplicateDraft) as EntryInput);
    router.replace({ pathname: "/entry/[id]", params: { id: newId } });
  };
  const confirmDelete = () =>
    Alert.alert("삭제할까요?", entry.title, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          deleteEntry(entry.id);
          router.back();
        },
      },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: editing ? () => <HeaderButton label="취소" onPress={() => setEditing(false)} /> : undefined,
          headerRight: () =>
            editing ? <HeaderButton label="완료" bold onPress={saveEdit} /> : <HeaderButton label="편집" onPress={startEdit} />,
        }}
      />
      <ScrollView
        className="flex-1 bg-white dark:bg-black"
        contentContainerClassName="gap-8 p-4 pb-16"
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets>
        {duplicateDraft && !editing && (
          <Pressable
            onPress={saveAsSeparate}
            className="self-start rounded-full bg-zinc-100 px-4 py-2 active:opacity-70 dark:bg-zinc-800">
            <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">다른 작품이에요 · 새로 저장</Text>
          </Pressable>
        )}
        {editing && draft ? <EntryForm draft={draft} onChange={setDraft} /> : <EntryView entry={entry} summary={summary} onDelete={confirmDelete} />}
      </ScrollView>
    </>
  );
}

function EntryView({
  entry,
  summary,
  onDelete,
}: {
  entry: EntryWithTags;
  summary: string | null;
  onDelete: () => void;
}) {
  const [memo, setMemo] = useState(entry.memo ?? "");
  const rows = metaRows(entry.type, (entry.meta ?? {}) as Record<string, unknown>);

  const saveMemo = () => {
    if (memo.trim() !== (entry.memo ?? "")) updateEntry(entry.id, { memo: memo.trim() || null });
  };

  return (
    <>
      {/* 기본 정보 */}
      <View className="flex-row gap-4">
        <TypeTile type={entry.type} thumbnail={entry.thumbnail} size={88} />
        <View className="flex-1 justify-center gap-2">
          <Text selectable className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {entry.title}
          </Text>
          <Text className="text-sm text-zinc-500">
            {[ENTRY_TYPE_LABELS[entry.type], entry.source].filter(Boolean).join(" · ")}
          </Text>
          <Pressable
            onPress={() => setFavorite(entry.id, !entry.favorite)}
            accessibilityLabel={entry.favorite ? "좋아요 취소" : "좋아요"}
            hitSlop={8}
            className="self-start">
            <Icon name={entry.favorite ? ICONS.heartFill : ICONS.heart} size={24} color={entry.favorite ? "#E5484D" : "#8B8D98"} />
          </Pressable>
        </View>
      </View>

      {/* 내가 추가 */}
      <Section title="내 기록">
        <TagInput value={entry.tags} onChange={(tags) => updateEntry(entry.id, { tags })} />
        <Text className="text-sm text-zinc-500">
          본 날 · {entry.experiencedDate ?? "기록 없음 (편집에서 추가)"}
        </Text>
        <TextInput
          value={memo}
          onChangeText={setMemo}
          onEndEditing={saveMemo}
          placeholder="메모 남기기"
          placeholderTextColor="#8B8D98"
          multiline
          className="rounded-lg bg-zinc-100 px-3 py-2.5 text-base text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
          style={{ minHeight: 80 }}
        />
      </Section>

      {/* 외부 정보 */}
      <Section title="정보">
        {rows.map((row) => (
          <View key={row.label} className="flex-row gap-3">
            <Text className="w-24 text-sm text-zinc-500">{row.label}</Text>
            <Text selectable className="flex-1 text-sm text-zinc-900 dark:text-zinc-100">
              {row.value}
            </Text>
          </View>
        ))}
        {summary && (
          <Text selectable className="text-sm leading-5 text-zinc-700 dark:text-zinc-300">
            {summary}
          </Text>
        )}
        <Text className="text-xs text-zinc-400">
          추가 {entry.createdAt.toLocaleDateString()} · 수정 {entry.updatedAt.toLocaleDateString()}
        </Text>
        <View className="flex-row gap-3 pt-2">
          {entry.url && (
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(entry.url!)}
              className="flex-row items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 active:opacity-70 dark:bg-zinc-800">
              <Icon name={ICONS.link} size={14} />
              <Text className="text-sm text-zinc-900 dark:text-zinc-100">원문 열기</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onDelete}
            className="flex-row items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 active:opacity-70 dark:bg-zinc-800">
            <Icon name={ICONS.trash} size={14} color="#E5484D" />
            <Text className="text-sm text-red-600">삭제</Text>
          </Pressable>
        </View>
      </Section>
    </>
  );
}
