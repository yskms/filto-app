 
## Service層 詳細設計書（Draft）

---

## 1. 概要

本ドキュメントは、Service 層の設計を定義する。  
Service層は、UI層とデータ層（Repository / DAO）、外部通信（RSS取得）の間に位置し、  
アプリケーションのビジネスロジックを集約する。

### 目的
- UIからビジネスロジックを分離する
- データ取得・加工・保存処理を一元化する
- 将来の課金（Pro対応）や仕様変更に耐えられる構造とする

### 設計方針
- TypeScriptで実装
- 各Serviceは async な関数群として提供
- DB操作はRepository層に委譲
- UIはServiceのAPIのみを呼び出す
- Service同士は必要最小限で連携する

---

## 2. ディレクトリ構成

```
/services
  ├─ FeedService.ts
  ├─ ArticleService.ts
  ├─ FilterService.ts
  ├─ FilterEngine.ts
  ├─ SettingsService.ts
  ├─ SyncService.ts
  └─ RssService.ts
```

---

## 3. 各Service設計

---

### 3.1 FeedService

#### 概要
RSSフィードの管理（CRUD）および並び順の制御を行う。

#### 責務
- フィード一覧取得
- フィード追加・更新・削除
- 並び順の保存

#### 提供API

```ts
list(): Promise<Feed[]>
get(id: string): Promise<Feed>
create(input: FeedInput): Promise<void>
update(feed: Feed): Promise<void>
delete(ids: string[]): Promise<void>
reorder(feeds: Feed[]): Promise<void>
```

#### Feed型

```ts
type Feed = {
  id: string
  title: string
  url: string
  iconUrl?: string
  orderNo: number
  createdAt: string
}
```

#### 処理概要
- `list()`: orderNo 昇順で取得
- `reorder()`: 配列順に orderNo を再設定して保存
- `delete()`: 指定IDのフィードを論理 or 物理削除

#### 依存
- FeedRepository

---

### 3.2 ArticleService

#### 概要
記事データの取得、既読管理、フィルタ適用後の記事提供を行う。

#### 責務
- 記事一覧取得
- 既読状態管理
- RSS取得後の記事保存
- フィルタ適用ロジックの統合

#### 提供API

```ts
getArticles(feedId?: string): Promise<Article[]>
markRead(id: string): Promise<void>
markAllRead(feedId?: string): Promise<void>
saveArticles(articles: Article[]): Promise<void>
clearOld(days: number): Promise<void>
```

#### Article型

```ts
type Article = {
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

#### 処理概要
`getArticles()`:
- DBから記事取得
- SettingsServiceから既読表示設定を取得
- FilterEngineでフィルタ適用
- 表示用配列を返却

`markRead()`: isRead を true に更新

#### 依存
- ArticleRepository
- SettingsService
- FilterService / FilterEngine

---

### 3.3 FilterService

#### 概要
ユーザー定義のフィルタ条件を管理する。

#### 責務
- フィルタ条件のCRUD

#### 提供API

```ts
list(): Promise<Filter[]>
get(id: string): Promise<Filter>
save(filter: Filter): Promise<void>
delete(ids: string[]): Promise<void>
```

#### Filter型

```ts
type Filter = {
  id: string
  name: string
  conditions: ConditionJSON
  createdAt: string
}
```

#### 処理概要
- `save()`: id有無で insert / update を切替

#### 依存
- FilterRepository

---

### 3.4 FilterEngine

#### 概要
記事がフィルタ条件に一致するかを評価する純粋ロジック。

#### 責務
- 記事に対する条件評価
- 表示可否の判定

#### 提供API

```ts
apply(articles: Article[], filters: Filter[]): Article[]
```

#### ConditionJSON形式

```json
{
  "operator": "AND",
  "rules": [
    { "type": "include", "keyword": "FX" },
    { "type": "exclude", "keyword": "仮想通貨" }
  ]
}
```

#### 評価仕様

**include:**
- keyword が本文に含まれない → false

**exclude:**
- keyword が本文に含まれる → false

**operator:**
- AND: 全ルールtrueでtrue
- OR: いずれかtrueでtrue

※ 本文対象： title + summary

---

### 3.5 SettingsService

#### 概要
アプリ全体設定の取得・保存を行う。

#### 責務
- 設定の永続化
- 部分更新対応

#### 提供API

```ts
get(): Promise<Settings>
save(settings: Partial<Settings>): Promise<void>
```

#### Settings型

```ts
type Settings = {
  refreshOnLaunch: boolean
  fetchMode: 'manual' | 'low'
  wifiOnly: boolean
  readDisplay: 'dim' | 'hide'
  language: 'ja' | 'en'
  theme: 'light' | 'dark'
  isPro: boolean
}
```

#### 依存
- SettingsRepository

---

### 3.6 SyncService

#### 概要
全フィードのRSSを取得し、記事を保存する同期処理を司る。

#### 責務
- RSS一括取得
- 記事のマージ・保存
- 同期状態管理

#### 提供API

```ts
refresh(): Promise<void>
```

#### 処理概要
1. FeedService.list() で全フィード取得
2. 各feedに対して RssService.fetchArticles()
3. link/guidで重複排除
4. ArticleService.saveArticles() で保存
5. lastSyncAt 更新

#### 考慮
- 多重実行防止フラグ
- エラー時も他フィードは継続

#### 依存
- FeedService
- RssService
- ArticleService
- MetaRepository

---

### 3.7 RssService

#### 概要
RSS/Atomフィードの取得・解析を行う。

#### 責務
- フィードメタ情報取得
- 記事一覧の取得・パース

#### 提供API

```ts
fetchMeta(url: string): Promise<{ title: string; iconUrl?: string }>
fetchArticles(url: string): Promise<ArticleInput[]>
```

#### ArticleInput型

```ts
type ArticleInput = {
  title: string
  link: string
  summary?: string
  publishedAt: string
}
```

#### 技術要素
- fetch API
- XMLパーサ利用
- RSS/Atom両対応

#### 考慮
- 文字コード
- タイムアウト
- パース失敗時の例外処理

---

## 4. Service間依存関係

```
UI
 ↓
Home → ArticleService → FilterEngine
Feeds → FeedService
Filters → FilterService
Preferences → SettingsService
Refresh → SyncService → RssService → ArticleService
```

---

## 5. 将来拡張（Pro対応）

- Settings.isPro を参照して機能制御
- Pro限定機能はService内でガード
- 課金Service追加時もUI影響を最小化

---

## 6. 備考

- Repository層の設計は別ドキュメントにて定義する
- Service層はユニットテスト可能な設計とする
