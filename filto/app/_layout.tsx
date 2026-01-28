import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Paths, File, Directory } from 'expo-file-system';

import { AppThemeProvider, useAppTheme } from '@/providers/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from '@/database/init';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigation() {
  const { mode } = useAppTheme();
  
  useEffect(() => {
    const resetAndInitDatabase = async () => {
      // 🚨 開発中のみ: DBファイルを確実に削除
      // ⚠️ リリース前に必ずこのコードを削除すること
      
      const dbDir = new Directory(Paths.document, 'SQLite');
      const dbFile = new File(dbDir, 'filto.db');
      
      try {
        // DBファイルが存在するか確認して削除
        if (dbFile.exists) {
          await dbFile.delete();
          console.log('✅ Database file deleted:', dbFile.uri);
        } else {
          console.log('ℹ️ Database file does not exist:', dbFile.uri);
        }
      } catch (error) {
        console.log('⚠️ Error deleting database:', error);
      }
      
      // テーブルを作成
      await initDatabase();
      console.log('✅ Database initialized');
    };
    
    resetAndInitDatabase().catch((error) => {
      console.error('❌ Failed to reset and initialize database:', error);
    });
  }, []);

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
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      </NavigationThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootNavigation />
    </AppThemeProvider>
  );
}