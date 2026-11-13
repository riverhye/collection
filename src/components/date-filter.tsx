import { Text, View } from "react-native";

import { Chip } from "@/components/chip";
import { DateField } from "@/components/date-field";
import { DATE_PRESET_LABELS, DATE_PRESETS, presetRange, toYmd, type DateRange } from "@/domain/date-range";

type Props = {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
};

/** Range on 본 날 (or the day an entry was added when 본 날 is empty). */
export function DateFilter({ value, onChange }: Props) {
  const today = toYmd(new Date());
  const matches = (r: DateRange) => value?.from === r.from && value?.to === r.to;

  return (
    <View className="gap-3 px-4 pb-2">
      <View className="flex-row flex-wrap gap-2">
        <Chip label="전체" selected={value === null} onPress={() => onChange(null)} />
        {DATE_PRESETS.map((preset) => {
          const range = presetRange(preset);
          return (
            <Chip
              key={preset}
              label={DATE_PRESET_LABELS[preset]}
              selected={matches(range)}
              onPress={() => onChange(range)}
            />
          );
        })}
      </View>
      <View className="flex-row flex-wrap items-center gap-2">
        <DateField
          value={value?.from ?? null}
          emptyLabel="시작일"
          required
          maximumDate={null}
          onChange={(from) => from && onChange({ from, to: value?.to ?? today })}
        />
        <Text className="text-zinc-500">~</Text>
        <DateField
          value={value?.to ?? null}
          emptyLabel="종료일"
          required
          maximumDate={null}
          onChange={(to) => to && onChange({ from: value?.from ?? to, to })}
        />
      </View>
      <Text className="text-xs text-zinc-400">본 날 기준 · 본 날이 없으면 추가한 날로 계산해요</Text>
    </View>
  );
}
