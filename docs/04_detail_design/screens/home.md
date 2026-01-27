# Home（記事一覧）

## 概要
登録されたRSSフィードから取得した記事を一覧表示するメイン画面。
フィード切替、手動更新、既読管理、お気に入り管理、フィルタ適用を行う。

## 目的
- ユーザーが記事を素早く閲覧・選別できること
- フィルタ結果が即座に反映されること
- お気に入り記事を簡単に管理できること

---

## UI構成

### ヘッダー
- 左：現在のフィード名 or "ALL"（タップでフィード選択モーダル）
- 中央：⭐お気に入りフィルタートグル（円形ボタン）
- 右：更新アイコン（手動更新）

### 記事リスト
- サムネイル（あれば）
- タイトル（最大2行）
- お気に入りアイコン（⭐、お気に入り登録済みの場合）
- サブ：フィード名 / 経過時間

### フッター
- タブ：Home / Filters / Settings
- 下スクロール時に非表示、上スクロールで表示

---

## お気に入り機能

### ⭐トグルボタン（ヘッダー中央）
**表示**:
- 非選択時: グレー背景（#f5f5f5）、透明度60%
- 選択時: 薄い黄色背景（#fff3cd）

**動作**:
- タップでON/OFF切り替え
- ON時: お気に入り記事のみ表示
- OFF時: 通常のフィード表示

**フィルタの組み合わせ**:
- `ALL` + ⭐OFF → 全記事表示
- `ALL` + ⭐ON → 全フィードのお気に入り記事
- `フィードA` + ⭐OFF → フィードAの全記事
- `フィードA` + ⭐ON → フィードAのお気に入り記事のみ

### お気に入り追加/削除
**操作**: 記事セルを長押し

**フィードバック**:
1. **ハプティック**: 軽い振動（`Haptics.ImpactFeedbackStyle.Light`）
2. **視覚効果**: セルハイライトアニメーション
   - **追加時**: 素早く2回光る
     ```
     白 → 黄色 → 白 → 黄色 → 白
        100ms  100ms  100ms  150ms
     合計: 450ms
     ```
   - **削除時**: ゆっくり1回光る
     ```
     白 → 黄色 → 白
        150ms  300ms
     合計: 450ms
     ```
   - ハイライト色: 薄い黄色（#fff3cd）
3. **表示変化**: ⭐アイコンの表示/非表示

### 実装詳細

```typescript
// 状態管理
const [showStarredOnly, setShowStarredOnly] = React.useState(false);
const highlightAnims = React.useRef<Map<string, Animated.Value>>(new Map());

// 長押し処理
const handleLongPressArticle = async (article: Article) => {
  const isAdding = !article.isStarred;
  
  // DB更新
  await ArticleRepository.toggleStarred(article.id);
  
  // ハプティックフィードバック
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  
  // アニメーション（追加時は2回、削除時は1回）
  const anim = getHighlightAnim(article.id);
  if (isAdding) {
    // 2回光る
  } else {
    // 1回光る
  }
  
  // 状態更新
  setArticles(prev => 
    prev.map(a => a.id === article.id ? { ...a, isStarred: !a.isStarred } : a)
  );
};
```

---

## データ型

### Article
```typescript
interface Article {
  id: string;
  feedId: string;
  feedName: string;
  title: string;
  link: string;
  summary?: string;
  publishedAt: string;
  isRead: boolean;
  isStarred: boolean;  // お気に入りフラグ
}
```

### Feed
```typescript
interface Feed {
  id: string;
  title: string;
  url: string;
  iconUrl?: string;
  orderNo: number;
  createdAt: string;
}
```

---

## 表示仕様

### 並び順
- published_at DESC（新しい順）

### 既読表示
- **dim（薄く表示）**: 全体を60%不透明、タイトル灰色
- **hide（非表示）**: フィルタリングで除外

### フィルタ適用
- フィルタ条件に一致し「ブロック」された記事は表示しない
- グローバル許可リストに一致する記事は常に表示

