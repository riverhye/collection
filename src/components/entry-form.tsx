import { useState } from "react";
import { ScrollView, Text, TextInput, View, type TextInputProps } from "react-native";

import { Chip } from "@/components/chip";
import { DateField } from "@/components/date-field";
import { TagInput } from "@/components/tag-input";
import {
  ENTRY_TYPE_LABELS,
  ENTRY_TYPES,
  type EntryInput,
  type EntryType,
  type EntryWithTags,
} from "@/domain/entry";
import { META_FIELDS } from "@/domain/meta-fields";

export type EntryDraft = {
  type: EntryType;
  title: string;
  source: string;
  url: string;
  thumbnail: string;
  tags: string[];
  experiencedDate: string | null;
  memo: string;
  meta: Record<string, string>;
};

export function emptyDraft(): EntryDraft {
  return {
    type: "etc",
    title: "",
    source: "",
    url: "",
    thumbnail: "",
    tags: [],
    experiencedDate: null,
    memo: "",
    meta: {},
  };
}

/** Meta values as form strings; arrays/objects stay out of the form and survive via draftToInput's previousMeta. */
export function metaToStrings(meta: object | null | undefined): Record<string, string> {
  const strings: Record<string, string> = {};
  for (const [key, value] of Object.entries(meta ?? {})) {
    if (typeof value === "string" || typeof value === "number") strings[key] = String(value);
  }
  return strings;
}

export function draftFromEntry(entry: EntryWithTags): EntryDraft {
  const meta = metaToStrings(entry.meta);
  return {
    type: entry.type,
    title: entry.title,
    source: entry.source ?? "",
    url: entry.url ?? "",
    thumbnail: entry.thumbnail ?? "",
    tags: entry.tags,
    experiencedDate: entry.experiencedDate,
    memo: entry.memo ?? "",
    meta,
  };
}

/** Converts form state to repository input. Keeps meta keys that the form doesn't show (e.g. tmdbId). */
export function draftToInput(draft: EntryDraft, previousMeta?: Record<string, unknown> | null): EntryInput {
  const meta: Record<string, unknown> = { ...previousMeta };
  for (const field of META_FIELDS[draft.type]) {
    const raw = draft.meta[field.key]?.trim();
    if (!raw) delete meta[field.key];
    else meta[field.key] = field.kind === "number" && !Number.isNaN(Number(raw)) ? Number(raw) : raw;
  }
  return {
    type: draft.type,
    title: draft.title.trim(),
    source: draft.source.trim() || null,
    url: draft.url.trim() || null,
    thumbnail: draft.thumbnail.trim() || null,
    tags: draft.tags,
    experiencedDate: draft.experiencedDate,
    memo: draft.memo.trim() || null,
    meta: Object.keys(meta).length > 0 ? meta : null,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</Text>
      {children}
    </View>
  );
}

function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#8B8D98"
      className="rounded-lg bg-zinc-100 px-3 py-2.5 text-base text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
      {...props}
    />
  );
}

type Props = {
  draft: EntryDraft;
  onChange: (draft: EntryDraft) => void;
  autoFocusTitle?: boolean;
  /** Rendered right under the title input (dedup hint). */
  titleAccessory?: React.ReactNode;
  /** Quick add: show only type + title until the user asks for more. */
  startCollapsed?: boolean;
  /** Show all fields regardless of startCollapsed (e.g. after picking a search result). */
  forceExpanded?: boolean;
  titlePlaceholder?: string;
};

export function EntryForm({
  draft,
  onChange,
  autoFocusTitle,
  titleAccessory,
  startCollapsed,
  forceExpanded,
  titlePlaceholder,
}: Props) {
  const [expanded, setExpanded] = useState(!startCollapsed);
  const showDetails = expanded || forceExpanded;
  const set = <K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) => onChange({ ...draft, [key]: value });

  return (
    <View className="gap-5">
      <Field label="종류">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {ENTRY_TYPES.map((type) => (
            <Chip
              key={type}
              label={ENTRY_TYPE_LABELS[type]}
              selected={draft.type === type}
              onPress={() => set("type", type)}
            />
          ))}
        </ScrollView>
      </Field>

      <Field label="제목">
        <Input
          value={draft.title}
          onChangeText={(v) => set("title", v)}
          placeholder={titlePlaceholder ?? "제목 (필수)"}
          autoFocus={autoFocusTitle}
          returnKeyType="done"
        />
        {titleAccessory}
      </Field>

      {showDetails ? (
        <>
          <Field label="태그">
            <TagInput value={draft.tags} onChange={(v) => set("tags", v)} />
          </Field>
          <Field label="본 날">
            <DateField value={draft.experiencedDate} onChange={(v) => set("experiencedDate", v)} />
          </Field>
          <Field label="메모">
            <Input
              value={draft.memo}
              onChangeText={(v) => set("memo", v)}
              placeholder="메모"
              multiline
              textAlignVertical="top"
              style={{ minHeight: 96 }}
            />
          </Field>
          <Field label="어디서">
            <Input
              value={draft.source}
              onChangeText={(v) => set("source", v)}
              placeholder="넷플릭스, 극장, 교보…"
            />
          </Field>
          <Field label="URL">
            <Input
              value={draft.url}
              onChangeText={(v) => set("url", v)}
              placeholder="https://"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </Field>
          {META_FIELDS[draft.type].map((field) => (
            <Field key={field.key} label={field.label}>
              <Input
                value={draft.meta[field.key] ?? ""}
                onChangeText={(v) => set("meta", { ...draft.meta, [field.key]: v })}
                keyboardType={field.kind === "number" ? "number-pad" : "default"}
                multiline={field.key === "summary"}
              />
            </Field>
          ))}
        </>
      ) : (
        <Text onPress={() => setExpanded(true)} className="text-base text-blue-600 dark:text-blue-400">
          자세히 입력
        </Text>
      )}
    </View>
  );
}
