import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Text, useColorScheme, View } from "react-native";
import "../global.css";

import { db } from "@/db/client";
import migrations from "@/db/migrations/migrations";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (success || error) SplashScreen.hideAsync();
  }, [success, error]);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-white p-6 dark:bg-black">
        <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">데이터베이스를 열지 못했어요</Text>
        <Text className="text-center text-sm text-zinc-500">{error.message}</Text>
      </View>
    );
  }
  if (!success) return null;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="entry/new" options={{ presentation: "modal", title: "추가" }} />
        <Stack.Screen name="entry/[id]" options={{ title: "", headerBackTitle: "수집함" }} />
      </Stack>
    </ThemeProvider>
  );
}