### 経過時間フォーマット
- 1分未満: `たった今`
- 1分〜59分: `Xm`
- 1時間〜23時間: `Xh`
- 1日以上: `Xd`

---

## 操作

### 記事タップ
```
1. 外部ブラウザでURLを開く
2. 既読フラグON
```

### 記事長押し
```
1. お気に入りを切り替え（toggleStarred）
2. ハプティックフィードバック
3. セルハイライトアニメーション
4. ⭐アイコンの表示/非表示
```

### フィード選択
```
1. ヘッダー左側をタップ
2. FeedSelectModal を表示
3. フィード選択
4. 記事を再フィルタリング
```

### お気に入りフィルター
```
1. ヘッダー中央の⭐ボタンをタップ
2. showStarredOnly を切り替え
3. 記事を再フィルタリング
```

### 起動時自動更新
```
1. アプリ起動時に自動的に実行
2. Display & Behavior の設定を確認（デフォルト: ON）
3. SyncService.shouldSync()で同期が必要かチェック（30分以上経過時のみ）
4. 必要な場合のみバックグラウンドで同期実行
5. 同期完了後、データを再読み込み
```

**動作詳細:**
- 画面表示から1.5秒後に実行（画面表示を優先）
- 一度だけ実行（`hasAutoSynced`フラグで制御）
- エラーが発生してもアプリは正常に動作

**ログ出力例:**
```
[AutoSync] Starting background sync...
[SyncService] Start syncing 3 feeds...
[SyncService] Sync completed: 3/3 feeds, 5 new articles
[AutoSync] Completed
```

### 手動更新
```
1. 更新アイコンタップ or Pull to Refresh
2. RSS再取得
3. フィルタを再読み込み
4. 記事リストを更新
```

---

## フィルタリングロジック

### Step 1: フィード別フィルタリング
```typescript
let filtered = articles;
if (selectedFeedId !== null) {
  filtered = articles.filter(a => a.feedId === selectedFeedId);
}
```

### Step 2: お気に入りフィルター
```typescript
if (showStarredOnly) {
  filtered = filtered.filter(a => a.isStarred);
}
```

### Step 3: FilterEngine評価
```typescript
const displayed = filtered.filter(article => {
  const shouldBlock = FilterEngine.evaluate(article, filters, globalAllowKeywords);
  return !shouldBlock;
});
```

### Step 4: 既読表示設定
```typescript
// readDisplay = 'hide' の場合
if (readDisplay === 'hide') {
  displayed = displayed.filter(a => !a.isRead);
}
```

詳細: [`FilterEngine.md`](../services/FilterEngine.md)

---

## 状態管理

### 状態
```typescript
const [articles, setArticles] = React.useState<Article[]>([]);
const [feeds, setFeeds] = React.useState<Feed[]>([]);
const [selectedFeedId, setSelectedFeedId] = React.useState<string | null>(null);
const [showStarredOnly, setShowStarredOnly] = React.useState(false);
const [filters, setFilters] = React.useState<Filter[]>([]);
const [globalAllowKeywords, setGlobalAllowKeywords] = React.useState<GlobalAllowKeyword[]>([]);
const [filteredArticles, setFilteredArticles] = React.useState<Article[]>([]);
const [readDisplay, setReadDisplay] = React.useState<ReadDisplayMode>('dim');

// アニメーション管理
const highlightAnims = React.useRef<Map<string, Animated.Value>>(new Map());
```

### 初期状態
- ローディング表示

### 空状態
```
   📭
記事がありません
```

### エラー状態
- トースト表示（ErrorHandler使用）

---

## 使用データ
- articles テーブル
- feeds テーブル
- settings テーブル
- filters テーブル
- global_allow_keywords テーブル

---

