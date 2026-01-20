# RssService 詳細設計書

## 概要

RSS/Atomフィードの取得・パース機能を提供するサービス。
文字エンコーディング自動検出、複数フォーマット対応、サムネイル画像抽出など、高度なRSS処理機能を実装。

## 責務

- RSS/Atomフィードの取得（文字エンコーディング自動検出）
- フィードメタデータの抽出（タイトル、アイコンURL）
- 記事データのパース（タイトル、リンク、概要、サムネイル、公開日時）
- 複数フォーマットのサポート（RSS 1.0/2.0、Atom）

## 対応フォーマット

| フォーマット | ルート要素 | 対応状況 |
|------------|-----------|---------|
| RSS 2.0 | `<rss><channel>` | ✅ 完全対応 |
| Atom | `<feed>` | ✅ 完全対応 |
| RSS 1.0 (RDF) | `<rdf:RDF>` | ✅ 完全対応 |

## メソッド仕様

### fetchMeta(url: string): Promise<{ title: string; iconUrl?: string }>

フィードのメタデータ（タイトル、アイコンURL）を取得する。

**パラメータ:**
- `url`: フィードURL

**戻り値:**
- `title`: フィードタイトル
- `iconUrl`: フィードアイコンURL（存在する場合）

**アイコンURL抽出の優先順位:**

#### RSS 1.0 (RDF):
1. `<webfeeds:icon>` - WebFeeds拡張
2. `<webfeeds:logo>` - WebFeeds拡張
3. `<image><url>` - 標準
4. Google Favicon API（フォールバック）

#### RSS 2.0:
1. `<webfeeds:icon>` - WebFeeds拡張（note.com対応）
2. `<webfeeds:logo>` - WebFeeds拡張
3. `<image><url>` - 標準
4. Google Favicon API（フォールバック）

#### Atom:
1. `<webfeeds:icon>` - WebFeeds拡張（Qiita対応）
2. `<webfeeds:logo>` - WebFeeds拡張
3. `<icon>` - 標準
4. `<logo>` - 標準
5. `<link rel="icon">` - 標準
6. Google Favicon API（フォールバック）

**Favicon API:**
```typescript
`https://www.google.com/s2/favicons?domain=${domain}&sz=256`
```

**タイムアウト:**
- 10秒（`FETCH_TIMEOUT_MS`）

**使用例:**
```typescript
const meta = await RssService.fetchMeta('https://qiita.com/feed');
// { title: 'Qiita', iconUrl: 'https://cdn.qiita.com/...' }
```

---

### fetchArticles(url: string, feedIconUrl?: string): Promise<Article[]>

フィードから記事一覧を取得する。

**パラメータ:**
- `url`: フィードURL
- `feedIconUrl` (optional): フィードアイコンURL（サムネイルのフォールバックとして使用）

**戻り値:**
- `Promise<Article[]>`: 記事の配列（最大50件）

**Article構造:**
```typescript
{
  id: string;           // 自動生成（article_<timestamp>_<random>_<counter>）
  feedId: string;       // 空文字列（呼び出し側で設定）
  feedName: string;     // 空文字列（呼び出し側で設定）
  title: string;        // 記事タイトル
  link: string;         // 記事URL
  summary?: string;     // 概要（description/content）
  thumbnailUrl?: string; // サムネイル画像URL
  publishedAt: string;  // 公開日時（ISO8601形式）
  isRead: false;        // 常にfalse
}
```

**サムネイルURL抽出の優先順位:**

#### RSS 2.0:
1. `<media:thumbnail>` - Yahoo Media RSS（テキスト・属性両対応）
2. `<media:content>` - Yahoo Media RSS
3. `<enclosure>` - 標準（type="false"も許可、Zenn対応）
4. `<content:encoded>`内の画像 - WordPress
5. `<description>`内の画像 - 標準
6. ~~サイト固有のサムネイル生成（無効化中）~~
7. **フィードアイコン**（`feedIconUrl`）
8. undefined（プレースホルダー表示）

#### Atom:
1. `<link rel="enclosure">` - 標準（type="false"も許可）
2. `<content>`内の画像
3. `<summary>`内の画像
4. ~~サイト固有のサムネイル生成（無効化中）~~
5. **フィードアイコン**（`feedIconUrl`）
6. undefined（プレースホルダー表示）

#### RSS 1.0 (RDF):
1. `<enclosure>` - 標準（type="false"も許可）
2. `<content:encoded>`内の画像
3. `<description>`内の画像
4. ~~サイト固有のサムネイル生成（無効化中）~~
5. **フィードアイコン**（`feedIconUrl`）
6. undefined（プレースホルダー表示）

**画像抽出ロジック:**
```typescript
// HTML内の<img>タグからsrcを抽出
// 優先順位: src > data-src > srcset
// 相対URLは無視（完全なURLのみ）
```

**日時パース:**
- RSS 2.0: `<pubDate>`
- Atom: `<published>` or `<updated>`
- RSS 1.0: `<dc:date>`
- パース失敗時: 現在時刻

**タイムアウト:**
- 10秒（`FETCH_TIMEOUT_MS`）

**使用例:**
```typescript
// 基本的な使用
const articles = await RssService.fetchArticles('https://zenn.dev/feed');

