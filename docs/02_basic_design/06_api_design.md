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
    "site_url": "https://techcrunch.com",
    "icon_url": "https://...",
    "order_no": 1,
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
  "site_url": "https://techcrunch.com",
  "icon_url": "https://...",
  "order_no": 3,
  "created_at": "2025-12-24T10:00:00Z"
}
```

---

### ✏ フィード更新（並び替え含む）

**`PUT /api/feeds/{id}`**

**Request**

```json
{
  "title": "TechCrunch JP",
  "order_no": 2
}
```

**Response**

```json
{
  "id": 1,
  "title": "TechCrunch JP",
  "order_no": 2
}
```

---

### ❌ フィード削除

**`DELETE /api/feeds/{id}`**

**Response**

```json
{
  "success": true,
  "deleted_articles": 42
}
```

---

## 📝 Articles API

### ▶ 記事一覧取得（Home）

**`GET /api/articles`**

**Query**

- `feed_id` (optional) - 特定フィードのみ取得
- `unread_only` (true/false) - 未読のみ
- `include_blocked` (true/false) - ブロック記事を含むか
- `limit`, `offset` - ページネーション

**Response**

```json
[
  {
    "id": 10,
    "feed_id": 1,
    "feed_title": "TechCrunch",
    "title": "React 19 Released",
    "link": "https://...",
    "description": "React 19 brings...",
    "published_at": "2025-12-23T08:00:00Z",
    "fetched_at": "2025-12-24T10:00:00Z",
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

**Response**

```json
{
  "id": 10,
  "is_read": true
}
```

---

### 🧹 フィード配下削除（内部用）

**`DELETE /api/feeds/{id}/articles`**

※ フィード削除時に CASCADE で自動実行

---

## 🚫 Filters API

### ▶ フィルタ一覧

**`GET /api/filters`**

**Query**

- `sort` (optional) - `block_keyword` / `created_asc` / `created_desc` / `updated_asc` / `updated_desc`

**Response**

```json
[
  {
    "id": 1,
    "block_keyword": "広告",
    "allow_keyword": "React,TypeScript",
    "target_title": true,
    "target_description": true,
    "created_at": "2025-12-24T10:00:00Z",
    "updated_at": "2025-12-24T10:00:00Z"
  }
]
```

---

### ➕ フィルタ追加

**`POST /api/filters`**

**Request**

```json
{
  "block_keyword": "広告",
  "allow_keyword": "React,TypeScript",
  "target_title": true,
  "target_description": true
}
```

**Response**

```json
{
  "id": 1,
  "block_keyword": "広告",
  "allow_keyword": "React,TypeScript",
  "target_title": true,
  "target_description": true,
  "created_at": "2025-12-24T10:00:00Z",
  "updated_at": "2025-12-24T10:00:00Z"
}
```

**Pro版チェック**

```json
{
  "error": "無料版では100件までです",
  "current_count": 100,
  "limit": 100,
  "upgrade_required": true
}
```

---

### ✏ 編集

**`PUT /api/filters/{id}`**

**Request**

```json
{
  "block_keyword": "広告",
  "allow_keyword": "React,TypeScript,Next.js",
  "target_title": true,
  "target_description": false
}
```

**Response**

```json
{
  "id": 1,
  "block_keyword": "広告",
  "allow_keyword": "React,TypeScript,Next.js",
  "target_title": true,
  "target_description": false,
  "updated_at": "2025-12-24T11:30:00Z"
}
```

---

### ❌ 削除

**`DELETE /api/filters/{id}`**

**Response**

```json
{
  "success": true
}
```

---

## 🌟 Global Allow Keywords API

### ▶ グローバル許可リスト取得

**`GET /api/global-allow-keywords`**

**Response**

```json
[
  {
    "id": 1,
    "keyword": "自社名",
    "created_at": "2025-12-24T10:00:00Z"
  },
  {
    "id": 2,
    "keyword": "React",
    "created_at": "2025-12-24T10:05:00Z"
  }
]
```

---

### ➕ キーワード追加

**`POST /api/global-allow-keywords`**

**Request**

```json
{
  "keyword": "TypeScript"
}
```

**Response（成功）**

```json
{
  "id": 3,
  "keyword": "TypeScript",
  "created_at": "2025-12-24T11:00:00Z"
}
```

**Response（Pro版制限）**

```json
{
  "error": "無料版では3件までです。Pro版にアップグレードしてください。",
  "current_count": 3,
  "limit": 3,
  "upgrade_required": true
}
```

---

### ❌ キーワード削除

**`DELETE /api/global-allow-keywords/{id}`**

**Response**

```json
{
  "success": true
}
```

---

### 📊 件数取得

**`GET /api/global-allow-keywords/count`**

**Response**

```json
{
  "count": 2,
  "limit": 3,
  "is_pro": false
}
```

---

## ⚙ Settings API

### ▶ 設定取得

**`GET /api/settings`**

**Response**

```json
{
  "auto_refresh_on_launch": true,
  "fetch_interval": "manual",
  "min_fetch_interval": 30,
  "wifi_only": true,
  "read_display": "dim",
  "theme": "dark",
  "language": "ja",
  "filter_sort_order": "block_keyword",
  "pro_enabled": false,
  "pro_expires_at": null
}
```

---

### ✏ 設定更新

**`PUT /api/settings`**

**Request**

```json
{
  "theme": "light",
  "language": "en",
  "filter_sort_order": "created_desc"
}
```

**Response**

```json
{
  "theme": "light",
  "language": "en",
  "filter_sort_order": "created_desc"
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
  "global_allow_matched": 5,
  "executed_at": "2025-12-24T10:30:00Z"
}
```

**処理内容**

1. 各FeedからRSS取得
2. ARTICLESへ保存
3. グローバル許可リスト取得（キャッシュ）
4. FILTERS評価 → is_blocked更新
   - グローバル許可リストを最優先でチェック
   - ヒットしたら無条件で許可
   - それ以外は通常のフィルタ評価
5. META.last_fetch_at 更新

---

### 🚫 フィルタ再評価

**`POST /api/filters/evaluate`**

**用途**: フィルタ追加・編集・削除、グローバル許可キーワード変更時

**Response**

```json
{
  "evaluated": 120,
  "blocked": 15,
  "allowed_by_global": 8
}
```

**処理内容**

1. グローバル許可リスト取得
2. 全記事を再評価
3. is_blocked 更新

---

## 🗃 Meta API（内部用）

### ▶ メタ取得

**`GET /api/meta`**

**Response**

```json
{
  "last_fetch_at": "2025-12-24T10:30:00Z",
  "db_version": 1
}
```

---

## 🧭 画面 × API対応

| 画面 | 使用API |
|------|---------|
| **Home** | `GET /api/articles`<br>`PUT /api/articles/{id}/read`<br>`POST /api/sync` |
| **Feeds** | `GET /api/feeds`<br>`POST /api/feeds`<br>`PUT /api/feeds/{id}`<br>`DELETE /api/feeds/{id}` |
| **Filters** | `GET /api/filters`<br>`POST /api/filters`<br>`PUT /api/filters/{id}`<br>`DELETE /api/filters/{id}`<br>`POST /api/filters/evaluate` |
| **Display & Behavior / Data Management / Global Allow Keywords** | `GET /api/settings`<br>`PUT /api/settings`<br>`GET /api/global-allow-keywords`<br>`POST /api/global-allow-keywords`<br>`DELETE /api/global-allow-keywords/{id}` |
| **起動/手動更新** | `POST /api/sync` |

---

## ✅ 設計ポイント

### ローカルAPI設計
- `/sync` に処理集約 → UIは「更新」叩くだけ
- Filtersは独立評価API → 後で条件変えても再評価できる
- **グローバル許可リスト**も独立API → Filters再評価を自動トリガー
- Settingsは単一リソース → 行は1レコード前提でシンプル

### Pro版制限
- フィルタ追加時: 100件チェック
- グローバル許可キーワード追加時: 3件チェック
- エラーレスポンスに `upgrade_required: true` を含める

### パフォーマンス
- グローバル許可リストは起動時にキャッシュ
- フィルタ評価はバッチ処理で一括更新
- 同期処理では差分取得を推奨（将来）

### 将来の拡張
- `/auth` - 認証
- `/pro/status` - Pro版状態確認
- `/pro/purchase` - 課金処理
- `/cloud/sync` - クラウド同期
- `/export` - OPML エクスポート
- `/import` - OPML インポート

---

## 🔄 フィルタ評価の詳細フロー

```javascript
// POST /api/filters/evaluate の内部処理

async function evaluateAllArticles() {
  // 1. グローバル許可リスト取得（キャッシュから）
  const globalAllowKeywords = await getGlobalAllowKeywords();
  
  // 2. フィルタ一覧取得
  const filters = await getFilters();
  
  // 3. 全記事を取得
  const articles = await getAllArticles();
  
  let blocked = 0;
  let allowedByGlobal = 0;
  
  // 4. 各記事を評価
  for (const article of articles) {
    let isBlocked = false;
    
    // 4-1. グローバル許可リストチェック（最優先）
    if (matchesAnyKeyword(article, globalAllowKeywords)) {
      allowedByGlobal++;
      isBlocked = false; // 無条件で許可
    } else {
      // 4-2. 通常のフィルタ評価
      for (const filter of filters) {
        if (matchesKeyword(article, filter.block_keyword)) {
          if (filter.allow_keyword) {
            const allowKeywords = filter.allow_keyword.split(',');
            if (matchesAnyKeyword(article, allowKeywords)) {
              continue; // 例外として許可
            }
          }
          isBlocked = true;
          blocked++;
          break;
        }
      }
    }
    
    // 4-3. is_blocked 更新
    await updateArticle(article.id, { is_blocked: isBlocked });
  }
  
  return {
    evaluated: articles.length,
    blocked,
    allowed_by_global: allowedByGlobal
  };
}
```