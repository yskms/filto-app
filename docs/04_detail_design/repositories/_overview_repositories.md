# Repository層 全体像

## 概要

本ドキュメントは、SQLite を用いたデータ永続化を担う Repository 層の全体設計を定義する。

Repository層は Service層から呼び出され、DBに対するCRUD操作を行う責務を持つ。

---

## 設計方針

- SQLite をローカルDBとして使用
- expo-sqlite を利用
- Repository = ドメイン単位の窓口
- Service層は SQL を直接書かない
- 型安全なデータ変換を実装

---

## ディレクトリ構成

```
/repositories
  ├─ FeedRepository.ts
  ├─ ArticleRepository.ts
  ├─ FilterRepository.ts
  ├─ GlobalAllowKeywordsRepository.ts
  ├─ SettingsRepository.ts
  └─ MetaRepository.ts

/database
  ├─ init.ts
  └─ migrations.ts
```

---

## 各Repository設計

---

### FeedRepository

#### 対象テーブル
- feeds

#### 責務
- フィード情報のCRUD
- 並び順の更新

#### 提供API

```ts
list(): Promise<Feed[]>
get(id: string): Promise<Feed | null>
insert(feed: Feed): Promise<void>
update(feed: Feed): Promise<void>
delete(ids: string[]): Promise<void>
bulkUpdateOrder(feeds: Feed[]): Promise<void>
```

#### 補足
- `list()`: order_no 昇順
- `bulkUpdateOrder()`: トランザクションで一括更新

---

### ArticleRepository

#### 対象テーブル
- articles

#### 責務
- 記事データの保存・取得・更新

#### 提供API

```ts
listAll(): Promise<Article[]>
listByFeed(feedId: string): Promise<Article[]>
insertMany(articles: Article[]): Promise<void>
markRead(id: string): Promise<void>
markAllRead(feedId?: string): Promise<void>
deleteOld(beforeDate: string): Promise<void>
existsByLink(link: string): Promise<boolean>
```

#### 補足
- `insertMany()`: 重複はService側で排除
- `existsByLink()`: dedupe用途

---

### FilterRepository

#### 対象テーブル
- filters

#### 詳細設計
→ [`filter_repository.md`](./filter_repository.md)

#### 責務
- フィルタ条件のCRUD
- ソート付き取得

#### 提供API

```ts
list(): Promise<Filter[]>
listWithSort(sortType: FilterSortType): Promise<Filter[]>
get(id: number): Promise<Filter | null>
create(filter: Omit<Filter, 'id'>): Promise<number>
update(filter: Filter): Promise<void>
delete(id: number): Promise<void>
count(): Promise<number>
```

---

### GlobalAllowKeywordsRepository

#### 対象テーブル
- global_allow_keywords

#### 責務
- グローバル許可キーワードのCRUD
- Pro版制限チェック

#### 提供API

```ts
list(): Promise<GlobalAllowKeyword[]>
create(keyword: string): Promise<number>
delete(id: number): Promise<void>
count(): Promise<number>
```

#### GlobalAllowKeyword型

```ts
interface GlobalAllowKeyword {
  id: number
  keyword: string
  created_at: number
}
```

---

### SettingsRepository

#### 対象テーブル
- settings

#### 責務
- 設定の取得・保存（基本1レコード）

#### 提供API

```ts
get(): Promise<Settings>
save(settings: Partial<Settings>): Promise<void>
```

#### 補足
- 初回はデフォルト値でinsert
- 常に1レコード運用

---

### MetaRepository

#### 対象テーブル
- meta

#### 責務
- 同期時刻などメタ情報管理

#### 提供API

```ts
get(key: string): Promise<string | null>
set(key: string, value: string): Promise<void>
```

---

## DB初期化・マイグレーション

### database/init.ts

**責務**:
- SQLite接続管理
- テーブル作成
- インデックス作成

**主な関数**:
```ts
openDatabase(): SQLiteDatabase
initDatabase(): Promise<void>
```

### database/migrations.ts（将来）

**責務**:
- スキーマバージョン管理
- マイグレーション実行

---

## Service層との関係

```
Service → Repository → SQLite
```

Service層は**Repositoryのみを参照**し、SQLには依存しない。

---

## データベーススキーマ

詳細は [`../../02_basic_design/03_db_design.md`](../../02_basic_design/03_db_design.md) を参照。

### filters

```sql
CREATE TABLE filters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_keyword TEXT NOT NULL,
  allow_keyword TEXT,
  target_title INTEGER NOT NULL DEFAULT 1,
  target_description INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_filters_created_at ON filters(created_at);
CREATE INDEX idx_filters_updated_at ON filters(updated_at);
```

### feeds

```sql
CREATE TABLE feeds (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  order_no INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
```

### articles

```sql
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL,
  feed_name TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  summary TEXT,
  published_at TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (feed_id) REFERENCES feeds(id)
);
```

### global_allow_keywords

```sql
CREATE TABLE global_allow_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
```

### settings

```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  refresh_on_launch INTEGER NOT NULL DEFAULT 1,
  fetch_mode TEXT NOT NULL DEFAULT 'manual',
  wifi_only INTEGER NOT NULL DEFAULT 1,
  read_display TEXT NOT NULL DEFAULT 'dim',
  language TEXT NOT NULL DEFAULT 'ja',
  theme TEXT NOT NULL DEFAULT 'light',
  is_pro INTEGER NOT NULL DEFAULT 0
);
```

### meta

```sql
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

---

## パフォーマンス最適化

### インデックス戦略

**filters**:
- `created_at` - ソート用
- `updated_at` - ソート用

**articles**:
- `feed_id` - フィード別取得
- `published_at` - 日時ソート
- `is_read` - 既読フィルタ

**feeds**:
- `order_no` - 並び順

### トランザクション

複数行の一括操作はトランザクションで保護：
- フィード並び替え（bulkUpdateOrder）
- 記事一括保存（insertMany）
- 一括削除

---

## テストケース

各Repositoryは以下をテスト：

- [ ] CRUD操作の正常系
- [ ] エラーケース（存在しないID、制約違反など）
- [ ] トランザクションの整合性
- [ ] パフォーマンス（1000件のデータで < 100ms）

---

## 将来の拡張

### ORM導入検討

- TypeORM
- Prisma
- Drizzle

メリット:
- 型安全性向上
- マイグレーション管理
- クエリビルダー

デメリット:
- パフォーマンスオーバーヘッド
- 学習コスト

---

## 備考

- Repositoryはユニットテスト可能な設計とする
- 将来ORM導入時も差し替えやすい構造とする
- Service層の設計は [`../services/_overview_services.md`](../services/_overview_services.md) を参照