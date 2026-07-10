/**
 * AsyncStorage のキー定義（唯一の情報源）
 *
 * キーを増やすときは必ずここに追加すること。文字列を各画面に直書きすると、
 * typo が黙って別キーになったり、リセット・バックアップの対象から漏れたりする。
 */

/**
 * 本アプリが保存するすべてのキーに付くプレフィックス。
 * resetAllData() はこのプレフィックスで一括削除するため、
 * ここから外れたキーを作るとリセットしても残ってしまう。
 */
export const STORAGE_KEY_PREFIX = '@filto/';

export const StorageKeys = {
  // 初期化・オンボーディング
  defaultFeedsSeeded: '@filto/defaultFeedsSeeded',
  defaultFiltersSeeded: '@filto/defaultFiltersSeeded',
  onboardingCompleted: '@filto/onboardingCompleted',

  // 同期
  lastSyncTime: '@filto/lastSyncTime',

  // データ管理
  articleRetentionDays: '@filto/data_management/articleRetentionDays',
  deleteStarredInAutoDelete: '@filto/data_management/deleteStarredInAutoDelete',
  wifiOnlyFetch: '@filto/data_management/wifiOnlyFetch',
  minRefreshIntervalMinutes: '@filto/data_management/minRefreshIntervalMinutes',

  // 表示と動作
  autoSyncOnStartup: '@filto/display_behavior/autoSyncOnStartup',
  language: '@filto/display_behavior/language',
  readDisplay: '@filto/display_behavior/readDisplay',
  theme: '@filto/display_behavior/theme',
  layoutMode: '@filto/display_behavior/layoutMode',

  // ホーム
  feedSort: '@filto/home/feedSort',

  // 初回ツアー（画面をまたぐ進行フラグ。消費時に削除される一時的な値）
  tourHome: '@filto/tour/home',
  tourFilters: '@filto/tour/filters',
  tourFilterEdit: '@filto/tour/filterEdit',
  tourFeeds: '@filto/tour/feeds',
  tourFeedAdd: '@filto/tour/feedAdd',
  tourFinish: '@filto/tour/finish',
  // satisfies により、STORAGE_KEY_PREFIX で始まらないキーはコンパイルエラーになる。
  // resetAllData() はプレフィックス走査で削除するため、この制約が破れると
  // 「リセットしても消えないキー」が生まれてしまう
} as const satisfies Record<string, `${typeof STORAGE_KEY_PREFIX}${string}`>;

/**
 * バックアップ／復元の対象にする設定キー。
 *
 * 端末やタイミングに依存する値は含めない:
 * - ツアーの進行フラグ（一時的）
 * - シード済みフラグ・オンボーディング完了フラグ（その端末の初期化状態）
 * - 最終同期時刻（復元先で誤って更新を抑制してしまうため）
 */
export const BACKUP_SETTING_KEYS = [
  StorageKeys.articleRetentionDays,
  StorageKeys.deleteStarredInAutoDelete,
  StorageKeys.wifiOnlyFetch,
  StorageKeys.minRefreshIntervalMinutes,
  StorageKeys.autoSyncOnStartup,
  StorageKeys.language,
  StorageKeys.readDisplay,
  StorageKeys.theme,
  StorageKeys.layoutMode,
  StorageKeys.feedSort,
] as const;
