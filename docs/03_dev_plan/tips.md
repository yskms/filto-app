# 開発Tips

開発中に気づいた知見を簡潔にメモ。

---

## Expo Router

### ファイル命名
- `edit.tsx` を推奨（`filter_edit.tsx` ではなく）
- 理由：URL が短い（`/filters/edit`）、Expo Router / Next.js の慣例
- しかし、
- **フォルダ名がタブ名と重複すると予期しない動作**になることがあると判明！
  → `app/filters/edit.tsx` はボトムタブに表示されてしまった。`app/filter_edit.tsx` だと問題なし
  → 慣例に反して`filter_edit.tsx` を採用した

### 新規・編集の判定
```typescript
const { filterId } = useLocalSearchParams<{ filterId?: string }>();
// filterId が undefined → 新規、あり → 編集
```

---

## SQLite

### Boolean型
- SQLite に Boolean 型はない → INTEGER (0 or 1) で保存
- 保存：`target_title: targetTitle ? 1 : 0`
- 読込：`targetTitle: filter.target_title === 1`

### 日時
- UnixTime（秒）で統一
- 保存：`Math.floor(Date.now() / 1000)`
- 読込：`new Date(timestamp * 1000)`

### カンマ区切りデータ
- DB保存：改行 → カンマ（`split('\n').join(',')`)
- 表示用：カンマ → 改行（`split(',').join('\n')`)

---

## UI

### 複数行入力（改行区切り）
- `<TextInput multiline numberOfLines={4} />` で実装
- タグUIは将来検討、シンプルさ優先

### チェックボックス
- テキストベース：`{checked ? '☑' : '☐'}`
- または Ionicons：`checkbox` / `square-outline`

---

## 設計判断

### なぜ1フィルタ=1ブロックキーワード？
- フィルタ一覧が見やすい
- 個別編集・無効化が可能
- ロジックがシンプル
- 複数ブロックしたい場合は複数フィルタを作成

### なぜブロックキーワードの重複を許可？
- 同じキーワードでも異なる許可条件で管理したい場合がある
- 例：FX → 仮想通貨は許可、FX → web3は許可
- ソート機能で重複確認可能

---

## その他

### 命名の軸は「層ごとに違う」
① 画面（UI層）
- ルーティング・URL・人間の操作が基準
  filters.tsx
  filter_edit.tsx
- snake_case / 小文字が多い（expo-router と相性◎）

② Service 層（ロジック）
- 「責務（役割）」が基準
  FilterService.ts
  FeedService.ts
- 「〜を扱う責任を持つクラス」
- 👉 ファイル名 = クラス名 = 責務名

---
