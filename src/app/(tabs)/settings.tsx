import Constants from "expo-constants";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip } from "@/components/chip";
import { exportBackup, pickBackup, restoreBackup } from "@/data/backup";
import { getDetailMode, getLastBackupAt, setDetailMode, type DetailMode } from "@/data/settings";

function Button({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className="flex-row items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-3 active:opacity-70 dark:bg-zinc-900">
      {busy && <ActivityIndicator size="small" />}
      <Text className="text-base text-zinc-900 dark:text-zinc-100">{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const [detailMode, setMode] = useState<DetailMode>(getDetailMode);
  const [lastBackup, setLastBackup] = useState(getLastBackupAt);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);

  const choose = (mode: DetailMode) => {
    setDetailMode(mode);
    setMode(mode);
  };

  const runExport = async () => {
    setBusy("export");
    try {
      await exportBackup();
      setLastBackup(getLastBackupAt());
    } catch (e) {
      Alert.alert("내보내지 못했어요", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const runImport = async () => {
    setBusy("import");
    let items: Awaited<ReturnType<typeof pickBackup>>;
    try {
      items = await pickBackup();
    } catch (e) {
      Alert.alert("불러오지 못했어요", (e as Error).message);
      return;
    } finally {
      setBusy(null);
    }
    if (!items) return;
    Alert.alert(
      `${items.length}개 항목을 불러올까요?`,
      "새 항목은 추가하고, 이미 있는 항목은 더 최근에 수정된 쪽을 남겨요. 지우는 항목은 없어요.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "불러오기",
          onPress: () => {
            const r = restoreBackup(items);
            Alert.alert("불러오기 완료", `추가 ${r.added}개 · 업데이트 ${r.updated}개 · 그대로 ${r.skipped}개`);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white dark:bg-black">
      <ScrollView contentContainerClassName="gap-8 px-4 pb-32 pt-2">
        <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">설정</Text>

        <View className="gap-2">
          <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">항목을 열 때</Text>
          <View className="flex-row gap-2">
            <Chip label="보기" selected={detailMode === "view"} onPress={() => choose("view")} />
            <Chip label="편집" selected={detailMode === "edit"} onPress={() => choose("edit")} />
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">백업</Text>
          <Text className="text-sm leading-5 text-zinc-500">
            기록은 이 폰 안에만 있어요. Expo Go를 지우거나 폰을 바꾸면 사라지니, 가끔 백업 파일을 파일 앱이나 iCloud
            Drive에 저장해 두세요.
          </Text>
          <Button label="백업 내보내기" onPress={runExport} busy={busy === "export"} />
          <Button label="백업 불러오기" onPress={runImport} busy={busy === "import"} />
          <Text className="text-xs text-zinc-400">
            마지막 내보내기: {lastBackup ? lastBackup.toLocaleString() : "없음"}
          </Text>
        </View>

        <Text className="text-sm text-zinc-500">버전 {Constants.expoConfig?.version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
