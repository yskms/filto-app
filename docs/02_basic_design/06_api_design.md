# 📘 API設計方針

- REST風
- JSON
- ベース: `/api`
- 同期・評価などは 専用アクションAPI を用意
- 認証なし（ローカル前提）
- 将来Pro/クラウド対応でも拡張しやすい構成

---

## 📰 Feeds API

### ▶ フィード一覧取得

**`GET /api/feeds`**

**Response**

```json
[
  {
    "id": 1,
    "title": "TechCrunch",
    "url": "https://techcrunch.com/feed/",
    "icon_url": "https://...",
    "sort_order": 1,
    "created_at": "2025-12-24T10:00:00Z"
  }
]
```

---

### ➕ フィード追加

**`POST /api/feeds`**

**Request**

```json
{
  "url": "https://techcrunch.com/feed/"
}
```

**Response**

```json
{
  "id": 1,
  "title": "TechCrunch",
  "url": "https://techcrunch.com/feed/",
  "icon_url": "https://...",
  "sort_order": 3
}
```

---

### ✏ フィード更新（並び替え含む）

**`PUT /api/feeds/{id}`**

**Request**

```json
{
  "title": "TechCrunch JP",
  "sort_order": 2
}
```

---

### ❌ フィード削除

**`DELETE /api/feeds/{id}`**

---

## 📝 Articles API

### ▶ 記事一覧取得（Home）

**`GET /api/articles`**

**Query**

- `feed_id` (optional)
- `unread_only` (true/false)
- `include_blocked` (true/false)
- `limit`, `offset`

**Response**

```json
[
  {
    "id": 10,
    "feed_id": 1,
    "title": "React 19 Released",
    "link": "https://...",
    "published_at": "2025-12-23T08:00:00Z",
    "is_read": false,
    "is_blocked": false
  }
]
```

---

### ✔ 既読更新

**`PUT /api/articles/{id}/read`**

**Request**

```json
{
  "is_read": true
}
```

---

### 🧹 フィード配下削除（内部用）

**`DELETE /api/feeds/{id}/articles`**

---

## 🚫 Filters API

### ▶ フィルタ一覧

**`GET /api/filters`**

**Response**

```json
[
  {
    "id": 1,
    "name": "新卒ブロック",
    "block_keywords": ["新卒"],
    "allow_keywords": ["react"],
    "created_at": "2025-12-24T10:00:00Z"
  }
]
```

---

### ➕ フィルタ追加

**`POST /api/filters`**

**Request**

```json
{
  "name": "新卒ブロック",
  "block_keywords": ["新卒"],
  "allow_keywords": ["react"]
}
```

---

### ✏ 編集

**`PUT /api/filters/{id}`**

**Request**

```json
{
  "name": "新卒求人除外",
  "block_keywords": ["新卒", "26卒"],
  "allow_keywords": ["react"]
}
```

---

### ❌ 削除

**`DELETE /api/filters/{id}`**

---

## ⚙ Settings API

### ▶ 設定取得

**`GET /api/settings`**

**Response**

```json
{
  "auto_fetch_on_start": true,
  "min_fetch_interval": 60,
  "fetch_mode": "manual",
  "wifi_only": true,
  "language": "ja",
  "theme": "dark",
  "read_style": "dim",
  "is_pro": false
}
```

---

### ✏ 設定更新

**`PUT /api/settings`**

**Request**

```json
{
  "theme": "light",
  "language": "en"
}
```

---

## 🔄 Sync / Actions API

### 🔃 RSS取得・同期

**`POST /api/sync`**

**Response**

```json
{
  "fetched_feeds": 5,
  "new_articles": 42,
  "blocked_articles": 10,
  "executed_at": "2025-12-24T10:30:00Z"
}
```

**処理内容**

- 各FeedからRSS取得
- ARTICLESへ保存
- FILTERS評価 → is_blocked更新
- META.last_fetch_at 更新

---

### 🚫 フィルタ再評価

**`POST /api/filters/evaluate`**

**Response**

```json
{
  "evaluated": 120,
  "blocked": 15
}
```

---

## 🗃 Meta API（内部用）

### ▶ メタ取得

**`GET /api/meta`**

**Response**

```json
{
  "last_fetch_at": "2025-12-24T10:30:00Z"
}
```

---

## 🧭 画面 × API対応

| 画面 | 使用API |
|------|---------|
| **Home** | `GET /articles`<br>`PUT /articles/{id}/read`<br>`POST /sync` |
| **Feeds** | `GET /feeds`<br>`POST /feeds`<br>`PUT /feeds/{id}`<br>`DELETE /feeds/{id}` |
| **Filters** | `GET /filters`<br>`POST /filters`<br>`PUT /filters/{id}`<br>`DELETE /filters/{id}` |
| **Settings** | `GET /settings`<br>`PUT /settings` |
| **起動/手動更新** | `POST /sync` |

---

## ✅ 設計ポイント

- `/sync` に処理集約 → UIは「更新」叩くだけ
- Filtersは独立評価API → 後で条件変えても再評価できる
- Settingsは単一リソース → 行は1レコード前提でシンプル
- **将来**：
  - `/auth`
  - `/pro/status`
  - `/cloud/sync` を足せば拡張可能
