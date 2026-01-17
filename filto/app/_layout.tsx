import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Paths, File, Directory } from 'expo-file-system';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from '@/database/init';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

