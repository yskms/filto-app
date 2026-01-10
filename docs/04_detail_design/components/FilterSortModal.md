# FilterSortModal（並び替えモーダル）

## 概要
フィルタ一覧の並び替え方法を選択するモーダル。

## 基本仕様
- **6つのソートパターン**を提供
- **モーダル形式**で表示（中央）
- 選択後は即座にソート適用・モーダルを閉じる
- 現在のソート方法を視覚的に表示（▶マーク）

---

## UI構成

### モーダルレイアウト

```
┌──────────────────────┐
│ 並び替え              │
├──────────────────────┤
│ ▶ 作成日時（新しい順） │ ← 選択中
│   作成日時（古い順）   │
│   更新日時（新しい順） │
│   更新日時（古い順）   │
│   ブロックキーワード（昇順） │
│   ブロックキーワード（降順） │
└──────────────────────┘
```

### 要素
- **タイトル**: 「並び替え」
- **選択肢リスト**: 6つのソートパターン
- **選択インジケーター**: ▶マーク
- **背景**: 半透明（rgba(0, 0, 0, 0.5)）
- **モーダル**: 白背景、角丸、影付き

---

## ソートパターン

### 1. 作成日時（新しい順）
- **型**: `created_at_desc`
- **デフォルト**: ✅
- **SQL**: `ORDER BY created_at DESC`
- **説明**: 最近作成したフィルタが上に表示

### 2. 作成日時（古い順）
- **型**: `created_at_asc`
- **SQL**: `ORDER BY created_at ASC`
- **説明**: 古いフィルタから表示

### 3. 更新日時（新しい順）
- **型**: `updated_at_desc`
- **SQL**: `ORDER BY updated_at DESC`
- **説明**: 最近更新したフィルタが上に表示

### 4. 更新日時（古い順）
- **型**: `updated_at_asc`
- **SQL**: `ORDER BY updated_at ASC`
- **説明**: 更新していないフィルタから表示

### 5. ブロックキーワード（昇順）
- **型**: `block_keyword_asc`
- **SQL**: `ORDER BY block_keyword COLLATE NOCASE ASC`
- **説明**: A→Z順（大文字小文字を区別しない）

### 6. ブロックキーワード（降順）
- **型**: `block_keyword_desc`
- **SQL**: `ORDER BY block_keyword COLLATE NOCASE DESC`
- **説明**: Z→A順（大文字小文字を区別しない）

---

## データ型

### FilterSortType
```typescript
export type FilterSortType = 
  | 'created_at_desc'
  | 'created_at_asc'
  | 'updated_at_desc'
  | 'updated_at_asc'
  | 'block_keyword_asc'
  | 'block_keyword_desc';
```

### Props
```typescript
interface FilterSortModalProps {
  visible: boolean;              // モーダル表示状態
  currentSort: FilterSortType;   // 現在のソート方法
  onClose: () => void;           // モーダルを閉じる
  onSelectSort: (sortType: FilterSortType) => void; // ソート選択
}
```

---

## 動作フロー

### 1. モーダル表示
```
Filters画面で🔄ボタンタップ
  ↓
setSortModalVisible(true)
  ↓
FilterSortModal表示
```

### 2. ソート選択
```
ソートオプションをタップ
  ↓
handleSelectSort(sortType)
  ↓
onSelectSort(sortType) コールバック
  ↓
モーダル閉じる (onClose)
```

### 3. Filters画面での処理
```
handleSelectSort(sortType)
  ↓
setCurrentSort(sortType)
  ↓
useEffect が currentSort の変更を検知
  ↓
loadFilters() 実行
  ↓
FilterService.listWithSort(currentSort)
  ↓
フィルタ一覧が新しいソート順で表示
```

---

## 実装例

### FilterSortModal コンポーネント

