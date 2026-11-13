import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

type Props = {
  /** YYYY-MM-DD or null */
  value: string | null;
  onChange: (value: string | null) => void;
};

function toDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toYmd(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function DateField({ value, onChange }: Props) {
  const [androidOpen, setAndroidOpen] = useState(false);

  if (!value) {
    return (
      <Pressable onPress={() => onChange(toYmd(new Date()))} className="self-start py-1 active:opacity-60">
        <Text className="text-base text-blue-600 dark:text-blue-400">날짜 추가</Text>
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
          maximumDate={new Date()}
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
              maximumDate={new Date()}
              onValueChange={(_, date) => {
                setAndroidOpen(false);
                onChange(toYmd(date));
              }}
              onDismiss={() => setAndroidOpen(false)}
            />
          )}
        </>
      )}
      <Pressable onPress={() => onChange(null)} className="py-1 active:opacity-60">
        <Text className="text-sm text-zinc-500">지우기</Text>
      </Pressable>
    </View>
  );
}
