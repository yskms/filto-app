## Repository / DAO層 詳細設計書（Draft）

---

## 1. 概要

本ドキュメントは、SQLite を用いたデータ永続化を担う Repository / DAO 層の設計を定義する。

Repository層は Service層から呼び出され、DAOを通じてDBに対するCRUD操作を行う責務を持つ。

---

## 2. 設計方針

- SQLite をローカルDBとして使用
- expo-sqlite または互換ライブラリを利用
- Repository = ドメイン単位の窓口
- DAO = テーブル単位のCRUD実装
- Service層は SQL を直接書かない

---

## 3. ディレクトリ構成

```
/repositories
  ├─ FeedRepository.ts
  ├─ ArticleRepository.ts
  ├─ FilterRepository.ts
  ├─ SettingsRepository.ts
  └─ MetaRepository.ts

/dao
  ├─ FeedDao.ts
  ├─ ArticleDao.ts
  ├─ FilterDao.ts
  ├─ SettingsDao.ts
  └─ MetaDao.ts

/db
  ├─ database.ts   // 接続管理
  └─ migrations.ts // 初期DDL
```

---

## 4. 各Repository設計

---

### 4.1 FeedRepository

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

### 4.2 ArticleRepository

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

### 4.3 FilterRepository

#### 対象テーブル
- filters

#### 責務
- フィルタ条件のCRUD

#### 提供API

```ts
list(): Promise<Filter[]>
get(id: string): Promise<Filter | null>
upsert(filter: Filter): Promise<void>
delete(ids: string[]): Promise<void>
```

---

### 4.4 SettingsRepository

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

### 4.5 MetaRepository

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

## 5. DAO層の役割

DAOは以下を担当する。

- SQL文の定義
- SQLite実行
- Row → Entity のマッピング
- トランザクション管理

Repositoryは**DAOをラップ**し、Service向けの意味あるAPIとして提供する。

---

## 6. DB初期化・マイグレーション

**database.ts:**
- SQLite接続
- executeSqlラッパ

**migrations.ts:**
- 初回DDL
- テーブル作成

**対象テーブル：**
- feeds
- articles
- filters
- settings
- meta

---

## 7. Service層との関係

```
Service → Repository → DAO → SQLite
```

Service層は**Repositoryのみを参照**し、DAOやSQLには依存しない。

---

## 8. 備考

- Repositoryはユニットテスト可能な設計とする
- DAOは最小限の責務に留める
- 将来ORM導入時も差し替えやすい構造とする
