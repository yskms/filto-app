import { Alert } from 'react-native';

type TranslateFunction = (key: string, params?: Record<string, string | number>) => string;

/**
 * ErrorHandler
 * アプリ全体で統一的なエラー表示を提供
 */
export const ErrorHandler = {
  /**
   * データ読み込みエラー
   */
  showLoadError: (t: TranslateFunction) => {
    Alert.alert(t('common.error'), t('errors.loadFailed'));
  },

  /**
   * データベース操作エラー（保存・削除失敗）
   */
  showDatabaseError: (t: TranslateFunction, message: string) => {
    Alert.alert(t('common.error'), message);
  },

  /**
   * RSS同期エラー
   */
  showSyncError: (t: TranslateFunction) => {
    Alert.alert(t('common.error'), t('home.errorFetchingFeeds'));
  },

  /**
   * 汎用エラー（予期しないエラー）
   */
  showGenericError: (t: TranslateFunction, message: string) => {
    Alert.alert(t('common.error'), message);
  },
};
