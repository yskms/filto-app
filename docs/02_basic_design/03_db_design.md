# 🗃 DB設計書

**DB**: SQLite（ローカル）  
**目的**: RSS記事の取得・保存・フィルタリング・既読管理・設定をローカルで管理する。

---

## 📌 設計方針

- ローカル完結型（サーバ不要）
- シンプルな正規化
- 将来の Pro 課金や機能拡張に対応可能
- React Native + Expo から扱いやすい構造
- 100件以上のグローバル許可キーワードにも対応

---

## 🗂 テーブル一覧

| No | テーブル名 | 概要 |
|----|-----------|------|
| 1 | feeds | RSSフィード管理 |
| 2 | articles | 記事データ |
| 3 | filters | フィルタ条件 |
| 4 | global_allow_keywords | グローバル許可リスト |
| 5 | settings | アプリ設定（Key-Value） |
| 6 | meta | 最終取得時刻などメタ情報 |

---

## ① feeds：フィード管理

### 📄 概要
登録されたRSSフィードの一覧と並び順を管理する。

### 🧱 定義
```sql
CREATE TABLE feeds (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  url           TEXT NOT NULL UNIQUE,
  site_url      TEXT,
  icon_url      TEXT,
  order_no      INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);
```

### 📋 カラム説明

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | INTEGER | ○ | フィードID |
| title | TEXT | ○ | フィード名 |
| url | TEXT | ○ | RSS URL（ユニーク） |
| site_url | TEXT | | サイトURL |
| icon_url | TEXT | | ファビコンURL |
| order_no | INTEGER | ○ | 並び順（ドラッグ＆ドロップで変更） |
| created_at | INTEGER | ○ | 登録日時（UnixTime） |

---

## ② articles：記事

### 📄 概要
RSSから取得した記事を保存し、既読・ブロック状態を管理する。

### 🧱 定義
```sql
CREATE TABLE articles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id       INTEGER NOT NULL,
  title         TEXT NOT NULL,
  link          TEXT NOT NULL,
  description   TEXT,
  published_at  INTEGER,
  fetched_at    INTEGER NOT NULL,
  is_read       INTEGER NOT NULL DEFAULT 0,
  is_blocked    INTEGER NOT NULL DEFAULT 0,

  UNIQUE(feed_id, link),
  FOREIGN KEY(feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);

CREATE INDEX idx_articles_feed_id ON articles(feed_id);
CREATE INDEX idx_articles_fetched_at ON articles(fetched_at);
CREATE INDEX idx_articles_is_blocked ON articles(is_blocked);
```

### 📋 カラム説明

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | INTEGER | ○ | 記事ID |
| feed_id | INTEGER | ○ | 所属フィードID |
| title | TEXT | ○ | 記事タイトル |
| link | TEXT | ○ | 記事URL |
| description | TEXT | | 記事概要 |
| published_at | INTEGER | | 公開日時（UnixTime） |
| fetched_at | INTEGER | ○ | 取得日時（UnixTime） |
| is_read | INTEGER | ○ | 既読フラグ（0/1） |
| is_blocked | INTEGER | ○ | フィルタ除外フラグ（0/1） |

---

## ③ filters：フィルタ条件

### 📄 概要
「含まれていたらブロック」「ただしこれがあれば許可」という条件を管理。

### 🧱 定義
```sql
CREATE TABLE filters (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  block_keyword       TEXT NOT NULL,
  allow_keyword       TEXT,
  target_title        INTEGER NOT NULL DEFAULT 1,
  target_description  INTEGER NOT NULL DEFAULT 1,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

CREATE INDEX idx_filters_created_at ON filters(created_at);
CREATE INDEX idx_filters_updated_at ON filters(updated_at);
```

### 📋 カラム説明

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | INTEGER | ○ | フィルタID |
| block_keyword | TEXT | ○ | ブロック対象キーワード（単一） |
| allow_keyword | TEXT | | 例外キーワード（カンマ区切り） |
| target_title | INTEGER | ○ | タイトル対象（0/1） |
| target_description | INTEGER | ○ | 概要対象（0/1） |
| created_at | INTEGER | ○ | 作成日時（UnixTime） |
| updated_at | INTEGER | ○ | 更新日時（UnixTime） |

### 📝 フィルタロジック

```
// グローバル許可リストを最優先でチェック
if (global_allow_keywords のいずれかが含まれる) {
  → 表示（無条件で許可）
}

// 通常のフィルタ評価
if (記事.title or description に block_keyword が含まれる) {
  if (allow_keyword が指定されている) {
    if (記事.title or description に allow_keyword のいずれかが含まれる) {
      → 表示（例外として許可）
    } else {
      → ブロック（is_blocked = 1）
    }
  } else {
    → ブロック（is_blocked = 1）
  }
}
```

### 📝 並び替え機能

ソート順は以下の5パターン：
1. **ブロックキーワード（昇順）** - デフォルト
2. **作成日時（新しい順）** - created_at DESC
3. **作成日時（古い順）** - created_at ASC
4. **更新日時（新しい順）** - updated_at DESC
5. **更新日時（古い順）** - updated_at ASC

ソート状態は settings テーブルに保存（`filter_sort_order`）

---

## ④ global_allow_keywords：グローバル許可リスト

### 📄 概要
すべてのフィルタより優先して許可するキーワードを管理。
例：自社名、特定の技術名など、絶対にブロックしたくないキーワード。

### 🧱 定義
```sql
CREATE TABLE global_allow_keywords (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword     TEXT NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_global_allow_keyword ON global_allow_keywords(keyword);
```

