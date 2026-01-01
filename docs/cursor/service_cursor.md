> IMPORTANT:
> This task MUST comply with cursor/CONSTRAINTS.md.
> No dependency or configuration changes are allowed.

# Service層 詳細設計（Cursor向け）

## 🧠 Service層 全体方針

### 目的
- UI層からビジネスロジック・DB・外部通信を分離
- 画面はServiceのAPIを呼ぶだけにする
- 将来の課金(Pro)制御もここで吸収

### 構成
```
/services
  - FeedService.ts
  - ArticleService.ts
  - FilterService.ts
  - SettingsService.ts
  - SyncService.ts
  - RssService.ts
  - FilterEngine.ts
```

### 原則
- Serviceはasync関数をexport
- DB操作はRepository/DAOに委譲
- UIに例外は投げず、Result or throwで統一

---

## 🗂 FeedService

### 責務
- RSSフィードのCRUD
- 並び順管理

### Methods
```ts
list(): Promise<Feed[]>
get(id: string): Promise<Feed>
create(feed: FeedInput): Promise<void>
update(feed: Feed): Promise<void>
delete(ids: string[]): Promise<void>
reorder(feeds: Feed[]): Promise<void>
```

### Feed型
```ts
{
  id: string
  title: string
  url: string
  iconUrl?: string
  orderNo: number
  createdAt: string
}
```

### 使用DAO
- FeedRepository

### Cursor指示
Implement FeedService with CRUD and reorder using FeedRepository.
Ensure orderNo is updated on reorder.

---

## 📰 ArticleService

### 責務
- 記事取得・既読管理
- フィード＋フィルタ適用後の記事提供

### Methods
```ts
getArticles(feedId?: string): Promise<Article[]>
markRead(id: string): Promise<void>
markAllRead(feedId?): Promise<void>
saveArticles(articles: Article[]): Promise<void>
clearOld(days: number): Promise<void>
```

### Article型
```ts
{
  id: string
  feedId: string
  feedName: string
  title: string
  link: string
  summary?: string
  publishedAt: string
  isRead: boolean
}
```

### Logic
- `getArticles`:
  - DBから記事取得
  - settings.readDisplay適用
  - FilterEngine.apply()で除外

### 使用
- ArticleRepository
- SettingsService
- FilterEngine

### Cursor指示
Implement ArticleService that returns filtered articles and handles read state.

---

## 🚫 FilterService

### 責務
- フィルタ条件のCRUD

### Methods
```ts
list(): Promise<Filter[]>
get(id: string): Promise<Filter>
save(filter: Filter): Promise<void> // create & update
delete(ids: string[]): Promise<void>
```

### Filter型
```ts
{
  id: string
  name: string
  conditions: ConditionJSON
  createdAt: string
}
```

### 使用DAO
- FilterRepository

### Cursor指示
Implement FilterService with save (upsert) and delete.

---

## 🧩 FilterEngine

### 責務
- 記事に対してフィルタ条件を評価
- true = 表示, false = ブロック

### Methods
```ts
apply(articles: Article[], filters: Filter[]): Article[]
```

### Logic
- 各articleに対して：
  - すべてのfilterを評価
  - 1つでも「ブロック」なら除外

### ConditionJSON
```ts
{
  operator: 'AND' | 'OR',
  rules: [
    { type: 'include' | 'exclude', keyword: string }
  ]
}
```

### 評価仕様

**include:**
- keywordが含まれなければ false

**exclude:**
- keywordが含まれたら false

**operator:**
- AND: 全rule true
- OR: いずれか true

### Cursor指示
Implement pure function FilterEngine to evaluate conditions against article title + summary.

---

## ⚙ SettingsService

### 責務
- 設定の取得・保存

### Methods
```ts
get(): Promise<Settings>
save(settings: Partial<Settings>): Promise<void>
```

### Settings型
```ts
{
  refreshOnLaunch: boolean
  fetchMode: 'manual' | 'low'
  wifiOnly: boolean
  readDisplay: 'dim' | 'hide'
  language: 'ja' | 'en'
  theme: 'light' | 'dark'
  isPro: boolean
}
```

### 使用DAO
- SettingsRepository

### Cursor指示
Implement singleton settings service with get and partial save.

---

## 🔄 SyncService

### 責務
- RSSの一括取得と記事保存
- 更新ロジックの統括

### Methods
```ts
refresh(): Promise<void>
```

### Logic
1. get feeds from FeedService
2. for each feed:
   - fetch articles via RssService
3. merge & deduplicate by link or guid
4. save via ArticleService.saveArticles
5. update lastSyncAt

### 考慮
- 同期中フラグで多重実行防止
- エラーはログして続行

### 使用
- FeedService
- RssService
- ArticleService
- MetaRepository(lastSync)

### Cursor指示
Implement SyncService.refresh to fetch all feeds and persist new articles.

---

## 🌐 RssService

### 責務
- RSS/Atomフィード取得・パース
- メタ情報取得

### Methods
```ts
fetchMeta(url: string): Promise<{ title, iconUrl? }>
fetchArticles(url: string): Promise<ArticleInput[]>
```

### ArticleInput型
```ts
{
  title: string
  link: string
  summary?: string
  publishedAt: string
}
```

### 技術
- fetch API
- xml parser (fast-xml-parser等)

### 考慮
- 文字コード対応
- タイムアウト
- RSS/Atom両対応

### Cursor指示
Implement RSS fetcher with XML parsing and robust error handling.

---

## 🔗 Service間依存

```
UI
 ↓
Home → ArticleService → FilterEngine
Feeds → FeedService
Filters → FilterService
Preferences → SettingsService
Refresh → SyncService → RssService → ArticleService
```