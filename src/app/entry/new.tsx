import { Link, router, Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, ScrollView, Text, View } from "react-native";

import { canSearch, getAdapter, resolveLink } from "@/adapters/registry";
import { STRONG_ID_KEYS, type SearchResult } from "@/adapters/types";
import { draftToInput, emptyDraft, EntryForm, metaToStrings, type EntryDraft } from "@/components/entry-form";
import { SearchResults } from "@/components/search-results";
import { TypeTile } from "@/components/type-tile";
import { createEntry, findByExternalId, findByUrl, findSameTitle } from "@/data/entries";
import { ENTRY_TYPE_LABELS, type EntryInput, type EntryType } from "@/domain/entry";
import { looksLikeLink, parseLink } from "@/domain/link";
import { useDbQuery } from "@/hooks/use-db-query";
import { useExternalSearch } from "@/hooks/use-external-search";

/** Strong-identifier match (external ID, then URL). */
function findDuplicate(input: EntryInput) {
  const type = input.type ?? "etc";
  const key = STRONG_ID_KEYS[type];
  const meta = (input.meta ?? {}) as Record<string, unknown>;
  return (key ? findByExternalId(type, key, meta[key]) : null) ?? findByUrl(input.url);
}

export default function NewEntryScreen() {
  const [draft, setDraft] = useState(emptyDraft);
  const [showSame, setShowSame] = useState(false);
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [manual, setManual] = useState(false);
  const [picking, setPicking] = useState(false);
  const [linkNote, setLinkNote] = useState<string | null>(null);

  // 기타 (the default) searches movies, TV and books at once; a type chip narrows it to one source.
  // YouTube is opt-in because its search quota is ~100 queries/day.
  const unified = draft.type === "etc";
  const searchTypes: EntryType[] = unified ? ["movie", "tv", "book"] : canSearch(draft.type) ? [draft.type] : [];
  const searching = searchTypes.length > 0 && !picked && !manual && !looksLikeLink(draft.title);
  const search = useExternalSearch(searchTypes, draft.title, searching);
  const sameTitle = useDbQuery(() => findSameTitle(draft.title));
  const canSave = draft.title.trim() !== "";

  const changeDraft = (next: EntryDraft) => {
    if (next.type !== draft.type) {
      setPicked(null);
      setManual(false);
    }
    setLinkNote(null);
    setDraft(next);
    if (next.title !== draft.title && looksLikeLink(next.title)) addFromLink(next);
  };

  // Existing entry: go there instead; it offers "다른 작품이에요" to save this draft separately.
  const openExisting = (id: string, input: EntryInput) =>
    router.replace({ pathname: "/entry/[id]", params: { id, draft: JSON.stringify(input) } });

  const pick = async (result: SearchResult, type: EntryType) => {
    const adapter = getAdapter(type);
    if (!adapter) return;
    Keyboard.dismiss();
    setPicking(true);
    let full = result;
    try {
      full = adapter.details ? await adapter.details(result) : result;
    } catch {
      // Keep what the search returned; details are optional.
    } finally {
      setPicking(false);
    }
    applyResult(full, type, draft);
  };

  /** A link pasted into the title box: YouTube/TMDB links fill everything; other sites keep the URL. */
  const addFromLink = async (base: EntryDraft) => {
    const link = parseLink(base.title);
    if (!link) return;
    Keyboard.dismiss();
    setPicking(true);
    let resolved: Awaited<ReturnType<typeof resolveLink>> = null;
    try {
      resolved = await resolveLink(link);
    } catch {
      // Fall through to keeping the URL.
    } finally {
      setPicking(false);
    }
    if (resolved) {
      applyResult(resolved.result, resolved.type, base);
      return;
    }
    setManual(true);
    setDraft({ ...base, type: link.kind === "web" ? "article" : base.type, url: link.url, title: "" });
    setLinkNote("링크에서 정보를 가져오지 못했어요. 링크는 저장했으니 제목을 입력하세요.");
  };

  const applyResult = (full: SearchResult, type: EntryType, base: EntryDraft) => {
    const next: EntryDraft = {
      ...base,
      type,
      title: full.title,
      url: full.url ?? "",
      thumbnail: full.thumbnail ?? "",
      meta: metaToStrings(full.meta),
    };
    const input = draftToInput(next, full.meta as Record<string, unknown>);
    const existing = findDuplicate(input);
    if (existing) {
      openExisting(existing.id, input);
      return;
    }
    setPicked(full);
    setDraft(next);
  };

  const save = () => {
    if (!canSave) return;
    const input = draftToInput(draft, picked?.meta as Record<string, unknown> | undefined);
    const existing = findDuplicate(input);
    if (existing) {
      openExisting(existing.id, input);
      return;
    }
    createEntry(input);
    router.back();
  };

  const sameTitleHint = sameTitle.length > 0 && (
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
  );

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
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets>
        <EntryForm
          draft={draft}
          onChange={changeDraft}
          autoFocusTitle
          startCollapsed
          forceExpanded={!!picked}
          titlePlaceholder={searchTypes.length > 0 && !picked ? "제목으로 검색 또는 링크 붙여넣기" : undefined}
          titleAccessory={
            <>
              {linkNote && <Text className="text-sm text-zinc-500">{linkNote}</Text>}
              {sameTitleHint}
              {picking && <ActivityIndicator className="py-2" />}
              {picked && (
                <View className="flex-row items-center gap-3 rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900">
                  <TypeTile type={draft.type} thumbnail={picked.thumbnail} size={36} />
                  <View className="flex-1">
                    <Text numberOfLines={1} className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {picked.title}
                    </Text>
                    <Text numberOfLines={1} className="text-sm text-zinc-500">
                      {picked.subtitle}
                    </Text>
                  </View>
                  <Text onPress={() => setPicked(null)} className="px-1 text-sm text-blue-600 dark:text-blue-400">
                    다시 검색
                  </Text>
                </View>
              )}
              {searching && !picking && draft.title.trim() !== "" && (
                <SearchResults
                  {...search}
                  limit={unified ? 4 : undefined}
                  onPick={pick}
                  onManual={() => setManual(true)}
                  extra={unified ? { label: "유튜브에서 찾기", onPress: () => changeDraft({ ...draft, type: "youtube" }) } : undefined}
                />
              )}
              {searchTypes.length > 0 && manual && (
                <Text onPress={() => setManual(false)} className="text-sm text-blue-600 dark:text-blue-400">
                  검색하기
                </Text>
              )}
            </>
          }
        />
      </ScrollView>
    </>
  );
}
