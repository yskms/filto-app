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

---

## 使用API / Service
- **ArticleService.getArticles(feedId?)** - 記事一覧取得（将来）
- **FilterService.list()** - フィルタ一覧取得
- **FilterEngine.evaluate()** - フィルタ評価
- **SyncService.refresh()** - RSS再取得（将来）

---

## 実装例

### 基本構造
```typescript
export default function HomeScreen() {
  const [articles] = React.useState<Article[]>(dummyArticles);
  const [feeds] = React.useState<Feed[]>(dummyFeeds);
  const [selectedFeedId, setSelectedFeedId] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<Filter[]>([]);
  const [filteredArticles, setFilteredArticles] = React.useState<Article[]>([]);

  // フィルタ読み込み
  useFocusEffect(
    React.useCallback(() => {
      loadFilters();
    }, [loadFilters])
  );

  // フィルタ適用
  React.useEffect(() => {
    let filtered = articles;
    
    // フィード別
    if (selectedFeedId !== null) {
      filtered = articles.filter(a => a.feedId === selectedFeedId);
    }

    // FilterEngine評価
    const displayed = filtered.filter(article => {
      const shouldBlock = FilterEngine.evaluate(article, filters, []);
      return !shouldBlock;
    });

    setFilteredArticles(displayed);
  }, [articles, selectedFeedId, filters]);

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

## 将来の実装

### 既読管理
```typescript
const handlePressArticle = async (article: Article) => {
  await Linking.openURL(article.link);
  await ArticleService.markRead(article.id);
  // 記事リストを更新
};
```

### RSS取得
```typescript
const handleRefresh = async () => {
  await SyncService.refresh();
  const articles = await ArticleService.getArticles(selectedFeedId);
  setArticles(articles);
};
```

### グローバル許可リスト
```typescript
const [globalAllowKeywords, setGlobalAllowKeywords] = React.useState<string[]>([]);
// FilterEngine.evaluate() に渡す
```

---

## 関連ドキュメント
- [`FilterEngine.md`](../services/FilterEngine.md)
- [`FeedSelectModal.md`](../components/FeedSelectModal.md)
- [`FilterService.md`](../services/FilterService.md)