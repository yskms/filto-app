# Home（記事一覧）

## 概要
登録されたRSSフィードから取得した記事を一覧表示するメイン画面。
フィード切替、手動更新、既読管理、フィルタ適用を行う。

## 目的
- ユーザーが記事を素早く閲覧・選別できること
- フィルタ結果が即座に反映されること

---

## UI構成

### ヘッダー
- 左：現在のフィード名 or "ALL"（タップでフィード選択モーダル）
- 右：更新アイコン（手動更新）

### 記事リスト
- サムネイル（あれば）
- タイトル（最大2行）
- サブ：フィード名 / 経過時間

### フッター
- タブ：Home / Filters / Feeds / Settings
- 下スクロール時に非表示、上スクロールで表示

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
2. 既読フラグON（将来実装）
```

### フィード選択
```
1. ヘッダー左側をタップ
2. FeedSelectModal を表示
3. フィード選択
4. 記事を再フィルタリング
```

### 更新
```
1. 更新アイコンタップ or Pull to Refresh
2. (将来) RSS再取得
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

### Step 2: FilterEngine評価
```typescript
const displayed = filtered.filter(article => {
  const shouldBlock = FilterEngine.evaluate(article, filters, globalAllowKeywords);
  return !shouldBlock;
});
```

### Step 3: 既読表示設定
```typescript
// readDisplay = 'hide' の場合
if (readDisplay === 'hide') {
  displayed = displayed.filter(a => !a.isRead);
}
```

詳細: [`FilterEngine.md`](../services/FilterEngine.md)

---

## 状態管理

### 初期状態
- ローディング表示（将来実装）

### 空状態
```
   📭
記事がありません
```

### エラー状態
- トースト表示（将来実装）

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
  const [filters, setFilters] = React.useState<Filter[]>([]);
  const [globalAllowKeywords, setGlobalAllowKeywords] = React.useState<GlobalAllowKeyword[]>([]);
  const [filteredArticles, setFilteredArticles] = React.useState<Article[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // データ読み込み
  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      
      // フィード一覧を取得
      const feedList = await FeedService.list();
      setFeeds(feedList);
      
      // 記事一覧を取得
      const articleList = await ArticleService.getArticles(selectedFeedId ?? undefined);
      setArticles(articleList);
      
      // フィルタ一覧を取得
      const filterList = await FilterService.list();
      setFilters(filterList);
      
      // グローバル許可キーワード一覧を取得
      const globalAllowList = await GlobalAllowKeywordService.list();
      setGlobalAllowKeywords(globalAllowList);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('エラー', 'データの読み込みに失敗しました');
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
    // フィードでフィルタリング
    let filtered = articles;
    if (selectedFeedId !== null) {
      filtered = articles.filter(a => a.feedId === selectedFeedId);
    }

    // グローバル許可キーワードを文字列配列に変換
    const allowKeywords = globalAllowKeywords.map(k => k.keyword);
    
    // FilterEngine評価
    const displayed = filtered.filter(article => {
      const shouldBlock = FilterEngine.evaluate(article, filters, allowKeywords);
      return !shouldBlock; // ブロックされない記事のみ表示
    });

    setFilteredArticles(displayed);
  }, [articles, selectedFeedId, filters, globalAllowKeywords]);

  // RSS同期
  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      
      // RSS同期を実行
      const result = await SyncService.refresh();
      console.log(`Sync completed: ${result.fetched} feeds, ${result.newArticles} new articles`);
      
      // データを再読み込み
      await loadData();
    } catch (error) {
      console.error('Failed to refresh:', error);
      Alert.alert('エラー', '更新に失敗しました');
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  // 記事タップ
  const handlePressArticle = React.useCallback(async (article: Article) => {
    try {
      // 記事を既読にする
      await ArticleService.markRead(article.id);
      
      // ローカルの状態も更新
      setArticles(prev => 
        prev.map(a => a.id === article.id ? { ...a, isRead: true } : a)
      );
      
      // ブラウザで開く
      await Linking.openURL(article.link);
    } catch (error) {
      console.error('Failed to open article:', error);
      Alert.alert('エラー', '記事を開けませんでした');
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
│  └─ RefreshButton
├─ FlatList
│  └─ ArticleItem
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

### ✅ RSS取得
```typescript
const handleRefresh = async () => {
  await SyncService.refresh();
  await loadData();
};
```

### ✅ グローバル許可キーワード
```typescript
// データ読み込み時に取得
const globalAllowList = await GlobalAllowKeywordService.list();
setGlobalAllowKeywords(globalAllowList);

// フィルタ適用時に使用
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

### 具体例
```
【設定】
- グローバル許可キーワード: 「React」
- フィルタ: ブロックキーワード = 「FX」

【記事】
タイトル: 「FXでReact開発を学ぶ」

【評価】
1. グローバル許可キーワードチェック
   - 「React」が含まれる → ✅ 表示

2. フィルタ評価はスキップ
   - 「FX」が含まれてもブロックされない
```

---

## 将来の実装

### 既読表示設定
```typescript
// Settings から読み込み
const [readDisplay, setReadDisplay] = React.useState<'dim' | 'hide'>('dim');

// フィルタ適用時
if (readDisplay === 'hide') {
  displayed = displayed.filter(a => !a.isRead);
}
```

### 自動更新
```typescript
// アプリ起動時、または定期的に自動更新
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
- [`FeedService.md`](../services/FeedService.md) - フィード管理
- [`SyncService.md`](../services/SyncService.md) - RSS同期
- [`FeedSelectModal.md`](./feed_select_modal.md) - フィード選択モーダル
- [`global_allow_keywords.md`](./global_allow_keywords.md) - グローバル許可キーワード画面
- [`FilterService.md`](../services/FilterService.md)