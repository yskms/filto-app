import { Alert } from 'react-native';

/**
 * ErrorHandler
 * アプリ全体で統一的なエラー表示を提供
 */
export const ErrorHandler = {
  /**
   * ネットワークエラー（接続失敗、タイムアウトなど）
   */
  showNetworkError: (details?: string) => {
    const message = details
      ? `ネットワーク接続を確認してください\n\n${details}`
      : 'ネットワーク接続を確認してください';
    Alert.alert('通信エラー', message);
  },

  /**
   * データベースエラー（保存・読み込み失敗）
   */
  showDatabaseError: (operation?: string) => {
    const message = operation
      ? `${operation}に失敗しました`
      : 'データの保存に失敗しました';
    Alert.alert('エラー', message);
  },

  /**
   * RSSフィード取得エラー
   */
  showRssError: (feedName?: string) => {
    const message = feedName
      ? `${feedName}の取得に失敗しました。\nフィードURLが正しいか確認してください。`
      : 'フィードの取得に失敗しました。\nフィードURLが正しいか確認してください。';
    Alert.alert('取得エラー', message);
  },

  /**
   * RSS同期エラー（複数フィードの同期失敗）
   */
  showSyncError: () => {
    Alert.alert('同期エラー', 'RSS同期に失敗しました。\nしばらくしてから再度お試しください。');
  },

  /**
   * 入力バリデーションエラー
   */
  showValidationError: (field: string, reason?: string) => {
    const message = reason
      ? `${field}: ${reason}`
      : `${field}を正しく入力してください`;
    Alert.alert('入力エラー', message);
  },

  /**
   * データ読み込みエラー
   */
  showLoadError: (dataType?: string) => {
    const message = dataType
      ? `${dataType}の読み込みに失敗しました`
      : 'データの読み込みに失敗しました';
    Alert.alert('エラー', message);
  },

  /**
   * 汎用エラー（予期しないエラー）
   */
  showGenericError: (message?: string) => {
    Alert.alert('エラー', message || '予期しないエラーが発生しました');
  },

  /**
   * 重複エラー
   */
  showDuplicateError: (itemType: string) => {
    Alert.alert('重複エラー', `この${itemType}は既に登録されています`);
  },

  /**
   * Pro版制限エラー
   */
  showProLimitError: (featureName: string, limit: number) => {
    Alert.alert(
      'Pro版限定',
      `無料版では${featureName}は${limit}件までです。\n\nPro版にアップグレードすると無制限に利用できます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'Pro版について', onPress: () => {/* TODO: Pro版画面へ遷移 */} },
      ]
    );
  },
};
