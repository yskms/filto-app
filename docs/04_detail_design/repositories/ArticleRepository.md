# ArticleRepository 詳細設計書

## 概要

`articles`テーブルへのデータアクセスを担当するリポジトリ。
記事データのCRUD操作、型変換（DB ⇔ App）、トランザクション管理を実装。

## 責務

- articlesテーブルのCRUD操作
- DB型（UnixTime、0/1）とApp型（ISO8601、boolean）の相互変換
- トランザクション管理（一括挿入）
- 重複レコードの自動スキップ（INSERT OR IGNORE）

## テーブル定義

```sql
CREATE TABLE articles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id       TEXT NOT NULL,
  feed_name     TEXT NOT NULL,
  title         TEXT NOT NULL,
  link          TEXT NOT NULL,
  description   TEXT,
  thumbnail_url TEXT,
  published_at  INTEGER,           -- UnixTime秒（NULL許容）
  fetched_at    INTEGER NOT NULL,  -- UnixTime秒
  is_read       INTEGER NOT NULL DEFAULT 0,  -- 0: 未読, 1: 既読
  is_blocked    INTEGER NOT NULL DEFAULT 0,  -- 0: 表示, 1: ブロック

  UNIQUE(feed_id, link),
  FOREIGN KEY(feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);

CREATE INDEX idx_articles_feed_id ON articles(feed_id);
CREATE INDEX idx_articles_published_at ON articles(published_at);
CREATE INDEX idx_articles_is_read ON articles(is_read);
```

**ユニーク制約:**
- `(feed_id, link)`: 同じフィードの同じリンクは1件のみ

**カスケード削除:**
- フィードが削除されると、関連記事も自動削除

---

## 型変換ヘルパー関数

### unixSecondsToIsoString(unixSeconds, fallbackUnixSeconds): string

UnixTime秒をISO8601形式に変換する。

**パラメータ:**
- `unixSeconds`: UnixTime秒（null許容）
- `fallbackUnixSeconds`: unixSecondsがnullの場合のフォールバック（省略可）

**戻り値:**
- ISO8601形式の文字列（例: `"2026-01-20T12:34:56.789Z"`）

**処理:**
```typescript
const seconds = unixSeconds ?? fallbackUnixSeconds ?? 0;
return new Date(seconds * 1000).toISOString();
```

**使用例:**
```typescript
// published_atがnullの場合、fetched_atを使用
publishedAt: unixSecondsToIsoString(row.published_at, row.fetched_at)
```

---

### isoStringToUnixSecondsOrNull(isoString): number | null

ISO8601形式をUnixTime秒に変換する。

**パラメータ:**
- `isoString`: ISO8601形式の文字列

**戻り値:**
- UnixTime秒、パース失敗時はnull

**処理:**
```typescript
const ms = new Date(isoString).getTime();
if (Number.isNaN(ms)) {
  return null;
}
return Math.floor(ms / 1000);
```

---

## メソッド仕様

### listAll(): Promise<Article[]>

全記事を取得する（published_at降順）。

**SQL:**
```sql
SELECT
  id, feed_id, feed_name, title, link,
  description, thumbnail_url, published_at,
  fetched_at, is_read
FROM articles
ORDER BY published_at DESC
```

**型変換:**
| DB型 | App型 |
|------|-------|
| `id: number` | `id: string` |
| `feed_id: string` | `feedId: string` |
| `feed_name: string` | `feedName: string` |
| `description: string \| null` | `summary?: string` |
| `thumbnail_url: string \| null` | `thumbnailUrl?: string` |
| `published_at: number \| null` | `publishedAt: string` (ISO8601) |
| `is_read: number` (0/1) | `isRead: boolean` |

**使用例:**
```typescript
const articles = await ArticleRepository.listAll();
// → 全記事を新しい順に取得
```

---

### listByFeed(feedId: string): Promise<Article[]>

指定フィードの記事を取得する（published_at降順）。

