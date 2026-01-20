# FeedRepository 詳細設計書

## 概要

`feeds`テーブルへのデータアクセスを担当するリポジトリ。
フィードデータのCRUD操作、並び順管理、型変換（DB ⇔ App）を実装。

## 責務

- feedsテーブルのCRUD操作
- フィードの並び順管理（order_no）
- DB型（UnixTime、snake_case）とApp型（ISO8601、camelCase）の相互変換
- トランザクション管理（並び順一括更新）

## テーブル定義

```sql
CREATE TABLE feeds (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  url        TEXT NOT NULL UNIQUE,
  icon_url   TEXT,
  order_no   INTEGER NOT NULL,
  created_at INTEGER NOT NULL  -- UnixTime秒
);

CREATE INDEX idx_feeds_order_no ON feeds(order_no);
```

**ユニーク制約:**
- `url`: 同じRSS URLは1件のみ

**インデックス:**
- `order_no`: 並び順ソートの高速化

**カスケード:**
- feeds削除 → articles自動削除（FOREIGN KEY ON DELETE CASCADE）

---

## メソッド仕様

### list(): Promise<Feed[]>

全フィードを取得する（order_no昇順）。

**SQL:**
```sql
SELECT * FROM feeds ORDER BY order_no ASC
```

**型変換（DB → App）:**
| DB型 | App型 |
|------|-------|
| `id: string` | `id: string` |
| `title: string` | `title: string` |
| `url: string` | `url: string` |
| `icon_url: string \| null` | `iconUrl?: string` |
| `order_no: number` | `orderNo: number` |
| `created_at: number` (UnixTime秒) | `createdAt: string` (ISO8601) |

**変換処理:**
```typescript
return rows.map(row => ({
  id: row.id,
  title: row.title,
  url: row.url,
  iconUrl: row.icon_url || undefined,  // null → undefined
  orderNo: row.order_no,
  createdAt: new Date(row.created_at * 1000).toISOString(),  // UnixTime → ISO8601
}));
```

**使用例:**
```typescript
const feeds = await FeedRepository.list();
// → [{ id: 'feed_123', title: 'Qiita', orderNo: 1, ... }, ...]
```

---

### get(id: string): Promise<Feed | null>

IDでフィードを取得する。

**パラメータ:**
- `id`: フィードID

**SQL:**
```sql
SELECT * FROM feeds WHERE id = ?
```

**戻り値:**
- `Feed`: 存在する場合
- `null`: 存在しない場合

**使用例:**
```typescript
const feed = await FeedRepository.get('feed_123');
if (feed) {
  console.log(feed.title);  // 'Qiita'
} else {
  console.log('フィードが見つかりません');
}
```

---

### create(feed: Omit<Feed, 'createdAt'>): Promise<void>

フィードを作成する。

**パラメータ:**
- `feed`: 作成するフィード（`createdAt`は不要）

**SQL:**
```sql
INSERT INTO feeds (id, title, url, icon_url, order_no, created_at)
VALUES (?, ?, ?, ?, ?, ?)
```

**型変換（App → DB）:**
| App型 | DB型 |
|-------|------|
| `feed.id` | `id` |
| `feed.title` | `title` |
| `feed.url` | `url` |
| `feed.iconUrl?: string` | `icon_url: string \| null` |
| `feed.orderNo` | `order_no` |
| - | `created_at: number` (現在時刻) |

**変換処理:**
```typescript
const createdAt = Math.floor(Date.now() / 1000);  // 現在時刻（UnixTime秒）
db.runSync(/* INSERT */, [
  feed.id,
  feed.title,
  feed.url,
  feed.iconUrl || null,  // undefined → null
  feed.orderNo,
  createdAt,
]);
```

**使用例:**
```typescript
await FeedRepository.create({
  id: 'feed_123',
  title: 'Qiita',
  url: 'https://qiita.com/feed',
  iconUrl: 'https://cdn.qiita.com/...',
  orderNo: 1,
});
```

---

### update(feed: Feed): Promise<void>

フィードを更新する。

**パラメータ:**
- `feed`: 更新するフィード（全フィールド必須）

**SQL:**
```sql
UPDATE feeds
SET title = ?, url = ?, icon_url = ?, order_no = ?
WHERE id = ?
```

**注意:**
- `created_at`は更新されない
- `id`は主キーなので変更不可

