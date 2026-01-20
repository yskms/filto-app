# SyncService 詳細設計書

## 概要

RSSフィードの同期処理を担当するサービス。
全フィードを順次取得し、新規記事を保存する。エラーハンドリング、多重実行防止、進捗管理を実装。

## 責務

- 全フィードのRSS同期
- フィード単位のエラーハンドリング
- 多重実行防止
- 同期結果のレポート

## メソッド仕様

### refresh(): Promise<{ fetched: number; newArticles: number }>

全フィードのRSS同期を実行する。

**戻り値:**
```typescript
{
  fetched: number;      // 同期成功したフィード数
  newArticles: number;  // 新規保存された記事数
}
```

**処理フロー:**
```
1. 多重実行チェック（isRefreshing フラグ）
2. FeedService.list()で全フィード取得
3. 各フィードに対して:
   a. 保存前の記事数を取得
   b. RssService.fetchArticles(url, iconUrl)でRSS取得
   c. ArticleService.saveArticles()で保存（重複チェック込み）
   d. 保存後の記事数を取得
   e. 新規記事数を計算
4. 同期結果を返す
```

**シーケンス図:**
```
[UI] → refresh()
  ↓
[SyncService]
  ├─ isRefreshing? → YES: 即座にreturn { fetched: 0, newArticles: 0 }
  ├─ isRefreshing = true
  ├─ FeedService.list() → feeds[]
  │
  ├─ FOR EACH feed IN feeds:
  │   ├─ beforeCount = getArticles(feed.id).length
  │   ├─ articles = RssService.fetchArticles(feed.url, feed.iconUrl)
  │   ├─ ArticleService.saveArticles(feed.id, feed.title, articles)
  │   ├─ afterCount = getArticles(feed.id).length
  │   ├─ newCount = afterCount - beforeCount
  │   └─ newArticles += newCount
  │
  ├─ isRefreshing = false
  └─ return { fetched, newArticles }
```

**使用例:**
```typescript
// Home画面のPull-to-refresh
const result = await SyncService.refresh();
console.log(`${result.fetched}件のフィードから${result.newArticles}件の新規記事を取得しました`);
```

**ログ出力例:**
```
[SyncService] Start syncing 3 feeds...
[SyncService] Fetching articles from Qiita
[SyncService] Feed URL: https://qiita.com/popular-items/feed
[SyncService] Feed icon URL: https://cdn.qiita.com/...
[SyncService] Fetched 50 articles from Qiita
[SyncService] Saved 50 new articles for Qiita
[SyncService] Fetching articles from note.com
[SyncService] Feed URL: https://note.com/recommend/rss
[SyncService] Feed icon URL: https://d2l930y2yx77uc...
[SyncService] Fetched 50 articles from note.com
[SyncService] Saved 25 new articles for note.com
[SyncService] Fetching articles from 総務省
[SyncService] Feed URL: https://www.soumu.go.jp/news.rdf
[SyncService] Feed icon URL: https://www.google.com/s2/favicons?...
[SyncService] Fetched 20 articles from 総務省
[SyncService] Saved 20 new articles for 総務省
[SyncService] Sync completed: 3/3 feeds, 95 new articles
```

---

## 多重実行防止

**仕組み:**
```typescript
isRefreshing: false  // クラスプロパティ

async refresh() {
  if (this.isRefreshing) {
    return { fetched: 0, newArticles: 0 };
  }
  
  this.isRefreshing = true;
  try {
    // 同期処理
  } finally {
    this.isRefreshing = false;
  }
}
```

**動作:**
- 同期実行中は`isRefreshing = true`
- 新しい同期リクエストは即座に拒否
- `finally`ブロックで確実にフラグをリセット

**ログ出力:**
```
[SyncService] Already refreshing, skipping...
```

---

## エラーハンドリング

### フィード単位のエラーハンドリング

**設計方針:**
- 1つのフィードが失敗しても、他のフィードは継続
- エラーはログ出力のみ
- 成功したフィードのみカウント

**実装:**
```typescript
for (const feed of feeds) {
  try {
    // RSS取得・保存処理
    fetched++;
  } catch (error) {
    console.error(`[SyncService] Failed to fetch feed ${feed.id} (${feed.title}):`, error);
    // 失敗しても継続
  }
}
```

**エラー例:**
```
[SyncService] Failed to fetch feed feed_123 (Example Blog): Error: Request timed out
```

### 全体のエラーハンドリング

**対象:**
- `FeedService.list()`の失敗
- その他予期しないエラー

