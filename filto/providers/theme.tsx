import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemePreference = 'light' | 'dark' | 'system';
type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = '@filto/display_behavior/theme';

interface ThemeContextValue {
  mode: ThemeMode;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const AppThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemScheme = (useRNColorScheme() ?? 'light') as ThemeMode;

  const [preference, setPreference] = useState<ThemePreference>('system');
  const [mode, setMode] = useState<ThemeMode>(systemScheme);

  // 起動時に保存済みテーマを読み込む
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!isMounted) return;

        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setPreference(saved);
        }
      } catch {
        // 失敗時は何もしない（system のまま）
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // preference / systemScheme から実際の mode を決定
  useEffect(() => {
    if (preference === 'light' || preference === 'dark') {
      setMode(preference);
    } else {
      setMode(systemScheme);
    }
  }, [preference, systemScheme]);

  // preference を永続化
  useEffect(() => {
    const save = async () => {
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
      } catch {
        // 失敗しても致命的ではないので握りつぶす
      }
    };

    save();
  }, [preference]);

  const handleSetPreference = useCallback((pref: ThemePreference) => {
    setPreference(pref);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      preference,
      setPreference: handleSetPreference,
    }),
    [mode, preference, handleSetPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}

