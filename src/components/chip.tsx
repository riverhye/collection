import { Pressable, Text } from "react-native";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={
        selected
          ? "rounded-full bg-zinc-900 px-3.5 py-1.5 dark:bg-zinc-100"
          : "rounded-full bg-zinc-100 px-3.5 py-1.5 active:opacity-70 dark:bg-zinc-800"
      }>
      <Text
        className={
          selected
            ? "text-sm font-medium text-white dark:text-zinc-900"
            : "text-sm text-zinc-700 dark:text-zinc-300"
        }>
        {label}
      </Text>
    </Pressable>
  );
}