**パラメータ:**
- `feedId`: フィードID

**SQL:**
```sql
SELECT
  id, feed_id, feed_name, title, link,
  description, thumbnail_url, published_at,
  fetched_at, is_read
FROM articles
WHERE feed_id = ?
ORDER BY published_at DESC
```

**使用例:**
```typescript
const qiitaArticles = await ArticleRepository.listByFeed('feed_123');
// → Qiitaの記事のみ取得
```

---

### insertMany(articles: Article[]): Promise<void>

記事を一括挿入する（トランザクション）。

**パラメータ:**
- `articles`: 挿入する記事の配列

**動作:**
1. 空配列の場合、何もしない
2. `fetched_at`を現在時刻で生成
3. トランザクション開始
4. 各記事を`INSERT OR IGNORE`で挿入
5. 個別エラーは警告ログのみ（トランザクション継続）

**SQL:**
```sql
INSERT OR IGNORE INTO articles (
  feed_id, feed_name, title, link,
  description, thumbnail_url, published_at,
  fetched_at, is_read, is_blocked
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**INSERT OR IGNOREの動作:**
- `(feed_id, link)`がユニーク制約違反の場合、挿入をスキップ
- エラーをスローせず、静かに無視
- トランザクションは継続

**型変換（App → DB）:**
| App型 | DB型 |
|-------|------|
| `article.feedId` | `feed_id` |
| `article.feedName` | `feed_name` |
| `article.summary?: string` | `description: string \| null` |
| `article.thumbnailUrl?: string` | `thumbnail_url: string \| null` |
| `article.publishedAt: string` | `published_at: number \| null` |
| `article.isRead: boolean` | `is_read: number` (0/1) |
| - | `is_blocked: 0` (固定) |
| - | `fetched_at: number` (現在時刻) |

**エラーハンドリング:**
```typescript
try {
  db.runSync(/* INSERT OR IGNORE */);
} catch (error) {
  console.warn(`Failed to insert article ${article.id}:`, error);
  // トランザクションは継続
}
```

**使用例:**
```typescript
await ArticleRepository.insertMany([
  { id: '1', feedId: 'feed_123', title: 'Article 1', ... },
  { id: '2', feedId: 'feed_123', title: 'Article 2', ... },
]);
// → トランザクションで一括挿入、重複は自動スキップ
```

---

### markRead(id: string): Promise<void>

記事を既読にする。

**パラメータ:**
- `id`: 記事ID

**SQL:**
```sql
UPDATE articles SET is_read = 1 WHERE id = ?
```

**使用例:**
```typescript
// 記事をタップして開いた時
await ArticleRepository.markRead('123');
```

---

### deleteByFeedId(feedId: string): Promise<void>

フィードIDに紐づく記事を削除する。

**パラメータ:**
- `feedId`: フィードID

**SQL:**
```sql
DELETE FROM articles WHERE feed_id = ?
```

**注意:**
- 通常はカスケード削除により自動的に削除される
- このメソッドは明示的な削除が必要な場合のみ使用

**使用例:**
```typescript
await ArticleRepository.deleteByFeedId('feed_123');
// → feed_123の全記事を削除
```

---

## トランザクション管理

### withTransactionSync()

`insertMany()`でトランザクションを使用。

**メリット:**
1. **アトミック性**: 全件挿入 or 全件ロールバック
2. **パフォーマンス**: 一括コミットで高速化
3. **一貫性**: 途中でDBが不整合にならない

**実装:**
```typescript
db.withTransactionSync(() => {
  for (const article of articles) {
    try {
      db.runSync(/* INSERT */);
    } catch (error) {
      console.warn(/* 警告のみ */);
      // 個別エラーでもトランザクション継続
    }
  }
});
```

---

## 型変換の詳細

### DB → App（読み取り時）

```typescript
{
  id: String(row.id),                    // number → string
  feedId: row.feed_id,                   // snake_case → camelCase
  feedName: row.feed_name,
  title: row.title,
  link: row.link,
  summary: row.description ?? undefined, // null → undefined
  thumbnailUrl: row.thumbnail_url ?? undefined,
  publishedAt: unixSecondsToIsoString(row.published_at, row.fetched_at), // UnixTime → ISO8601
  isRead: row.is_read === 1,             // 0/1 → boolean
}
```

### App → DB（書き込み時）

```typescript
[
  article.feedId,                                // camelCase → snake_case
  article.feedName,
  article.title,
  article.link,
  article.summary ?? null,                       // undefined → null
  article.thumbnailUrl ?? null,
  isoStringToUnixSecondsOrNull(article.publishedAt), // ISO8601 → UnixTime
  fetchedAt,                                     // 現在時刻（UnixTime秒）
  article.isRead ? 1 : 0,                        // boolean → 0/1
  0,                                             // is_blocked（固定）
]
```

---

## パフォーマンス考慮

### インデックス活用

```sql
-- フィード別記事取得の高速化
CREATE INDEX idx_articles_feed_id ON articles(feed_id);

