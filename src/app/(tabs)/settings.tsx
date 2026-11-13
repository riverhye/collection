import Constants from "expo-constants";
import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip } from "@/components/chip";
import { getDetailMode, setDetailMode, type DetailMode } from "@/data/settings";

export default function SettingsScreen() {
  const [detailMode, setMode] = useState<DetailMode>(getDetailMode);

  const choose = (mode: DetailMode) => {
    setDetailMode(mode);
    setMode(mode);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 gap-6 bg-white px-4 pt-2 dark:bg-black">
      <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">설정</Text>

      <View className="gap-2">
        <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">항목을 열 때</Text>
        <View className="flex-row gap-2">
          <Chip label="보기" selected={detailMode === "view"} onPress={() => choose("view")} />
          <Chip label="편집" selected={detailMode === "edit"} onPress={() => choose("edit")} />
        </View>
      </View>

      <Text className="text-sm text-zinc-500">버전 {Constants.expoConfig?.version}</Text>
    </SafeAreaView>
  );
}
