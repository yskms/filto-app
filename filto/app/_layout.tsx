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
import FirstRunScreen from '@/components/FirstRunScreen';
import InitErrorScreen from '@/components/InitErrorScreen';
import { subscribeRestartOnboarding } from '@/utils/onboarding';
// import 時にバックグラウンドタスクが定義される（グローバルスコープ登録のため）
import { BackgroundSync } from '@/services/BackgroundSync';
import { initAds } from '@/services/adInit';

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
  const [initError, setInitError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setDbReady(false);
    setInitError(false);
    initDatabase()
      .then(isOnboardingComplete)
      .then((done) => {
        if (cancelled) return;
        setOnboardingDone(done);
        setDbReady(true);
      })
      .catch((e) => {
        if (cancelled) return;
        // 初期化失敗を握り潰さない。以前は onboardingDone=true にして seed を飛ばし、
        // 記事も設定も無い"壊れて見える"状態でホームを開いていた（新規インストールで発生）。
        // 明示的にエラー画面を出して再試行させる（多くは一時的失敗で再試行/再起動で回復）。
        console.warn('initDatabase failed', e);
        setInitError(true);
        setDbReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  // 保存済みの設定に合わせてバックグラウンド更新の登録状態を揃える（既定オン）
  useEffect(() => {
    BackgroundSync.syncRegistration();
  }, []);

  // 広告SDKの初期化（web版はadInit.tsのno-opフォールバックが解決される）
  useEffect(() => {
    initAds().catch(() => {});
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
          {initError
            ? <InitErrorScreen onRetry={() => setRetryCount((n) => n + 1)} />
            : onboardingDone
              ? <RootNavigation />
              : <FirstRunScreen onComplete={() => setOnboardingDone(true)} />}
        </ToastProvider>
      </LanguageProvider>
    </AppThemeProvider>
  );
}