-- 日時順ソートの高速化
CREATE INDEX idx_articles_published_at ON articles(published_at);

-- 既読/未読フィルタの高速化
CREATE INDEX idx_articles_is_read ON articles(is_read);
```

### 一括挿入の最適化

- `withTransactionSync()`で一括コミット
- `INSERT OR IGNORE`で重複チェック不要
- 個別エラーでもトランザクション継続

---

## エラーハンドリング

### listAll() / listByFeed()

- SQLエラー: そのままスロー
- 空配列の場合: `[]`を返す

### insertMany()

- 空配列: 何もしない（エラーなし）
- 個別エラー: 警告ログのみ、トランザクション継続
- トランザクションエラー: スロー

### markRead() / deleteByFeedId()

- SQLエラー: そのままスロー
- 存在しないID: エラーなし（0件更新/削除）

---

## 依存関係

**依存先:**
- `openDatabase()`: データベース接続（`@/database/init`）
- `Article`: 型定義（`@/types/Article`）

**依存元:**
- `ArticleService`: ビジネスロジック層

---

## 実装ファイル

`filto/repositories/ArticleRepository.ts`

---

## テスト観点

1. **型変換**
   - UnixTime ⇔ ISO8601が正しく変換されるか
   - null/undefinedが正しく処理されるか
   - 0/1 ⇔ booleanが正しく変換されるか

2. **トランザクション**
   - 全件挿入が成功するか
   - 個別エラーでもトランザクションが継続するか

3. **INSERT OR IGNORE**
   - 重複レコードが無視されるか
   - エラーがスローされないか

4. **カスケード削除**
   - フィード削除時、記事も自動削除されるか

---

## データ例

### DB（articlesテーブル）

| id | feed_id | feed_name | title | link | description | thumbnail_url | published_at | fetched_at | is_read | is_blocked |
|----|---------|-----------|-------|------|-------------|--------------|--------------|------------|---------|-----------|
| 1 | feed_123 | Qiita | 記事A | https://... | 概要 | https://... | 1705738400 | 1705738500 | 0 | 0 |
| 2 | feed_123 | Qiita | 記事B | https://... | 概要 | NULL | 1705738300 | 1705738500 | 1 | 0 |

### App（Article型）

```typescript
[
  {
    id: "1",
    feedId: "feed_123",
    feedName: "Qiita",
    title: "記事A",
    link: "https://...",
    summary: "概要",
    thumbnailUrl: "https://...",
    publishedAt: "2026-01-20T10:00:00.000Z",
    isRead: false,
  },
  {
    id: "2",
    feedId: "feed_123",
    feedName: "Qiita",
    title: "記事B",
    link: "https://...",
    summary: "概要",
    thumbnailUrl: undefined,
    publishedAt: "2026-01-20T09:58:20.000Z",
    isRead: true,
  }
]
```

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-20 | 初版作成 |
