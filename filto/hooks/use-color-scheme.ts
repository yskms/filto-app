import { useAppTheme } from '@/providers/theme';

/**
 * アプリ全体で使用するテーマモード（light/dark）を返すフック。
 * Display & Behavior のテーマ設定 + OS テーマを統合した結果を返す。
 */
export function useColorScheme() {
  const { mode } = useAppTheme();
  return mode;
}


