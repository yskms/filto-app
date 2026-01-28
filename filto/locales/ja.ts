export const ja = {
    // タブバー
    tabs: {
      home: 'Home',
      filters: 'Filters',
      feeds: 'Feeds',
      settings: 'Settings',
    },
  
    // Settings画面
    settings: {
      title: 'Settings',
      globalAllowKeywords: 'グローバル許可キーワード',
      displayBehavior: '表示と動作',
      dataManagement: 'データ管理',
      pro: 'Pro',
      about: 'About',
    },
  
    // Display & Behavior画面
    displayBehavior: {
      title: '表示と動作',
      readDisplayMode: '既読の表示方法',
      displayMethod: '表示方法',
      dimDisplay: '薄く表示',
      hideDisplay: '非表示',
      theme: 'テーマ',
      themeLabel: 'テーマ',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      language: '言語',
      languageLabel: '言語',
      japanese: '日本語',
      english: 'English',
      startupBehavior: '起動時の挙動',
      autoSyncDescription: 'アプリ起動時に自動的にRSSフィードを更新します（30分以上経過時のみ）',
      selectDisplayMethod: '表示方法を選択',
      selectTheme: 'テーマを選択',
      selectLanguage: '言語を選択',
    },
  
    // Data Management画面
    dataManagement: {
      title: 'データ管理',
      cachePeriod: 'キャッシュ期間',
      days: '日',
      selectCachePeriod: 'キャッシュ期間を選択',
    },
  
    // About画面
    about: {
      title: 'About',
      version: 'Version',
      description: 'RSSリーダー with キーワードフィルター',
    },
  
    // Global Allow Keywords画面
    globalAllowKeywords: {
      title: 'グローバル許可キーワード',
      remaining: '残り',
      add: '追加',
      inputPlaceholder: 'キーワードを入力',
      description: 'グローバル許可キーワードは、すべてのフィルタより優先して記事を表示します。',
      freeLimit: '無料版は3件までです。Pro版で無制限に追加できます。',
      emptyMessage: 'キーワードがありません',
      emptyHint: '重要なキーワードを追加してください',
      errorEmpty: 'キーワードを入力してください',
      errorDuplicate: 'このキーワードは既に登録されています',
      errorLimit: '無料版は3件までです。Pro版にアップグレードしてください。',
      errorFailed: '登録に失敗しました',
      deleteConfirm: 'を削除しますか？',
      deleteTitle: 'キーワードを削除',
      cancel: 'キャンセル',
      delete: '削除',
    },
  
    // Filter Edit画面
    filterEdit: {
      titleAdd: 'Add Filter',
      titleEdit: 'Edit Filter',
      blockKeyword: 'ブロックキーワード',
      blockKeywordPlaceholder: '例: FX',
      allowKeywords: '許可キーワード（任意）',
      allowKeywordsHint: '1行に1キーワード',
      allowKeywordsPlaceholder: '例:\n仮想通貨\nweb3\ncrypto',
      searchTarget: '検索対象',
      targetTitle: 'タイトル',
      targetDescription: '本文',
      save: '保存',
      delete: '削除',
      loading: '読み込み中...',
      errorLoad: 'フィルタの読み込みに失敗しました',
      errorBlockKeywordRequired: 'ブロックキーワードを入力してください',
      errorTargetRequired: 'タイトルまたは本文のいずれかを選択してください',
      errorSaveFailed: '保存に失敗しました。もう一度お試しください。',
      deleteConfirmTitle: '確認',
      deleteConfirmMessage: 'を削除しますか？',
      errorDeleteFailed: '削除に失敗しました。もう一度お試しください。',
    },
  
    // Feed Add画面
    feedAdd: {
      title: 'Add Feed',
      feedUrl: 'Feed URL',
      feedUrlPlaceholder: 'https://example.com/feed.xml',
      paste: '📋 ペースト',
      fetchMeta: '🔍 フィード情報を取得',
      fetching: '取得中...',
      feedName: 'Feed Name',
      optional: '(optional)',
      feedNamePlaceholder: 'My Favorite Blog',
      feedNameHint: '空欄の場合、URLをタイトルとして使用します',
      add: '追加する',
      adding: '追加中...',
      errorUrlRequired: 'URLを入力してください',
      errorUrlInvalid: '有効なURLを入力してください',
      errorUrlProtocol: 'http または https で始まるURLを入力してください',
      errorFetchFailed: 'フィード情報の取得に失敗しました',
      fetchSuccess: 'フィード情報を取得しました',
    },
  
    // Home画面
    home: {
      all: 'ALL',
      loading: '読み込み中...',
      emptyIcon: '📭',
      emptyMessage: '記事がありません',
      selectFeed: 'フィードを選択',
    },
  
    // Filters画面
    filters: {
      title: 'Filters',
      cancel: 'キャンセル',
      delete: '削除',
      deleteConfirm: '件のフィルタを削除しますか？',
      confirmTitle: '確認',
      emptyIcon: '🔍',
      emptyMessage: 'フィルタがありません',
    },
  
    // Feeds画面
    feeds: {
      title: 'Feeds',
      cancel: 'キャンセル',
      selected: '件選択中',
      deleteConfirm: '件のフィードを削除しますか？',
      deleteOne: 'を削除しますか？',
      confirmTitle: '確認',
      sortTitle: '並び替え',
      sortNameAsc: '名前順（昇順）',
      sortNameDesc: '名前順（降順）',
      sortDateAsc: '追加日時順（古い順）',
      sortDateDesc: '追加日時順（新しい順）',
      emptyIcon: '📡',
      emptyMessage: 'フィードがありません',
    },
  
    // 共通
    common: {
      back: '←',
      cancel: 'キャンセル',
      delete: '削除',
      save: '保存',
      add: '追加',
      error: 'エラー',
      success: '成功',
      confirm: '確認',
    },
  };
  
  export type Translation = typeof ja;