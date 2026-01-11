# FeedSelectModal

## 概要
フィード選択のためのボトムシート型モーダル。
ALL または個別フィードを選択し、記事一覧のフィルタリングに使用する。

---

## 責務

### フィード選択UI
- ALL + フィード一覧の表示
- 選択中フィードの視覚的な表示
- タップでフィード切り替え

### 画面遷移
- Manage Feeds ボタンでFeeds画面へ遷移

---

## データ型

### Props

```typescript
interface FeedSelectModalProps {
  visible: boolean;                         // モーダルの表示/非表示
  feeds: Feed[];                            // フィード一覧
  selectedFeedId: string | null;            // 選択中のフィードID（null = ALL）
  onClose: () => void;                      // モーダルを閉じる
  onSelectFeed: (feedId: string | null) => void;  // フィード選択時
}
```

### Feed型

```typescript
interface Feed {
  id: string;
  title: string;
  url: string;
  iconUrl?: string;
  orderNo: number;
  createdAt: string;
}
```

---

## UI仕様

### レイアウト

```
┌──────────────────────┐
│ フィード選択      ✕  │ ← ヘッダー
├──────────────────────┤
│ ▶ 📱 ALL             │ ← 選択中
│   📰 TechCrunch      │
│   📰 Qiita           │
│   📰 Medium          │
│   📰 Dev.to          │
├──────────────────────┤
│ Manage Feeds →        │ ← フッター
└──────────────────────┘
```

---

### ヘッダー

**要素**:
- **タイトル**: 「フィード選択」（左寄せ）
- **閉じるボタン**: ✕アイコン（右寄せ）

**スタイル**:
- パディング: 上下16px、左右20px
- 境界線: 下部に薄いグレー

---

### フィード一覧

**要素**:
- **ALLオプション**: 先頭固定、📱アイコン
- **フィードアイテム**: 📰アイコン + フィード名
- **選択中マーク**: ▶（選択中のフィードのみ）

**スタイル**:
- 各アイテム: パディング上下14px、左右20px
- 最大高さ: 400px（スクロール可能）

---

### Manage Feedsボタン

**要素**:
- テキスト: 「Manage Feeds →」
- 青色テキスト

**スタイル**:
- パディング: 上下16px、左右20px
- 境界線: 上部に薄いグレー

---

## 動作仕様

### モーダル表示

```
1. visible = true
   ↓
2. ボトムシートがスライドイン
   ↓
3. 背景が半透明の黒でオーバーレイ
```

**アニメーション**: `slide`（下から上へ）

---

### フィード選択

```
1. フィードアイテムをタップ
   ↓
2. onSelectFeed(feedId) を呼び出し
   ↓
3. モーダルを閉じる
   ↓
4. 親コンポーネント（Home画面）で記事を再フィルタリング
```

---

### Manage Feeds

```
1. Manage Feeds をタップ
   ↓
2. モーダルを閉じる
   ↓
3. Feeds画面へ遷移（router.push）
```

---

### モーダルを閉じる

**トリガー**:
- ✕ボタンタップ
- 背景タップ
- フィード選択時
- Manage Feedsタップ時
- Androidの戻るボタン（onRequestClose）

```typescript
onClose();
```

---

## 実装例

### 基本構造

```typescript
export const FeedSelectModal: React.FC<FeedSelectModalProps> = ({
  visible,
  feeds,
  selectedFeedId,
  onClose,
  onSelectFeed,
}) => {
  const router = useRouter();

  const handleSelectFeed = (feedId: string | null) => {
    onSelectFeed(feedId);
    onClose();
  };

  const handleManageFeeds = () => {
    onClose();
    router.push('/(tabs)/feeds');
  };

  // ALLオプション + フィード一覧
  const allOption = { id: null, title: 'ALL', icon: '📱' };
  const feedOptions = feeds.map(feed => ({
    id: feed.id,
    title: feed.title,
    icon: '📰',
  }));
  const options = [allOption, ...feedOptions];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable 
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* ヘッダー、フィード一覧、Manage Feeds */}
        </Pressable>
      </Pressable>
    </Modal>
  );
};
```

---

### オプション生成

```typescript
// ALLオプション
const allOption = { 
  id: null,        // null = ALL
  title: 'ALL', 
  icon: '📱' 
};

// フィードオプション
const feedOptions = feeds.map(feed => ({
  id: feed.id,
  title: feed.title,
  icon: '📰',
}));

// 結合
const options = [allOption, ...feedOptions];
```

