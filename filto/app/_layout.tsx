import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { AppThemeProvider, useAppTheme } from '@/providers/theme';
import { LanguageProvider } from '@/providers/language';
import { ToastProvider } from '@/providers/toast';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase, isOnboardingComplete } from '@/database/init';
import OnboardingScreen from '@/components/OnboardingScreen';
import { subscribeRestartOnboarding } from '@/utils/onboarding';
// import 時にバックグラウンドタスクが定義される（グローバルスコープ登録のため）
import { BackgroundSync } from '@/services/BackgroundSync';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigation() {
  const { mode } = useAppTheme();
  const backgroundColor = mode === 'dark' ? '#151718' : '#fff';

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor }}>
      <NavigationThemeProvider value={mode === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            contentStyle: {
              backgroundColor,
            },
            headerStyle: {
              backgroundColor,
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      </NavigationThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(isOnboardingComplete)
      .then(setOnboardingDone)
      .catch(() => setOnboardingDone(true))
      .finally(() => setDbReady(true));
  }, []);

  // 保存済みの設定に合わせてバックグラウンド更新の登録状態を揃える（既定オン）
  useEffect(() => {
    BackgroundSync.syncRegistration();
  }, []);

  // 設定・データ管理からの「初回ガイドをやり直す」でオンボーディングを再表示する
  useEffect(() => subscribeRestartOnboarding(() => setOnboardingDone(false)), []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AppThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          {onboardingDone
            ? <RootNavigation />
            : <OnboardingScreen onComplete={() => setOnboardingDone(true)} />}
        </ToastProvider>
      </LanguageProvider>
    </AppThemeProvider>
  );
}