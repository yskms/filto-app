# ArticleService 詳細設計書

## 概要

記事データの取得・保存のビジネスロジックを提供するサービス。
ArticleRepositoryのラッパーとして機能し、アプリケーション層に記事データアクセスの統一されたインターフェースを提供する。

## 責務

- 記事一覧の取得（全件/フィード別）
- 記事の保存（重複チェック付き）
- 記事の既読管理

## メソッド仕様

### getArticles(feedId?: string): Promise<Article[]>

記事一覧を取得する。

**パラメータ:**
- `feedId` (optional): フィードID。指定時はそのフィードの記事のみ取得、未指定時は全記事取得

**戻り値:**
- `Promise<Article[]>`: 記事の配列（published_at降順）

**処理フロー:**
```
feedIdが指定されている?
  YES → ArticleRepository.listByFeed(feedId)
  NO  → ArticleRepository.listAll()
```

**使用例:**
```typescript
// 全記事取得
const allArticles = await ArticleService.getArticles();

// 特定フィードの記事取得
const qiitaArticles = await ArticleService.getArticles('feed_123');
```

---

### saveArticles(feedId: string, feedName: string, articles: Article[]): Promise<void>

記事を一括保存する。重複チェックを行い、新規記事のみ保存する。

**パラメータ:**
- `feedId`: フィードID
- `feedName`: フィード名
- `articles`: 保存する記事の配列（RssServiceから取得したもの）

**処理フロー:**
```
1. 引数のarticlesにfeedIdとfeedNameを設定
2. 既存記事を取得（ArticleRepository.listByFeed）
3. linkで重複チェック
4. 新規記事のみをフィルタリング
5. ArticleRepository.insertMany()で一括保存
```

**重複チェック:**
- 同じfeedIdのlinkが既に存在する場合は保存しない
- `Set`を使った高速な重複チェック

**使用例:**
```typescript
// RSSから取得した記事を保存
const articles = await RssService.fetchArticles(feedUrl);
await ArticleService.saveArticles(feedId, feedName, articles);
```

**注意事項:**
- RssServiceから取得した記事は`feedId`と`feedName`が空文字列
- このメソッドで適切な値を設定してから保存
- INSERT OR IGNOREによる二重保存防止はRepository層で実施

---

### markRead(id: string): Promise<void>

記事を既読にする。

**パラメータ:**
- `id`: 記事ID

**処理フロー:**
```
ArticleRepository.markRead(id)を呼び出すだけ
```

**使用例:**
```typescript
// 記事をタップして開いた時
await ArticleService.markRead(article.id);
```

---

## データフロー

```
[UI層]
  ↓ getArticles()
[ArticleService]
  ↓ listAll() / listByFeed()
[ArticleRepository]
  ↓ SQL SELECT
[SQLite Database]
```

```
[RssService] → fetchArticles()
  ↓
[SyncService] → articles (feedId, feedNameが空)
  ↓ saveArticles()
[ArticleService] → feedId, feedNameを設定 + 重複チェック
  ↓ insertMany()
[ArticleRepository]
  ↓ INSERT OR IGNORE
[SQLite Database]
```

---

## エラーハンドリング

- Repository層のエラーをそのままスロー
- 呼び出し側（UI層/SyncService）でcatch

---

## 依存関係

**依存先:**
- `ArticleRepository`: データアクセス層
- `Article`: 型定義

**依存元:**
- `SyncService`: RSS同期時の記事保存
- `app/(tabs)/index.tsx`: Home画面での記事表示
- その他の画面コンポーネント

---

## 実装ファイル

`filto/services/ArticleService.ts`

---

## テスト観点

1. **getArticles()**
   - feedId指定あり/なしで正しいメソッドが呼ばれるか
   - 取得結果が正しく返されるか

2. **saveArticles()**
   - feedIdとfeedNameが正しく設定されるか
   - 重複記事がフィルタリングされるか
   - 空配列の場合、何もしないか

3. **markRead()**
   - Repository層のメソッドが呼ばれるか

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-20 | 初版作成 |
