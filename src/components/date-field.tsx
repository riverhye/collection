import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { fromYmd as toDate, toYmd } from "@/domain/date-range";

type Props = {
  /** YYYY-MM-DD or null */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Label for the button shown while empty. */
  emptyLabel?: string;
  /** Hide "지우기" (for fields that must keep a value). */
  required?: boolean;
  /** Latest selectable day; defaults to today (본 날 can't be in the future). null = no limit. */
  maximumDate?: Date | null;
};

export function DateField({ value, onChange, emptyLabel = "날짜 추가", required, maximumDate = new Date() }: Props) {
  const [androidOpen, setAndroidOpen] = useState(false);

  if (!value) {
    return (
      <Pressable onPress={() => onChange(toYmd(new Date()))} className="self-start py-1 active:opacity-60">
        <Text className="text-base text-blue-600 dark:text-blue-400">{emptyLabel}</Text>
      </Pressable>
    );
  }

  return (
    <View className="flex-row items-center gap-3">
      {Platform.OS === "ios" ? (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display="compact"
          maximumDate={maximumDate ?? undefined}
          onValueChange={(_, date) => onChange(toYmd(date))}
        />
      ) : (
        <>
          <Pressable onPress={() => setAndroidOpen(true)} className="py-1 active:opacity-60">
            <Text className="text-base text-zinc-900 dark:text-zinc-100">{value}</Text>
          </Pressable>
          {androidOpen && (
            <DateTimePicker
              value={toDate(value)}
              mode="date"
              maximumDate={maximumDate ?? undefined}
              onValueChange={(_, date) => {
                setAndroidOpen(false);
                onChange(toYmd(date));
              }}
              onDismiss={() => setAndroidOpen(false)}
            />
          )}
        </>
      )}
      {!required && (
        <Pressable onPress={() => onChange(null)} className="py-1 active:opacity-60">
          <Text className="text-sm text-zinc-500">지우기</Text>
        </Pressable>
      )}
    </View>
  );
}
