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
import { initDatabase, seedDefaultFeeds, seedDefaultFilters } from '@/database/init';

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

  useEffect(() => {
    initDatabase()
      .then(() => seedDefaultFeeds())
      .then(() => seedDefaultFilters())
      .catch(() => {})
      .finally(() => setDbReady(true));
  }, []);

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
          <RootNavigation />
        </ToastProvider>
      </LanguageProvider>
    </AppThemeProvider>
  );
}