---

### 選択中マークの表示

```typescript
<Text style={styles.feedTitle}>
  {selectedFeedId === item.id && '▶ '}
  {item.title}
</Text>
```

**ロジック**:
- `selectedFeedId === null` かつ `item.id === null` → ▶ ALL
- `selectedFeedId === item.id` → ▶ フィード名

---

## スタイル

### ボトムシート

```typescript
backdrop: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',  // 半透明の黒
  justifyContent: 'flex-end',              // 下寄せ
},
modalContainer: {
  backgroundColor: '#fff',
  borderTopLeftRadius: 16,                 // 上部の角を丸く
  borderTopRightRadius: 16,
  maxHeight: '80%',                        // 画面の80%まで
  paddingBottom: 20,                       // 下部余白（iPhoneのホームインジケーター対応）
},
```

---

### ヘッダー

```typescript
header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
},
title: {
  fontSize: 18,
  fontWeight: '600',
  color: '#000',
},
closeButton: {
  padding: 4,
},
closeIcon: {
  fontSize: 20,
  color: '#666',
},
```

---

### フィードアイテム

```typescript
feedItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
  paddingHorizontal: 20,
},
feedIcon: {
  fontSize: 20,
  marginRight: 12,
},
feedTitle: {
  fontSize: 16,
  color: '#000',
},
```

---

### Manage Feedsボタン

```typescript
manageButton: {
  marginTop: 8,
  paddingVertical: 16,
  paddingHorizontal: 20,
  borderTopWidth: 1,
  borderTopColor: '#e0e0e0',
},
manageText: {
  fontSize: 16,
  color: '#1976d2',  // 青色
  fontWeight: '500',
},
```

---

## 使用例

### Home画面での使用

```typescript
export default function HomeScreen() {
  const [feedModalVisible, setFeedModalVisible] = React.useState(false);
  const [selectedFeedId, setSelectedFeedId] = React.useState<string | null>(null);
  const [feeds] = React.useState<Feed[]>(dummyFeeds);

  const handleFeedSelect = () => {
    setFeedModalVisible(true);
  };

  const handleSelectFeed = (feedId: string | null) => {
    setSelectedFeedId(feedId);
    // 記事の再フィルタリングは useEffect で自動実行
  };

  return (
    <>
      <HomeHeader
        onPressFeedSelect={handleFeedSelect}
        // ...
      />
      
      {/* モーダル */}
      <FeedSelectModal
        visible={feedModalVisible}
        feeds={feeds}
        selectedFeedId={selectedFeedId}
        onClose={() => setFeedModalVisible(false)}
        onSelectFeed={handleSelectFeed}
      />
    </>
  );
}
```

---

## 依存関係

### インポート
```typescript
import { useRouter } from 'expo-router';
import { Feed } from '@/types/Feed';
```

### 使用される場所
- Home画面（記事一覧のフィード選択）

---

## 将来の拡張

### フィードアイコン表示

```typescript
// Feed型にiconUrlがある場合
{feed.iconUrl ? (
  <Image source={{ uri: feed.iconUrl }} style={styles.feedIconImage} />
) : (
  <Text style={styles.feedIcon}>📰</Text>
)}
```

---

### フィード数の表示

```typescript
<Text style={styles.feedTitle}>
  {selectedFeedId === item.id && '▶ '}
  {item.title}
  <Text style={styles.feedCount}> ({item.articleCount})</Text>
</Text>
```

---

### 検索機能

```typescript
const [searchQuery, setSearchQuery] = React.useState('');

const filteredFeeds = feeds.filter(feed =>
  feed.title.toLowerCase().includes(searchQuery.toLowerCase())
);
```

---

## デザインパターン

### ボトムシート vs 中央モーダル

**このコンポーネントがボトムシートを採用した理由**:

1. **可変長リスト**: フィード数が増えても対応可能
2. **追加アクション**: Manage Feeds ボタンを自然に配置
3. **一般的なパターン**: iOS/Androidで広く使われている

---

## 関連ドキュメント

- [`home_screen.md`](../screens/home_screen.md) - Home画面（使用箇所）
- [`Feed.ts`](../../types/Feed.ts) - Feed型定義