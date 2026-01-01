# 🗃 DB設計書

**DB**: SQLite（ローカル）  
**目的**: RSS記事の取得・保存・フィルタリング・既読管理・設定をローカルで管理する。

---

## 📌 設計方針

- ローカル完結型（サーバ不要）
- シンプルな正規化
- 将来の Pro 課金や機能拡張に対応可能
- React Native + Expo から扱いやすい構造

---

## 🗂 テーブル一覧

| No | テーブル名 | 概要 |
|----|-----------|------|
| 1 | feeds | RSSフィード管理 |
| 2 | articles | 記事データ |
| 3 | filters | フィルタ条件 |
| 4 | settings | アプリ設定（Key-Value） |
| 5 | meta | 最終取得時刻などメタ情報 |

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
  sort_order    INTEGER NOT NULL,
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
| sort_order | INTEGER | ○ | 並び順 |
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
  summary       TEXT,
  published_at  INTEGER,
  fetched_at    INTEGER NOT NULL,
  is_read       INTEGER NOT NULL DEFAULT 0,
  is_blocked    INTEGER NOT NULL DEFAULT 0,

  UNIQUE(feed_id, link),
  FOREIGN KEY(feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);
```

### 📋 カラム説明

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | INTEGER | ○ | 記事ID |
| feed_id | INTEGER | ○ | 所属フィードID |
| title | TEXT | ○ | 記事タイトル |
| link | TEXT | ○ | 記事URL |
| summary | TEXT | | 概要 |
| published_at | INTEGER | | 公開日時 |
| fetched_at | INTEGER | ○ | 取得日時 |
| is_read | INTEGER | ○ | 既読フラグ（0/1） |
| is_blocked | INTEGER | ○ | フィルタ除外フラグ（0/1） |

---

## ③ filters：フィルタ条件

### 📄 概要
「含まれていたらブロック」「ただしこれがあれば許可」という条件を管理。

### 🧱 定義
```sql
CREATE TABLE filters (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  block_keyword   TEXT NOT NULL,
  allow_keyword   TEXT,
  target_title    INTEGER NOT NULL DEFAULT 1,
  target_summary  INTEGER NOT NULL DEFAULT 1,
  created_at      INTEGER NOT NULL
);
```

### 📋 カラム説明

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | INTEGER | ○ | フィルタID |
| block_keyword | TEXT | ○ | ブロック対象キーワード |
| allow_keyword | TEXT | | 例外キーワード |
| target_title | INTEGER | ○ | タイトル対象（0/1） |
| target_summary | INTEGER | ○ | 概要対象（0/1） |
| created_at | INTEGER | ○ | 作成日時 |

---

## ④ settings：設定（Key-Value）

### 📄 概要
Preferences画面の各種設定を柔軟に保存する。

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
| fetch_interval | "manual" / "30" | 取得頻度 |
| min_fetch_interval | "30" | 最低更新間隔 |
| wifi_only | "1" | WiFi時のみ |
| read_display | "dim" / "hide" | 既読表示 |
| theme | "light" / "dark" / "system" | テーマ |
| language | "ja" / "en" | 言語 |
| pro_enabled | "0" | Pro有効フラグ |

---

## ⑤ meta：メタ情報

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
| last_fetch_at | 最終RSS取得時刻 |

※ settings に含めても可。

---

## 🔗 テーブル関連図（論理）

```
feeds 1 ─── * articles
filters      → articles に適用
settings     （全体設定）
meta         （全体メタ）
```

---

## 🧠 補足

- 記事取得時または表示時に filters を評価し、is_blocked を更新
- Feeds削除時は ON DELETE CASCADE で articles も削除
- UnixTime（秒 or ms）で日時管理

---

## 📎 備考

### 将来拡張例

- articles に is_star, memo
- filters をJSON条件に拡張
- pro_enabled による機能制限
