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
  // サイト非表示の提案を「あとで」で断ったフィードと時刻のマップ（JSON）。一定期間は再提案しない。
  siteSuggestDismissed: '@filto/siteSuggestDismissed',
  // オンボーディング完了直後に立て、タブ側の初回取得（ブートストラップ）で消費する一時フラグ
  pendingInitialFetch: '@filto/pendingInitialFetch',

  // 同期
  lastSyncTime: '@filto/lastSyncTime',

  // データ管理
  articleRetentionDays: '@filto/data_management/articleRetentionDays',
  deleteStarredInAutoDelete: '@filto/data_management/deleteStarredInAutoDelete',
  wifiOnlyFetch: '@filto/data_management/wifiOnlyFetch',
  minRefreshIntervalMinutes: '@filto/data_management/minRefreshIntervalMinutes',
  backgroundFetchEnabled: '@filto/data_management/backgroundFetchEnabled',

  // 表示
  language: '@filto/display_behavior/language',
  readDisplay: '@filto/display_behavior/readDisplay',
  theme: '@filto/display_behavior/theme',
  layoutMode: '@filto/display_behavior/layoutMode',

  // ホーム
  feedSort: '@filto/home/feedSort',

  // 初回ツアー（画面をまたぐ進行フラグ。消費時に削除される一時的な値）
  // 「初回設定をやり直す」で再生したツアーか（再生時のみスキップボタンを出す）
  tourIsReplay: '@filto/tour/isReplay',
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

