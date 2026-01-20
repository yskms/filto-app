# FeedService 詳細設計書

## 概要

フィード管理のビジネスロジックを提供するサービス。
FeedRepositoryのラッパーとして機能し、フィードのCRUD操作、RSS自動検出、並び順管理などを行う。

## 責務

- フィードのCRUD操作
- フィードID・order_noの自動生成
- RSS URLの自動検出
- フィードの並び順管理

## メソッド仕様

### list(): Promise<Feed[]>

全フィードを取得する。

**戻り値:**
- `Promise<Feed[]>`: フィードの配列（order_no昇順）

**使用例:**
```typescript
const feeds = await FeedService.list();
```

---

### get(id: string): Promise<Feed | null>

指定されたIDのフィードを取得する。

**パラメータ:**
- `id`: フィードID

**戻り値:**
- `Promise<Feed | null>`: フィード、存在しない場合はnull

**使用例:**
```typescript
const feed = await FeedService.get('feed_123');
```

---

### create(input: { url: string; title?: string; iconUrl?: string }): Promise<string>

新しいフィードを作成する。

**パラメータ:**
- `url`: フィードURL（必須）
- `title`: フィードタイトル（省略時はURLを使用）
- `iconUrl`: フィードアイコンURL（省略可）

**戻り値:**
- `Promise<string>`: 生成されたフィードID

**処理フロー:**
```
1. フィードIDを生成（feed_<timestamp>_<random>）
2. order_noを決定（現在のフィード数 + 1）
3. titleが未指定の場合、urlを使用
4. FeedRepositoryで保存
5. 生成されたIDを返す
```

**ID生成ルール:**
```typescript
`feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
```

**使用例:**
```typescript
// タイトル指定あり
const id = await FeedService.create({
  url: 'https://example.com/feed',
  title: 'Example Blog',
  iconUrl: 'https://example.com/icon.png',
});

// タイトル省略（URLがタイトルになる）
const id = await FeedService.create({
  url: 'https://example.com/feed',
});
```

---

### update(feed: Feed): Promise<void>

フィードを更新する。

**パラメータ:**
- `feed`: 更新するフィード（全フィールド必須）

**使用例:**
```typescript
const feed = await FeedService.get('feed_123');
feed.title = '新しいタイトル';
await FeedService.update(feed);
```

---

### delete(id: string): Promise<void>

フィードを削除する。

**パラメータ:**
- `id`: 削除するフィードID

**カスケード削除:**
- articlesテーブルのFOREIGN KEY制約により、関連記事も自動削除

**使用例:**
```typescript
await FeedService.delete('feed_123');
```

---

### reorder(feeds: Feed[]): Promise<void>

フィードの並び順を更新する。

**パラメータ:**
- `feeds`: 新しい順序のフィード配列

**処理フロー:**
```
FeedRepository.bulkUpdateOrder(feeds)を呼び出すだけ
```

**使用例:**
```typescript
// ドラッグ&ドロップで並び替えた結果を保存
const reorderedFeeds = [...feeds];
// 並び替え処理
await FeedService.reorder(reorderedFeeds);
```

---

### listWithSort(sortType: FeedSortType): Promise<Feed[]>

ソート順を指定してフィードを取得する。

**パラメータ:**
- `sortType`: ソートタイプ（`FeedSortType`）

**FeedSortType:**
```typescript
type FeedSortType = 
  | 'created_at_desc'  // 作成日時（新しい順）
  | 'created_at_asc'   // 作成日時（古い順）
  | 'title_asc'        // フィード名（昇順）
  | 'title_desc'       // フィード名（降順）
  | 'url_asc'          // URL（昇順）
  | 'url_desc';        // URL（降順）
```

**戻り値:**
- `Promise<Feed[]>`: ソート済みフィードの配列

**処理:**
```typescript
FeedRepository.listWithSort(sortType)を呼び出すだけ
```

**使用例:**
```typescript
// 作成日時が新しい順（デフォルト）
const feeds = await FeedService.listWithSort('created_at_desc');