```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';

export type FilterSortType = 
  | 'created_at_desc'
  | 'created_at_asc'
  | 'updated_at_desc'
  | 'updated_at_asc'
  | 'block_keyword_asc'
  | 'block_keyword_desc';

const SORT_OPTIONS: { type: FilterSortType; label: string }[] = [
  { type: 'created_at_desc', label: '作成日時（新しい順）' },
  { type: 'created_at_asc', label: '作成日時（古い順）' },
  { type: 'updated_at_desc', label: '更新日時（新しい順）' },
  { type: 'updated_at_asc', label: '更新日時（古い順）' },
  { type: 'block_keyword_asc', label: 'ブロックキーワード（昇順）' },
  { type: 'block_keyword_desc', label: 'ブロックキーワード（降順）' },
];

export const FilterSortModal: React.FC<FilterSortModalProps> = ({
  visible,
  currentSort,
  onClose,
  onSelectSort,
}) => {
  const handleSelectSort = (sortType: FilterSortType) => {
    onSelectSort(sortType);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.modalContainer}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <Text style={styles.title}>並び替え</Text>
              
              <View style={styles.optionsList}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={styles.optionItem}
                    onPress={() => handleSelectSort(option.type)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionLabel}>
                      {currentSort === option.type && '▶ '}
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};
```

### Filters画面での使用

```typescript
export default function FiltersScreen() {
  // State
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [currentSort, setCurrentSort] = useState<FilterSortType>('created_at_desc');

  // フィルタ読み込み
  const loadFilters = React.useCallback(async () => {
    const filterList = await FilterService.listWithSort(currentSort);
    setFilters(filterList);
  }, [currentSort]);

  // currentSort 変更時に再読み込み
  React.useEffect(() => {
    loadFilters();
  }, [currentSort, loadFilters]);

  // ソートボタンハンドラー
  const handlePressSortButton = React.useCallback(() => {
    setSortModalVisible(true);
  }, []);

  // ソート選択ハンドラー
  const handleSelectSort = React.useCallback((sortType: FilterSortType) => {
    setCurrentSort(sortType);
  }, []);

  return (
    <SafeAreaView>
      {/* ヘッダー */}
      <FiltersHeader onPressSortButton={handlePressSortButton} />
      
      {/* リスト */}
      <FlatList data={filters} ... />
      
      {/* モーダル */}
      <FilterSortModal
        visible={sortModalVisible}
        currentSort={currentSort}
        onClose={() => setSortModalVisible(false)}
        onSelectSort={handleSelectSort}
      />
    </SafeAreaView>
  );
}
```

---

## スタイリング

### モーダル
- **背景**: `rgba(0, 0, 0, 0.5)` （半透明黒）
- **コンテナ**: 幅80%、最大400px
- **モーダル本体**: 白背景、角丸12px、影付き

### タイトル
- **フォントサイズ**: 18px
- **太さ**: 600
- **下線**: 1px solid #e0e0e0

### オプション
- **パディング**: 垂直14px、水平20px
- **フォントサイズ**: 16px
- **タップ領域**: 大きめ（使いやすさ重視）

---

## UI/UX の特徴

### 即時反映
- ソート選択後、すぐにモーダルを閉じる
- Filters画面のリストが即座に並び替わる

### 視覚的フィードバック
- 選択中のソートに ▶ マーク
- タップ時に activeOpacity で視覚的反応

### 操作性
- 背景タップでモーダルを閉じる
- モーダル内タップは閉じない（stopPropagation）
- タップ領域が大きく押しやすい

---

## パフォーマンス

### メモリ効率
- ソートはDB側で実行（SQL ORDER BY）
- クライアント側でのソート処理なし
- 大量のフィルタでも高速

### レスポンス
- モーダル表示: 即座
- ソート切り替え: DB読み込みのみ（< 100ms）

---

## エラーハンドリング

### ソート失敗時
```typescript
const loadFilters = React.useCallback(async () => {
  try {
    const filterList = await FilterService.listWithSort(currentSort);
    setFilters(filterList);
  } catch (error) {
    Alert.alert('エラー', 'フィルタの読み込みに失敗しました');
    // デフォルトソートにフォールバック
    setCurrentSort('created_at_desc');
  }
}, [currentSort]);
```

---

## 将来の拡張

### ソート順の永続化
```typescript
// AsyncStorage にソート設定を保存
await AsyncStorage.setItem('filter_sort', currentSort);

// 起動時に復元
const savedSort = await AsyncStorage.getItem('filter_sort');
if (savedSort) {
  setCurrentSort(savedSort as FilterSortType);
}
```

### カスタムソート
- ユーザー定義の並び順
- ドラッグ&ドロップでの手動並び替え

---

## 備考

### COLLATE NOCASE の重要性
- ブロックキーワードのソートで使用
- 大文字小文字を区別しない
- 日本語も正しくソートされる

### デフォルトソート
- `created_at_desc`（作成日時の新しい順）
- 新しく作成したフィルタが上に表示
- 直感的で使いやすい