### 📋 カラム説明

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | INTEGER | ○ | ID |
| keyword | TEXT | ○ | 許可キーワード（ユニーク） |
| created_at | INTEGER | ○ | 登録日時（UnixTime） |

### 📝 使用例

```
global_allow_keywords:
- "自社名"
- "React"
- "TypeScript"
- "Next.js"
... (100件以上も可能)

フィルタ:
- block_keyword: "JavaScript"

記事タイトル: "ReactでJavaScriptを学ぶ"
→ "React" がグローバル許可リストにあるため、表示される
```

### 📝 Pro版制限

- **無料版**: 3件まで
- **Pro版**: 無制限

```sql
-- 件数確認
SELECT COUNT(*) FROM global_allow_keywords;
```

---

## ⑤ settings：設定（Key-Value）

### 📄 概要
Display & Behavior / Data Management などの各種設定を柔軟に保存する。

### 🧱 定義
```sql
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 📋 想定キー一覧

| key | value例 | 説明 |
|-----|---------|------|
| auto_refresh_on_launch | "1" | 起動時更新 |
| fetch_interval | "manual" / "30" | 取得頻度（分） |
| min_fetch_interval | "30" | 最低更新間隔（分） |
| wifi_only | "1" | WiFi時のみ取得 |
| read_display | "dim" / "hide" | 既読表示方法 |
| theme | "light" / "dark" / "system" | テーマ |
| language | "ja" / "en" | 言語 |
| pro_enabled | "0" | Pro有効フラグ |
| pro_expires_at | "1735689600" | Pro期限（UnixTime） |
| filter_sort_order | "block_keyword" / "created_asc" / ... | フィルタ並び順 |

---

## ⑥ meta：メタ情報

### 📄 概要
アプリ全体で1件だけ持つような情報を管理。

### 🧱 定義
```sql
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 📋 想定キー

| key | 説明 |
|-----|------|
| last_fetch_at | 最終RSS取得時刻（UnixTime） |
| db_version | DBバージョン（マイグレーション用） |

---

## 🔗 テーブル関連図（論理）

```
feeds 1 ─── * articles
filters              → articles に適用（評価時）
global_allow_keywords → articles に適用（最優先で評価）
settings             （全体設定）
meta                 （全体メタ）
```

---

## 🧠 補足

### フィルタ評価タイミング
1. **グローバル許可リスト**を最優先でチェック
2. ヒットしたら無条件で許可（他のフィルタを無視）
3. ヒットしなければ通常のフィルタ評価

### フィルタ再評価が必要なタイミング
- 記事取得時（新規記事）
- フィルタ追加・編集時（全記事を再評価）
- **グローバル許可キーワード追加・削除時**（全記事を再評価）

### CASCADE削除
- Feeds削除時は `ON DELETE CASCADE` で articles も削除

### 日時管理
- UnixTime（秒）で統一
- JavaScriptでは `Math.floor(Date.now() / 1000)`

### インデックス
- パフォーマンス重視の箇所に設定
- 特に `global_allow_keywords.keyword` は検索頻度が高い

---

## 🔄 マイグレーション

### 初回リリース時
```sql
-- 001_initial.sql
CREATE TABLE feeds (...);
CREATE TABLE articles (...);
CREATE TABLE filters (...);
CREATE TABLE global_allow_keywords (...);  -- 最初から作成
CREATE TABLE settings (...);
CREATE TABLE meta (...);

-- Indexes
CREATE INDEX ...;
```

### 将来の拡張例
```sql
-- 002_add_global_allow_priority.sql
ALTER TABLE global_allow_keywords ADD COLUMN priority INTEGER DEFAULT 0;

-- 003_add_filter_enabled.sql
ALTER TABLE filters ADD COLUMN is_enabled INTEGER DEFAULT 1;
```

---

## 📎 備考

### Pro版機能設計

#### フィルタ数制限
```typescript
const filterCount = await db.getFirstAsync(
  'SELECT COUNT(*) as count FROM filters'
);

if (!isPro && filterCount >= 100) {
  // Pro版誘導
}
```

#### グローバル許可リスト制限
```typescript
const globalAllowCount = await db.getFirstAsync(
  'SELECT COUNT(*) as count FROM global_allow_keywords'
);

if (!isPro && globalAllowCount >= 3) {
  // Pro版誘導
}
```

### 将来拡張例

#### 記事関連
- `articles.is_star` - お気に入り
- `articles.memo` - メモ機能

#### フィルタ関連
- `filters.is_enabled` - フィルタの有効/無効切り替え
- `filters.order_no` - フィルタの並び替え（ドラッグ＆ドロップ）
- 正規表現対応（Pro版限定）

#### グローバル許可リスト関連
- `global_allow_keywords.priority` - 優先度
- `global_allow_keywords.category` - カテゴリ分け

### パフォーマンス最適化

#### キャッシュ戦略
```typescript
// グローバル許可リストは起動時に一度読み込み、メモリにキャッシュ
class FilterService {
  private globalAllowKeywordsCache: string[] | null = null;
  
  async getGlobalAllowKeywords(): Promise<string[]> {
    if (this.globalAllowKeywordsCache === null) {
      this.globalAllowKeywordsCache = await GlobalAllowKeywordRepository.list();
    }
    return this.globalAllowKeywordsCache;
  }
  
  clearCache() {
    this.globalAllowKeywordsCache = null;
  }
}
```

#### バッチ処理
```typescript
// 記事評価は一括で実行
await db.execAsync(`
  UPDATE articles 
  SET is_blocked = 1 
  WHERE id IN (SELECT id FROM articles_to_block)
`);
```