**使用例:**
```typescript
const feed = await FeedRepository.get('feed_123');
feed.title = '新しいタイトル';
await FeedRepository.update(feed);
```

---

### delete(id: string): Promise<void>

フィードを削除する。

**パラメータ:**
- `id`: 削除するフィードID

**SQL:**
```sql
DELETE FROM feeds WHERE id = ?
```

**カスケード削除:**
- articlesテーブルのFOREIGN KEY制約により、関連記事も自動削除

**使用例:**
```typescript
await FeedRepository.delete('feed_123');
// → feed_123と関連記事がすべて削除される
```

---

### bulkUpdateOrder(feeds: Feed[]): Promise<void>

並び順を一括更新する（トランザクション）。

**パラメータ:**
- `feeds`: 新しい順序のフィード配列

**処理フロー:**
```
1. トランザクション開始
2. FOR EACH feed, index:
   - UPDATE feeds SET order_no = index + 1 WHERE id = feed.id
3. コミット
```

**SQL:**
```sql
UPDATE feeds SET order_no = ? WHERE id = ?
```

**実装:**
```typescript
db.withTransactionSync(() => {
  feeds.forEach((feed, index) => {
    db.runSync('UPDATE feeds SET order_no = ? WHERE id = ?', [index + 1, feed.id]);
  });
});
```

**order_noの計算:**
- 配列のインデックスに+1（1始まり）
- 例: `[feed1, feed2, feed3]` → order_no: 1, 2, 3

**使用例:**
```typescript
// ドラッグ&ドロップで並び替え
const reorderedFeeds = [feed3, feed1, feed2];  // 新しい順序
await FeedRepository.bulkUpdateOrder(reorderedFeeds);
// → order_no: feed3=1, feed1=2, feed2=3
```

---

### count(): Promise<number>

フィード数を取得する。

**SQL:**
```sql
SELECT COUNT(*) as count FROM feeds
```

**戻り値:**
- フィード数（0以上）

**使用例:**
```typescript
const count = await FeedRepository.count();
console.log(`${count}件のフィードがあります`);

// 新規フィードのorder_noを決定
const newOrderNo = count + 1;
```

---

## トランザクション管理

### bulkUpdateOrder()でのトランザクション

**メリット:**
1. **アトミック性**: 全件更新 or 全件ロールバック
2. **一貫性**: 途中で不整合にならない
3. **パフォーマンス**: 一括コミットで高速化

**実装:**
```typescript
db.withTransactionSync(() => {
  feeds.forEach((feed, index) => {
    db.runSync('UPDATE feeds SET order_no = ? WHERE id = ?', [index + 1, feed.id]);
  });
});
```

---

## 型変換の詳細

### DB → App（読み取り時）

```typescript
{
  id: row.id,
  title: row.title,
  url: row.url,
  iconUrl: row.icon_url || undefined,               // null → undefined
  orderNo: row.order_no,                            // snake_case → camelCase
  createdAt: new Date(row.created_at * 1000).toISOString(),  // UnixTime → ISO8601
}
```

**UnixTime → ISO8601の変換:**
```typescript
row.created_at = 1705738400 (UnixTime秒)
↓
new Date(1705738400 * 1000)  // ミリ秒に変換
↓
.toISOString()
↓
"2026-01-20T10:00:00.000Z"
```

### App → DB（書き込み時）

```typescript
[
  feed.id,
  feed.title,
  feed.url,
  feed.iconUrl || null,                  // undefined → null
  feed.orderNo,                          // camelCase → snake_case
  Math.floor(Date.now() / 1000),        // 現在時刻をUnixTime秒に変換
]
```

**現在時刻のUnixTime秒生成:**
```typescript
Date.now()  // ミリ秒（例: 1705738400000）
↓
/ 1000      // 秒に変換（例: 1705738400.123）
↓
Math.floor()  // 小数点以下切り捨て（例: 1705738400）
```

---

## パフォーマンス考慮

### インデックス活用

```sql
CREATE INDEX idx_feeds_order_no ON feeds(order_no);
```

**効果:**
- `ORDER BY order_no`が高速化
- フィード数が増えても一定速度

### 一括更新の最適化

- `withTransactionSync()`で一括コミット
- I/O回数を削減

---

## エラーハンドリング

