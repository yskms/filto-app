# 📘 CRUD整理

## 📰 FEEDS（フィード）

| 操作 | 画面 / 機能 | 内容 |
|------|------------|------|
| **Create** | FeedAdd | RSS URL登録、タイトル/アイコン取得 |
| **Read** | Home / Feeds / FeedSelect | 一覧表示、記事取得時参照 |
| **Update** | Feeds（並び替え） | order_no更新、フィード情報再取得 |
| **Delete** | Feeds | フィード削除（配下の記事も削除） |

---

## 📝 ARTICLES（記事）

| 操作 | 画面 / 機能 | 内容 |
|------|------------|------|
| **Create** | 同期処理 | RSS取得時に新規保存 |
| **Read** | Home | 記事一覧・詳細表示 |
| **Update** | Home / フィルタ評価 | 既読更新（is_read）、ブロックフラグ更新（is_blocked） |
| **Delete** | メンテナンス | フィード削除時（CASCADE）、古い記事削除 |

※ 通常UIからの「記事手動削除」は想定しない

---

## 🚫 FILTERS（フィルタ）

| 操作 | 画面 / 機能 | 内容 |
|------|------------|------|
| **Create** | FilterEdit（新規） | ブロック/許可条件の追加 |
| **Read** | Filters / フィルタ評価 | フィルタ一覧表示、記事評価時に参照 |
| **Update** | FilterEdit（編集） | 条件の編集（updated_at更新） |
| **Delete** | FilterEdit（編集） / Filters（一括削除） | フィルタ削除 |

### フィルタ評価タイミング
1. グローバル許可リストチェック（最優先）
2. 記事取得時（新規記事）
3. フィルタ追加・編集時（全記事を再評価）
4. グローバル許可キーワード変更時（全記事を再評価）
5. Home画面表示時（is_blocked=0 のみ表示）

### 並び替え
- ブロックキーワード（昇順）- デフォルト
- 作成日時（新しい順/古い順）
- 更新日時（新しい順/古い順）
- 選択状態は `settings.filter_sort_order` に保存

### Pro版制限
- 無料版: 100件まで
- Pro版: 無制限

---

## 🌟 GLOBAL_ALLOW_KEYWORDS（グローバル許可リスト）

| 操作 | 画面 / 機能 | 内容 |
|------|------------|------|
| **Create** | Preferences | キーワード追加（Pro版チェックあり） |
| **Read** | Preferences / フィルタ評価 | キーワード一覧表示、記事評価時に最優先で参照 |
| **Update** | — | 更新は削除+追加で対応 |
| **Delete** | Preferences | キーワード削除 |

### 評価ロジック
```
// 最優先でチェック（すべてのフィルタより優先）
if (global_allow_keywords のいずれかが記事に含まれる) {
  → 表示（無条件で許可）
  → 他のフィルタは無視
}
```

### 使用例
```
グローバル許可リスト:
- "自社名"
- "React"
- "TypeScript"

フィルタ:
- block_keyword: "JavaScript"

記事: "ReactでJavaScriptを学ぶ"
→ "React" がグローバル許可リストにあるため表示
```

### Pro版制限
- 無料版: 3件まで
- Pro版: 無制限

### 再評価トリガー
- キーワード追加時: 全記事を再評価（ブロック解除の可能性）
- キーワード削除時: 全記事を再評価（新たにブロックの可能性）

---

## ⚙ SETTINGS（設定）

| 操作 | 画面 / 機能 | 内容 |
|------|------------|------|
| **Create** | 初回起動 | 初期設定レコード作成 |
| **Read** | Preferences / 各種機能 | 設定値参照 |
| **Update** | Preferences / Filters（ソート） | 言語、テーマ、同期設定、フィルタ並び順など更新 |
| **Delete** | — | 原則削除しない |

### 主要設定項目
- `theme`: ライト/ダーク/システム
- `language`: 日本語/英語
- `auto_refresh_on_launch`: 起動時更新ON/OFF
- `filter_sort_order`: フィルタ並び順
- `pro_enabled`: Pro版有効フラグ
- `pro_expires_at`: Pro版期限（将来）

---

## 🗃 META（メタ情報）

| 操作 | 機能 | 内容 |
|------|------|------|
| **Create** | 初回/同期 | last_fetch_at, db_version など登録 |
| **Read** | 同期処理 | 最終取得時刻など参照 |
| **Update** | 同期後 | 値更新 |
| **Delete** | — | 原則削除しない |

---

## 🧭 画面 × CRUD 対応表（詳細）

| 画面 / 機能 | FEEDS | ARTICLES | FILTERS | GLOBAL_ALLOW | SETTINGS | META |
|------------|-------|----------|---------|--------------|----------|------|
| **Home** | R | R/U | R | R | R | R |
| **FeedSelect（モーダル）** | R | — | — | — | — | — |
| **Feeds管理** | C/R/U/D | D | — | — | — | — |
| **FeedAdd** | C | — | — | — | — | — |
| **Filters** | — | — | R/D | — | R | — |
| **FilterSort（モーダル）** | — | — | — | — | U | — |
| **FilterEdit（新規）** | — | — | C | — | — | — |
| **FilterEdit（編集）** | — | — | R/U/D | — | — | — |
| **Settings** | — | — | — | — | R | — |
| **Preferences** | — | — | — | C/R/D | R/U | — |
| **同期処理** | R | C/R/U | R | R | R | R/U |
| **フィルタ評価** | — | U | R | R | — | — |

---

## 🔄 フィルタ評価の全体フロー

```
1. グローバル許可リストを読み込み（キャッシュ可能）
   ↓
2. 各記事に対して:
   a. グローバル許可キーワードに一致？
      → YES: is_blocked = 0（表示）
      → NO: 次へ
   
   b. フィルタを順次評価:
      - block_keyword に一致？
        → YES: allow_keyword をチェック
          → 一致: 次のフィルタへ
          → 不一致: is_blocked = 1（ブロック）
        → NO: 次のフィルタへ
   
   c. すべてのフィルタで評価
      → is_blocked = 0（表示）
```

---

## ✅ ポイント

### UIから直接操作
- **FEEDS**: FeedAdd（C）、Feeds（R/U/D）
- **FILTERS**: FilterEdit（C/R/U/D）、Filters（R/D）、FilterSort（ソート順の保存）
- **GLOBAL_ALLOW_KEYWORDS**: Preferences（C/R/D）
- **SETTINGS**: Preferences（R/U）

### 内部処理メイン
- **ARTICLES**: 同期処理で自動管理、フィルタ評価で is_blocked 更新
- **META**: 同期処理で自動管理

### 削除の種類
1. **個別削除**: スワイプ削除（Feeds / Filters）
2. **一括削除**: 削除モード（Feeds / Filters）
3. **CASCADE削除**: フィード削除時に記事も削除
4. **編集画面から削除**: FilterEdit の削除ボタン
5. **Preferences から削除**: グローバル許可キーワードの個別削除

### Pro版制限チェックのタイミング
- **フィルタ追加時**: 件数確認（100件制限）
- **グローバル許可キーワード追加時**: 件数確認（3件制限）
- **どちらも**: 制限到達時に Pro 版誘導ダイアログ表示

### パフォーマンス最適化
- **グローバル許可リスト**: 起動時に読み込み、メモリキャッシュ
- **フィルタ評価**: バッチ処理で一括更新
- **インデックス**: 検索が頻繁な箇所に設定

### 課金・Pro対応時
- CRUD自体はほぼ増えず、制限ロジックが増えるだけで済む構成
- 例: 追加時に件数チェック → 制限超過なら Pro 誘導