## 使用API / Service
- **ArticleService.getArticles(feedId?)** - 記事一覧取得 ✅
- **ArticleService.markRead(id)** - 既読更新 ✅
- **ArticleRepository.toggleStarred(id)** - お気に入り切り替え ✅
- **FeedService.list()** - フィード一覧取得 ✅
- **FilterService.list()** - フィルタ一覧取得 ✅
- **GlobalAllowKeywordService.list()** - グローバル許可キーワード一覧取得 ✅
- **FilterEngine.evaluate()** - フィルタ評価 ✅
- **SyncService.refresh()** - RSS再取得 ✅

---

## 実装例

### 基本構造（実装済み）
```typescript
export default function HomeScreen() {
  const [articles, setArticles] = React.useState<Article[]>([]);
  const [feeds, setFeeds] = React.useState<Feed[]>([]);
  const [selectedFeedId, setSelectedFeedId] = React.useState<string | null>(null);
  const [showStarredOnly, setShowStarredOnly] = React.useState(false);
  const [filters, setFilters] = React.useState<Filter[]>([]);
  const [globalAllowKeywords, setGlobalAllowKeywords] = React.useState<GlobalAllowKeyword[]>([]);
  const [filteredArticles, setFilteredArticles] = React.useState<Article[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [readDisplay, setReadDisplay] = React.useState<ReadDisplayMode>('dim');

  // アニメーション管理
  const highlightAnims = React.useRef<Map<string, Animated.Value>>(new Map());

  // データ読み込み
  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      
      const feedList = await FeedService.list();
      setFeeds(feedList);
      
      const articleList = await ArticleService.getArticles(selectedFeedId ?? undefined);
      setArticles(articleList);
      
      const filterList = await FilterService.list();
      setFilters(filterList);
      
      const globalAllowList = await GlobalAllowKeywordService.list();
      setGlobalAllowKeywords(globalAllowList);
      
      const savedReadDisplay = await AsyncStorage.getItem('@filto/display_behavior/readDisplay');
      if (savedReadDisplay === 'dim' || savedReadDisplay === 'hide') {
        setReadDisplay(savedReadDisplay);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      ErrorHandler.showLoadError();
    } finally {
      setIsLoading(false);
    }
  }, [selectedFeedId]);

  // 画面フォーカス時にデータを読み込む
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData])
  );

  // フィルタ適用
  React.useEffect(() => {
    // 1. フィードでフィルタリング
    let filtered = articles;
    if (selectedFeedId !== null) {
      filtered = articles.filter(a => a.feedId === selectedFeedId);
    }

    // 2. お気に入りフィルター
    if (showStarredOnly) {
      filtered = filtered.filter(a => a.isStarred);
    }

    // 3. グローバル許可キーワード
    const allowKeywords = globalAllowKeywords.map(k => k.keyword);
    
    // 4. FilterEngine評価
    let displayed = filtered.filter(article => {
      const shouldBlock = FilterEngine.evaluate(article, filters, allowKeywords);
      return !shouldBlock;
    });

    // 5. 既読表示設定
    if (readDisplay === 'hide') {
      displayed = displayed.filter(a => !a.isRead);
    }

    setFilteredArticles(displayed);
  }, [articles, selectedFeedId, showStarredOnly, filters, globalAllowKeywords, readDisplay]);

  // RSS同期
  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      
      const result = await SyncService.refresh();
      console.log(`Sync completed: ${result.fetched} feeds, ${result.newArticles} new articles`);
      
      await loadData();
    } catch (error) {
      console.error('Failed to refresh:', error);
      ErrorHandler.showSyncError();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  // 記事タップ
  const handlePressArticle = React.useCallback(async (article: Article) => {
    try {
      await ArticleService.markRead(article.id);
      
      setArticles(prev => 
        prev.map(a => a.id === article.id ? { ...a, isRead: true } : a)
      );
      
      await Linking.openURL(article.link);
    } catch (error) {
      console.error('Failed to open article:', error);
      ErrorHandler.showGenericError('記事を開けませんでした');
    }
  }, []);

  // 記事長押し（お気に入り切り替え）
  const handleLongPressArticle = React.useCallback(async (article: Article) => {
    try {
      const isAdding = !article.isStarred;
      
      await ArticleRepository.toggleStarred(article.id);
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const anim = getHighlightAnim(article.id);
      
      if (isAdding) {
        // 追加時: 素早く2回光る
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 100, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 150, useNativeDriver: false }),
        ]).start();
      } else {
        // 削除時: ゆっくり1回光る
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: false }),
        ]).start();
      }
      
      setArticles(prev => 
        prev.map(a => a.id === article.id ? { ...a, isStarred: !a.isStarred } : a)
      );
    } catch (error) {
      console.error('Failed to toggle star:', error);
      ErrorHandler.showDatabaseError('お気に入りの変更に失敗しました');
    }
  }, []);

  // ...
}
```