// フィードアイコンをフォールバックとして指定
const articles = await RssService.fetchArticles(
  'https://qiita.com/feed',
  'https://cdn.qiita.com/assets/...'
);
```

---

## 文字エンコーディング対応

### 対応エンコーディング
- UTF-8
- Shift_JIS（日本の政府系サイト対応）
- EUC-JP（はてなブックマーク対応）

### 自動検出ロジック

優先順位：
1. **UTF-8 BOM** - `0xEF 0xBB 0xBF`
2. **XML宣言** - `<?xml encoding="..."?>`
3. **ドメインベース**:
   - `.go.jp` → UTF-8（最近のサイトはUTF-8が多い）
   - `hatena.ne.jp` → EUC-JP
4. **デフォルト** - UTF-8

### デコード処理

**使用ライブラリ:**
- `encoding-japanese`: Shift_JIS、EUC-JPに対応（React Native互換）

**処理フロー:**
```
1. fetch()でArrayBufferとして取得
2. Uint8Arrayに変換
3. detectEncoding()でエンコーディング検出
4. encoding-japaneseでデコード
5. XMLパーサーに渡す
```

**特殊対応:**
- Content-Typeヘッダーのcharsetもチェック
- XML宣言のencodingもチェック（複数エンコーディングで試行）

---

## 内部ヘルパー関数

### getText(value: unknown): string | undefined

XMLノードから文字列テキストを抽出する。

**対応形式:**
- 文字列: そのまま返す
- 数値: 文字列に変換
- オブジェクト: `#text`, `text`, `__cdata`を順にチェック

### ensureArray<T>(value: T | T[]): T[]

値を配列に正規化する。

**用途:**
- XMLパーサーは単一要素を配列にしない場合がある
- 統一的な処理のため配列化

### toIsoDateOrNow(dateLike: unknown): string

日時を ISO8601 形式に変換する。

**処理:**
1. getText()で文字列抽出
2. new Date()でパース
3. NaNの場合は現在時刻
4. toISOString()で返す

### extractImageUrl(html: string | undefined): string | undefined

HTML文字列から画像URLを抽出する。

**抽出対象:**
1. `<img src="...">`
2. `<img data-src="...">` - Lazy loading対応
3. `<img srcset="...">` - レスポンシブ対応

**制約:**
- 完全なURL（http/https）のみ
- 相対URLは無視

### generateThumbnailFromUrl(link: string): string | undefined

サイト固有のサムネイルURLを生成する（現在無効化）。

**フラグ:**
```typescript
const USE_SITE_SPECIFIC_THUMBNAILS = false;
```

**有効化すると:**
- Qiita: `https://cdn.qiita.com/assets/qiita-fb-...png`
- 総務省: `https://www.soumu.go.jp/main_content/...jpg`

**使い方:**
- `USE_SITE_SPECIFIC_THUMBNAILS = true`に変更するだけ

---

## XMLパーサー設定

```typescript
new XMLParser({
  ignoreAttributes: false,    // 属性も取得
  attributeNamePrefix: '@_',  // 属性には@_プレフィックス
  processEntities: true,      // 数値文字参照をデコード
  htmlEntities: true,         // HTMLエンティティもデコード
});
```

---

## エラーハンドリング

**スロー条件:**
- ネットワークエラー
- タイムアウト（10秒）
- XMLパースエラー
- 未対応フォーマット

**エラーメッセージ:**
```typescript
'HTTP error: {status} {statusText}'
'Request timed out'
'Failed to parse feed title (RSS X.X)'
'Unsupported feed format (not RSS 1.0, RSS 2.0 nor Atom)'
```

---

## パフォーマンス最適化

1. **最大記事数制限**: 50件（`MAX_ARTICLES`）
2. **タイムアウト**: 10秒で強制終了
3. **エンコーディング検出**: 複数試行だが早期成功を期待
4. **画像抽出**: 最初に見つかった画像を使用

---

## ログ出力

```
[RssService] Fetching URL: https://example.com/feed
[RssService] Response status: 200 OK
[RssService] Detected encoding: utf-8
[RssService] Decoded with UTF-8, text length: 12345
[RssService] RSS 2.0 format, 50 items
[RssService] Found image from media:thumbnail: https://...
[RssService] Parsed 50 articles from RSS 2.0
```

---

## 依存関係

**依存先:**
- `fast-xml-parser`: XMLパース
- `encoding-japanese`: 文字エンコーディング変換
- `Article`: 型定義

**依存元:**
- `FeedService`: RSS自動検出
- `SyncService`: RSS同期処理
- `feed_add.tsx`: フィード追加画面

---

## 実装ファイル

`filto/services/RssService.ts`

---

## テスト観点

1. **文字エンコーディング**
   - UTF-8、Shift_JIS、EUC-JPが正しくデコードされるか
   - BOM、XML宣言、ドメインベースの検出が機能するか

2. **フォーマット対応**
   - RSS 1.0/2.0、Atomが正しくパースされるか
   - 未対応フォーマットで適切なエラーがスローされるか

3. **サムネイル抽出**
   - 各フォーマットの優先順位が正しいか
   - HTML内の画像抽出が機能するか
   - フォールバックが正しく動作するか

4. **エラーハンドリング**
   - タイムアウトが機能するか
   - ネットワークエラーで適切な例外がスローされるか

---

## 既知の制限事項

1. **Shift_JIS簡易実装**
   - 一部の漢字は完全な変換テーブルがない
   - 主要文字（ひらがな、カタカナ、よく使う漢字）は対応

2. **相対URLの画像**
   - 相対URLのサムネイルは無視される
   - 完全なURL（http/https）のみ対応

3. **HTMLパース**
   - 正規表現ベースの簡易実装
   - 複雑なHTMLには非対応

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-20 | 初版作成 |
