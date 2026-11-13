import { Link, router, Stack } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { draftToInput, emptyDraft, EntryForm } from "@/components/entry-form";
import { createEntry, findByUrl, findSameTitle } from "@/data/entries";
import { ENTRY_TYPE_LABELS } from "@/domain/entry";
import { useDbQuery } from "@/hooks/use-db-query";

export default function NewEntryScreen() {
  const [draft, setDraft] = useState(emptyDraft);
  const [showSame, setShowSame] = useState(false);
  const sameTitle = useDbQuery(() => findSameTitle(draft.title));
  const canSave = draft.title.trim() !== "";

  const save = () => {
    if (!canSave) return;
    const input = draftToInput(draft);
    // Strong identifier match: open the existing entry instead; it offers "다른 작품이에요".
    const existing = findByUrl(input.url);
    if (existing) {
      router.replace({ pathname: "/entry/[id]", params: { id: existing.id, draft: JSON.stringify(input) } });
      return;
    }
    createEntry(input);
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text className="text-base text-zinc-900 dark:text-zinc-100">취소</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={save} disabled={!canSave} hitSlop={8}>
              <Text className={canSave ? "text-base font-semibold text-blue-600 dark:text-blue-400" : "text-base text-zinc-400"}>
                저장
              </Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-white dark:bg-black"
        contentContainerClassName="p-4 pb-16"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <EntryForm
          draft={draft}
          onChange={setDraft}
          autoFocusTitle
          startCollapsed
          titleAccessory={
            sameTitle.length > 0 && (
              <View className="gap-1">
                <Text onPress={() => setShowSame((v) => !v)} className="text-sm text-zinc-500">
                  제목이 같은 항목 {sameTitle.length}개 {showSame ? "▲" : "▼"}
                </Text>
                {showSame &&
                  sameTitle.map((e) => (
                    <Link key={e.id} href={{ pathname: "/entry/[id]", params: { id: e.id } }} asChild>
                      <Text className="text-sm text-blue-600 dark:text-blue-400">
                        {e.title} · {ENTRY_TYPE_LABELS[e.type]}
                        {e.experiencedDate ? ` · ${e.experiencedDate}` : ""}
                      </Text>
                    </Link>
                  ))}
              </View>
            )
          }
        />
      </ScrollView>
    </>
  );
}