---

## コンポーネント構成
```
HomeScreen
├─ HomeHeader
│  ├─ FeedSelector
│  ├─ StarFilterToggle（⭐ボタン）
│  └─ RefreshButton
├─ FlatList
│  └─ ArticleItem（ハイライトアニメーション対応）
└─ FeedSelectModal
```

---

## 遷移
- → FeedSelectModal（フィード選択モーダル）
- → 外部ブラウザ（記事URL）

---

## 実装済み機能

### ✅ 既読管理
```typescript
const handlePressArticle = async (article: Article) => {
  await ArticleService.markRead(article.id);
  setArticles(prev => 
    prev.map(a => a.id === article.id ? { ...a, isRead: true } : a)
  );
  await Linking.openURL(article.link);
};
```

### ✅ お気に入り管理
```typescript
const handleLongPressArticle = async (article: Article) => {
  await ArticleRepository.toggleStarred(article.id);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // アニメーション + 状態更新
};
```

### ✅ RSS取得
```typescript
const handleRefresh = async () => {
  await SyncService.refresh();
  await loadData();
};
```

### ✅ グローバル許可キーワード
```typescript
const globalAllowList = await GlobalAllowKeywordService.list();
setGlobalAllowKeywords(globalAllowList);

const allowKeywords = globalAllowKeywords.map(k => k.keyword);
const shouldBlock = FilterEngine.evaluate(article, filters, allowKeywords);
```

---

## グローバル許可キーワード統合詳細

### データフロー
```
1. Home画面読み込み
   ↓
2. loadData() 実行
   ↓
3. GlobalAllowKeywordService.list() でキーワード取得
   ↓
4. State: globalAllowKeywords に保存
   ↓
5. useEffect（フィルタ適用）
   ↓
6. キーワード配列を文字列配列に変換
   allowKeywords = globalAllowKeywords.map(k => k.keyword)
   ↓
7. FilterEngine.evaluate(article, filters, allowKeywords)
   ↓
8. 結果に基づいて記事を表示/非表示
```

### 優先順位
```
1. グローバル許可キーワード（最優先）
   - マッチすれば無条件で表示
   ↓ マッチしない場合のみ
2. 個別フィルタの評価
   - ブロックキーワード
   - 許可キーワード
```

---

## 将来の実装

### 自動更新
```typescript
// 定期的に自動更新
useEffect(() => {
  const interval = setInterval(() => {
    handleRefresh();
  }, 30 * 60 * 1000); // 30分ごと
  
  return () => clearInterval(interval);
}, []);
```

---

## 関連ドキュメント
- [`FilterEngine.md`](../services/FilterEngine.md) - フィルタ評価ロジック
- [`FilterService.md`](../services/FilterService.md) - フィルタ管理
- [`GlobalAllowKeywordService.md`](../services/GlobalAllowKeywordService.md) - グローバル許可キーワード管理
- [`ArticleService.md`](../services/ArticleService.md) - 記事データ管理
- [`ArticleRepository.md`](../repositories/ArticleRepository.md) - 記事DB操作
- [`FeedService.md`](../services/FeedService.md) - フィード管理
- [`SyncService.md`](../services/SyncService.md) - RSS同期
- [`FeedSelectModal.md`](./feed_select_modal.md) - フィード選択モーダル
- [`global_allow_keywords.md`](./global_allow_keywords.md) - グローバル許可キーワード画面