// フィード名のアルファベット順
const feeds = await FeedService.listWithSort('title_asc');
```

**UI連携:**
- Feeds画面の🔄ボタンでソートモーダル表示
- ユーザーがソートオプションを選択
- `currentSort` Stateが更新される
- `listWithSort(currentSort)`で再取得
- フィード一覧が自動的に再ソート

---

### count(): Promise<number>

フィード数を取得する。

**戻り値:**
- `Promise<number>`: フィード数

**使用例:**
```typescript
const count = await FeedService.count();
```

---

### detectRssUrl(baseUrl: string): Promise<string | null>

RSS URLを自動検出する。

**パラメータ:**
- `baseUrl`: ベースURL（例: `https://example.com`）

**戻り値:**
- `Promise<string | null>`: 検出されたRSS URL、見つからない場合はnull

**検出パス一覧（優先度順）:**
1. `/feed` - WordPress、GitHub、多くのブログプラットフォーム
2. `/feed.xml` - 静的サイト
3. `/rss` - 一般的なRSSパス
4. `/rss.xml` - 一般的なRSSパス
5. `/atom.xml` - Atomフィード
6. `/index.xml` - 一部の静的サイト
7. `/feeds` - Medium、一部のサイト
8. `/feeds/posts/default` - Blogger

**処理フロー:**
```
FOR EACH commonPath IN commonPaths:
  1. testUrl = new URL(path, baseUrl).href
  2. RssService.fetchMeta(testUrl)を試す
  3. 成功 → testUrlを返す
  4. 失敗 → 次のパスを試す

すべて失敗 → nullを返す
```

**タイムアウト:**
- 各パスの試行は`RssService`の`FETCH_TIMEOUT_MS`（10秒）が適用される
- 最悪ケース: 10秒 × 8パス = 80秒（実際は早期成功する場合が多い）

**使用例:**
```typescript
// トップページURLから自動検出
const rssUrl = await FeedService.detectRssUrl('https://qiita.com');
// → 'https://qiita.com/feed'

// 検出失敗
const rssUrl = await FeedService.detectRssUrl('https://twitter.com');
// → null
```

**ログ出力例:**
```
[FeedService] Starting RSS auto-detection for: https://qiita.com
[FeedService] Trying: https://qiita.com/feed
[FeedService] ✅ Found RSS at: https://qiita.com/feed
```

---

## データフロー

### フィード作成
```
[feed_add.tsx]
  ↓ create()
[FeedService] → ID生成、order_no決定
  ↓ create()
[FeedRepository]
  ↓ INSERT
[SQLite Database]
```

### RSS自動検出
```
[feed_add.tsx] → ユーザーがトップページURLを入力
  ↓ handleFetchMeta()
  ↓ 1. 直接取得を試す → 失敗
  ↓ 2. detectRssUrl()
[FeedService] → 8パターンのパスを順次試行
  ↓ fetchMeta()
[RssService]
  ↓ 成功したパスのURLを返す
[feed_add.tsx] → URLを自動更新、メタ情報を表示
```

---

## エラーハンドリング

- Repository層のエラーをそのままスロー
- `detectRssUrl()`は例外をスローせず、nullを返す
- 呼び出し側でcatch

---

## 依存関係

**依存先:**
- `FeedRepository`: データアクセス層
- `RssService`: RSS自動検出で使用
- `Feed`: 型定義

**依存元:**
- `app/feed_add.tsx`: フィード追加画面
- `app/feeds.tsx`: フィード一覧画面
- `SyncService`: RSS同期処理
- その他の画面コンポーネント

---

## 実装ファイル

`filto/services/FeedService.ts`

---

## テスト観点

1. **create()**
   - IDが一意に生成されるか
   - order_noが正しく設定されるか
   - titleが未指定時、urlが使用されるか

2. **detectRssUrl()**
   - 一般的なRSSパスが検出されるか
   - すべて失敗時、nullが返されるか
   - タイムアウトが正しく機能するか

3. **delete()**
   - カスケード削除が機能するか（関連記事も削除）

---

## パフォーマンス考慮

- `detectRssUrl()`は最大80秒かかる可能性
- ローディングインジケーター表示必須
- 早期成功が期待されるパスを優先配置

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-20 | 初版作成（RSS自動検出機能含む） |