### list()

- SQLエラー: そのままスロー
- 空テーブル: `[]`を返す

### get()

- SQLエラー: そのままスロー
- 存在しないID: `null`を返す

### create()

- SQLエラー: そのままスロー
- URL重複: UNIQUE制約エラーをスロー

### update()

- SQLエラー: そのままスロー
- 存在しないID: エラーなし（0件更新）

### delete()

- SQLエラー: そのままスロー
- 存在しないID: エラーなし（0件削除）
- **カスケード削除**: 関連記事も自動削除

### bulkUpdateOrder()

- SQLエラー: トランザクションロールバック
- 存在しないID: 該当IDはスキップ（0件更新）

---

## order_no管理

### 新規作成時のorder_no決定

```typescript
// FeedServiceで実装
const count = await FeedRepository.count();
const orderNo = count + 1;
```

**例:**
- 既存フィード数: 3件（order_no: 1, 2, 3）
- 新規フィード: order_no = 4

### 並び替え時のorder_no更新

```typescript
// ドラッグ&ドロップ後
const reorderedFeeds = [feed3, feed1, feed2];
await FeedRepository.bulkUpdateOrder(reorderedFeeds);
```

**更新内容:**
| feed | 元のorder_no | 新しいorder_no |
|------|-------------|---------------|
| feed3 | 3 | 1 |
| feed1 | 1 | 2 |
| feed2 | 2 | 3 |

### 削除時のorder_no管理

**現在の実装:**
- 削除後、order_noに欠番ができる
- 例: `[1, 2, 3]` → 2を削除 → `[1, 3]`

**将来の改善案:**
- 削除後に`bulkUpdateOrder()`で詰める
- 例: `[1, 3]` → `[1, 2]`

---

## 依存関係

**依存先:**
- `openDatabase()`: データベース接続（`@/database/init`）
- `Feed`: 型定義（`@/types/Feed`）

**依存元:**
- `FeedService`: ビジネスロジック層

---

## 実装ファイル

`filto/repositories/FeedRepository.ts`

---

## テスト観点

1. **型変換**
   - UnixTime → ISO8601が正しく変換されるか
   - null → undefinedが正しく変換されるか
   - snake_case ⇔ camelCaseが正しく変換されるか

2. **並び順管理**
   - bulkUpdateOrder()でorder_noが正しく更新されるか
   - トランザクションが機能するか

3. **UNIQUE制約**
   - 同じURLを2回登録しようとするとエラーになるか

4. **カスケード削除**
   - フィード削除時、関連記事も自動削除されるか

---

## データ例

### DB（feedsテーブル）

| id | title | url | icon_url | order_no | created_at |
|----|-------|-----|----------|----------|------------|
| feed_123 | Qiita | https://qiita.com/feed | https://cdn.qiita.com/... | 1 | 1705738400 |
| feed_456 | note.com | https://note.com/rss | https://d2l930y2yx77uc... | 2 | 1705738500 |
| feed_789 | 総務省 | https://www.soumu.go.jp/news.rdf | NULL | 3 | 1705738600 |

### App（Feed型）

```typescript
[
  {
    id: "feed_123",
    title: "Qiita",
    url: "https://qiita.com/feed",
    iconUrl: "https://cdn.qiita.com/...",
    orderNo: 1,
    createdAt: "2026-01-20T10:00:00.000Z",
  },
  {
    id: "feed_456",
    title: "note.com",
    url: "https://note.com/rss",
    iconUrl: "https://d2l930y2yx77uc...",
    orderNo: 2,
    createdAt: "2026-01-20T10:01:40.000Z",
  },
  {
    id: "feed_789",
    title: "総務省",
    url: "https://www.soumu.go.jp/news.rdf",
    iconUrl: undefined,
    orderNo: 3,
    createdAt: "2026-01-20T10:03:20.000Z",
  }
]
```

---

## 今後の改善案

1. **order_no自動詰め**
   - 削除後にorder_noを詰める
   - 欠番をなくす

2. **URL正規化**
   - 末尾の`/`を統一
   - クエリパラメータの処理

3. **更新日時管理**
   - `updated_at`カラムを追加
   - 更新時に自動更新

4. **論理削除**
   - `is_deleted`フラグを追加
   - 物理削除ではなく論理削除

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-20 | 初版作成 |
