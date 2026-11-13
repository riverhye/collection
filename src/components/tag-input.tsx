import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { listTags } from "@/data/entries";
import { parseTags } from "@/domain/entry";
import { useDbQuery } from "@/hooks/use-db-query";

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
};

const MAX_SUGGESTIONS = 8;

function TagChip({ label, onPress, variant }: { label: string; onPress: () => void; variant: "tag" | "suggestion" }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      className={
        variant === "tag"
          ? "flex-row items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 active:opacity-70 dark:bg-zinc-100"
          : "flex-row items-center gap-1 rounded-full border border-zinc-300 px-3 py-1.5 active:opacity-70 dark:border-zinc-700"
      }>
      <Text
        className={
          variant === "tag" ? "text-sm text-white dark:text-zinc-900" : "text-sm text-zinc-700 dark:text-zinc-300"
        }>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Chip input: Return (or a comma) turns the typed text into a tag, backspace on an empty input removes
 * the last one. While focused, existing tags are suggested, most used first, filtered by the typed text.
 */
export function TagInput({ value, onChange }: Props) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const allTags = useDbQuery(listTags);

  const add = (raw: string) => {
    const added = parseTags(raw).filter((t) => !value.includes(t));
    if (added.length > 0) onChange([...value, ...added]);
    setText("");
  };
  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const changeText = (next: string) => {
    // A comma or newline commits everything typed before it.
    const cut = Math.max(next.lastIndexOf(","), next.lastIndexOf("\n"));
    if (cut === -1) return setText(next);
    add(next.slice(0, cut));
    setText(next.slice(cut + 1));
  };

  const query = text.trim().replace(/^#/, "").toLowerCase();
  const suggestions = allTags
    .filter((t) => !value.includes(t.name) && t.name.toLowerCase().includes(query))
    .slice(0, MAX_SUGGESTIONS);
  const isNew = query !== "" && !allTags.some((t) => t.name.toLowerCase() === query);

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap items-center gap-2 rounded-lg bg-zinc-100 px-2 py-1.5 dark:bg-zinc-900">
        {value.map((tag) => (
          <TagChip key={tag} label={`#${tag}  ✕`} variant="tag" onPress={() => remove(tag)} />
        ))}
        <TextInput
          value={text}
          onChangeText={changeText}
          onSubmitEditing={() => add(text)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === "Backspace" && text === "" && value.length > 0) remove(value[value.length - 1]);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            add(text);
          }}
          submitBehavior="submit"
          placeholder={value.length === 0 ? "태그 입력 후 Return" : "+ 태그"}
          placeholderTextColor="#8B8D98"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          className="min-w-24 flex-1 px-1 py-1 text-base text-zinc-900 dark:text-zinc-100"
        />
      </View>

      {focused && (suggestions.length > 0 || isNew) && (
        <View className="flex-row flex-wrap gap-2">
          {suggestions.map((t) => (
            <TagChip key={t.name} label={`#${t.name} ${t.count}`} variant="suggestion" onPress={() => add(t.name)} />
          ))}
          {isNew && <TagChip label={`+ "${text.trim().replace(/^#/, "")}" 새로 만들기`} variant="suggestion" onPress={() => add(text)} />}
        </View>
      )}
    </View>
  );
}
