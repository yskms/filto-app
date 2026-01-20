# FeedSortModal コンポーネント詳細設計書

## 概要

フィード一覧のソート順を選択するモーダルコンポーネント。
FilterSortModalと同じUIパターンで実装。

## 責務

- ソートオプションの表示
- ユーザーの選択を親コンポーネントに通知
- 現在のソート状態を視覚的に表示

## Props

```typescript
interface FeedSortModalProps {
  visible: boolean;          // モーダルの表示/非表示
  currentSort: FeedSortType; // 現在のソート状態
  onClose: () => void;       // モーダルを閉じる
  onSelectSort: (sortType: FeedSortType) => void; // ソート選択時のコールバック
}
```

## FeedSortType

```typescript
export type FeedSortType = 
  | 'created_at_desc'  // 作成日時（新しい順）
  | 'created_at_asc'   // 作成日時（古い順）
  | 'title_asc'        // フィード名（昇順）
  | 'title_desc'       // フィード名（降順）
  | 'url_asc'          // URL（昇順）
  | 'url_desc';        // URL（降順）
```

## UI構成

```
┌────────────────────┐
│ 並び替え            │
├────────────────────┤
│ 作成日時（新しい順）│
│ 作成日時（古い順）  │
│ ▶ フィード名（昇順）│ ← 選択中
│ フィード名（降順）  │
│ URL（昇順）         │
│ URL（降順）         │
└────────────────────┘
```

### デザイン仕様

**モーダル:**
- 背景: 半透明黒（`rgba(0, 0, 0, 0.5)`）
- コンテナ: 中央表示、幅80%（最大400px）
- 背景色: 白（`#fff`）
- 角丸: 12px
- シャドウ: elevation 5

**タイトル:**
- テキスト: 「並び替え」
- フォントサイズ: 18px
- フォントウェイト: 600
- 下ボーダー: 1px、`#e0e0e0`

**オプション項目:**
- フォントサイズ: 16px
- パディング: 垂直14px、水平20px
- 選択中: 左に `▶ ` を表示
- タップでハイライト（activeOpacity: 0.7）

## ソートオプション

| type | label |
|------|-------|
| `created_at_desc` | 作成日時（新しい順） |
| `created_at_asc` | 作成日時（古い順） |
| `title_asc` | フィード名（昇順） |
| `title_desc` | フィード名（降順） |
| `url_asc` | URL（昇順） |
| `url_desc` | URL（降順） |

## 動作仕様

### 表示
- `visible={true}` でモーダル表示
- フェードインアニメーション（`animationType="fade"`）

### ソート選択
1. オプション項目をタップ
2. `onSelectSort(sortType)` が呼ばれる
3. モーダルが自動的に閉じる
4. 親コンポーネント（Feeds画面）でソート実行

### 閉じる
- 背景タップ → `onClose()`
- デバイスの戻るボタン → `onRequestClose()`

## 使用例

```typescript
const [sortModalVisible, setSortModalVisible] = useState(false);
const [currentSort, setCurrentSort] = useState<FeedSortType>('created_at_desc');

const handleSelectSort = (sortType: FeedSortType) => {
  setCurrentSort(sortType);
  setSortModalVisible(false);
};

<FeedSortModal
  visible={sortModalVisible}
  currentSort={currentSort}
  onClose={() => setSortModalVisible(false)}
  onSelectSort={handleSelectSort}
/>
```

## データフロー

```
[Feeds画面]
  ↓ 🔄ボタンタップ
  ↓ setSortModalVisible(true)
[FeedSortModal表示]
  ↓ ユーザーがオプション選択
  ↓ onSelectSort('title_asc')
[Feeds画面]
  ↓ setCurrentSort('title_asc')
  ↓ useEffect発火
  ↓ FeedService.listWithSort('title_asc')
[フィード一覧更新]
```

## 実装ファイル

`filto/components/FeedSortModal.tsx`

## 依存関係

**依存先:**
- React Native Core Components（`View`, `Text`, `Modal`, etc.）

**依存元:**
- `app/(tabs)/feeds.tsx`: Feeds画面で使用
- `FeedRepository`: `FeedSortType`型を参照
- `FeedService`: `FeedSortType`型を参照

## スタイル定義

```typescript
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  optionsList: {
    paddingTop: 8,
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionLabel: {
    fontSize: 16,
    color: '#000',
  },
});
```

## FilterSortModalとの関係

### 共通点
- UIデザインとレイアウトが同一
- 操作フローが同一
- スタイル定義がほぼ同一

### 相違点
| 項目 | FilterSortModal | FeedSortModal |
|------|----------------|---------------|
| ソート対象 | フィルタ一覧 | フィード一覧 |
| ソートオプション数 | 6つ | 6つ |
| デフォルトソート | `created_at_desc` | `created_at_desc` |
| 使用画面 | Filters画面 | Feeds画面 |

### 設計方針
- FilterSortModalと同じパターンを踏襲
- ユーザーが学習しやすい一貫したUX
- コードの保守性が高い

## テスト観点

1. **表示/非表示**
   - `visible={true}` でモーダルが表示されるか
   - 背景タップでモーダルが閉じるか

2. **ソート選択**
   - 各オプションタップで正しいソートタイプが選択されるか
   - 選択後にモーダルが自動的に閉じるか

3. **選択中の表示**
   - `currentSort`に対応するオプションに`▶`が表示されるか

4. **アクセシビリティ**
   - タップ領域が十分か（activeOpacity動作）
   - テキストが読みやすいか

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-20 | 初版作成 |