**実装:**
```typescript
try {
  const feeds = await FeedService.list();
  // 同期処理
} catch (error) {
  console.error('[SyncService] Sync failed:', error);
  throw error;
}
```

---

## 新規記事数の計算

**方法:**
```typescript
// 保存前
const beforeCount = (await ArticleService.getArticles(feed.id)).length;

// 保存
await ArticleService.saveArticles(feed.id, feed.title, articles);

// 保存後
const afterCount = (await ArticleService.getArticles(feed.id)).length;

// 新規記事数
const newCount = afterCount - beforeCount;
```

**なぜこの方法？**
- `ArticleService.saveArticles()`は重複チェックを行う
- 実際に保存された記事数を正確にカウント
- DBを信頼できる情報源として使用

---

## パフォーマンス考慮

### 順次処理 vs 並列処理

**現在の実装:**
- 順次処理（`for...of`ループ）

**理由:**
1. RSSサーバーへの負荷を分散
2. ネットワーク帯域の効率的な利用
3. エラーハンドリングの簡潔性

**将来の改善案:**
- `Promise.allSettled()`による並列処理
- ただし、同時接続数の制限が必要

### タイムアウト

- 各フィードのタイムアウト: 10秒（`RssService`）
- 全体のタイムアウト: なし（すべてのフィードを試行）

**最悪ケースの所要時間:**
```
フィード数 × 10秒 = 最大所要時間
例: 10フィード × 10秒 = 100秒
```

---

## UI連携

### Pull-to-refresh

**Home画面（`app/(tabs)/index.tsx`）:**
```typescript
const handleRefresh = React.useCallback(async () => {
  setRefreshing(true);
  try {
    await SyncService.refresh();
    await loadFilters();
    await loadArticles();
  } catch (error) {
    Alert.alert('エラー', 'RSS取得に失敗しました');
  } finally {
    setRefreshing(false);
  }
}, [loadFilters, loadArticles]);
```

**ユーザー体験:**
1. 下にスワイプ → スピナー表示
2. 同期実行（バックグラウンド）
3. 完了 → 記事リスト更新 → スピナー非表示

---

## フィードアイコンの利用

**重要:**
- `RssService.fetchArticles()`にフィードアイコンURLを渡す
- サムネイルがない記事に対するフォールバック

**コード:**
```typescript
const articles = await RssService.fetchArticles(feed.url, feed.iconUrl);
```

**効果:**
- Qiita記事: Qiitaロゴがサムネイルに
- 総務省記事: 総務省アイコンがサムネイルに

---

## データフロー

```
[UI] → Pull-to-refresh
  ↓
[SyncService.refresh()]
  ├→ FeedService.list() → feeds[]
  │
  ├→ FOR EACH feed:
  │   ├→ ArticleService.getArticles(feed.id) → beforeCount
  │   ├→ RssService.fetchArticles(feed.url, feed.iconUrl) → articles[]
  │   ├→ ArticleService.saveArticles(feed.id, feed.title, articles)
  │   │   ├→ 重複チェック
  │   │   └→ ArticleRepository.insertMany()
  │   │       └→ INSERT OR IGNORE INTO articles
  │   └→ ArticleService.getArticles(feed.id) → afterCount
  │
  └→ return { fetched, newArticles }
```

---

## 依存関係

**依存先:**
- `FeedService`: フィード一覧取得
- `RssService`: RSS取得・パース
- `ArticleService`: 記事保存・取得

**依存元:**
- `app/(tabs)/index.tsx`: Home画面のPull-to-refresh

---

## 実装ファイル

`filto/services/SyncService.ts`

---

## テスト観点

1. **多重実行防止**
   - 同期実行中に新しい同期リクエストが拒否されるか
   - `finally`ブロックで確実にフラグがリセットされるか

2. **エラーハンドリング**
   - 1つのフィードが失敗しても他のフィードは継続するか
   - エラーログが正しく出力されるか

3. **新規記事数計算**
   - 重複記事が正しくカウントされないか
   - 新規記事のみカウントされるか

4. **空フィードリスト**
   - フィードが0件の場合、正常に完了するか

---

## 今後の改善案

1. **並列処理**
   - `Promise.allSettled()`で複数フィードを並列取得
   - 同時接続数を制限（例: 3件まで）

2. **プログレス通知**
   - 現在処理中のフィード数をUIに通知
   - `refresh()`にコールバックを追加

3. **選択的同期**
   - 特定のフィードのみ同期
   - 最終同期時刻ベースの更新

4. **バックグラウンド同期**
   - `expo-task-manager`による定期同期
   - プッシュ通知による新着通知

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-20 | 初版作成（フィードアイコン連携含む） |
