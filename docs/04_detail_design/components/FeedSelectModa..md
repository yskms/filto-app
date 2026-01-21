# FeedSelectModal

## 概要
フィード選択のためのボトムシート型モーダル。
ALL または個別フィードを選択し、記事一覧のフィルタリングに使用する。

**注意**: お気に入り機能はHome画面ヘッダーの⭐トグルボタンで制御するため、このモーダルには含まれません。

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
│ ▶ 📰 ALL             │ ← 選択中
│   📰 TechCrunch      │
│   📰 Qiita           │
│   📰 Medium          │
│   📰 Dev.to          │
├──────────────────────┤
│ Manage Feeds →        │ ← フッター
└──────────────────────┘
```

**注意**: 以前のバージョンでは「⭐ お気に入り」項目がありましたが、
お気に入り機能はHome画面ヘッダーの⭐トグルボタンで制御するため削除されました。

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
- **ALLオプション**: 先頭固定、📰アイコン
- **フィードアイテム**: 📰アイコン（またはフィードアイコン） + フィード名
- **選択中マーク**: ✓（選択中のフィードのみ）

**スタイル**:
- 各アイテム: パディング上下12px、左右20px
- 最大高さ: 80%（スクロール可能）
- 選択中の背景色: #e3f2fd（薄い青）

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
  const handleSelectFeed = (feedId: string | null) => {
    onSelectFeed(feedId);
    onClose();
  };

  const handleManageFeeds = () => {
    onClose();
    router.push('/feeds');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.title}>フィード選択</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* フィード一覧 */}
          <ScrollView style={styles.listContainer}>
            {/* ALL */}
            <TouchableOpacity
              style={[styles.feedItem, selectedFeedId === null && styles.feedItemSelected]}
              onPress={() => handleSelectFeed(null)}
              activeOpacity={0.7}
            >
              <View style={styles.feedIcon}>
                <Text style={styles.feedIconText}>📰</Text>
              </View>
              <Text style={styles.feedName}>ALL</Text>
              {selectedFeedId === null && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            {/* 各フィード */}
            {feeds.map((feed) => (
              <TouchableOpacity
                key={feed.id}
                style={[styles.feedItem, selectedFeedId === feed.id && styles.feedItemSelected]}
                onPress={() => handleSelectFeed(feed.id)}
                activeOpacity={0.7}
              >
                {feed.iconUrl ? (
                  <Image source={{ uri: feed.iconUrl }} style={styles.feedIconImage} />
                ) : (
                  <View style={styles.feedIcon}>
                    <Text style={styles.feedIconText}>📰</Text>
                  </View>
                )}
                <Text style={styles.feedName}>{feed.title}</Text>
                {selectedFeedId === feed.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* フッター */}
          <TouchableOpacity
            style={styles.manageButton}
            onPress={handleManageFeeds}
            activeOpacity={0.7}
          >
            <Text style={styles.manageButtonText}>Manage Feeds →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
```

---

### 選択中マークの表示

```typescript
{selectedFeedId === feed.id && <Text style={styles.checkmark}>✓</Text>}
```

**ロジック**:
- `selectedFeedId === null` かつ `item.id === null` → ✓ ALL
- `selectedFeedId === item.id` → ✓ フィード名

---

## スタイル

### ボトムシート

```typescript
backdrop: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',  // 半透明の黒
  justifyContent: 'flex-end',              // 下寄せ
},
modalContent: {
  backgroundColor: '#fff',
  borderTopLeftRadius: 20,                 // 上部の角を丸く
  borderTopRightRadius: 20,
  maxHeight: '80%',                        // 画面の80%まで
  minHeight: '60%',
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
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},
feedItemSelected: {
  backgroundColor: '#e3f2fd',
},
feedIcon: {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: '#f0f0f0',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 12,
},
feedIconImage: {
  width: 32,
  height: 32,
  borderRadius: 16,
  marginRight: 12,
},
feedIconText: {
  fontSize: 18,
},
feedName: {
  flex: 1,
  fontSize: 16,
  color: '#000',
},
checkmark: {
  fontSize: 18,
  color: '#1976d2',
},
```

---

### Manage Feedsボタン

```typescript
manageButton: {
  paddingVertical: 16,
  paddingHorizontal: 20,
  borderTopWidth: 1,
  borderTopColor: '#e0e0e0',
  alignItems: 'center',
},
manageButtonText: {
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
  const [feeds, setFeeds] = React.useState<Feed[]>([]);

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
import { router } from 'expo-router';
import { Feed } from '@/types/Feed';
```

### 使用される場所
- Home画面（記事一覧のフィード選択）

---

## 将来の拡張

### フィード数の表示

```typescript
<Text style={styles.feedTitle}>
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

## お気に入り機能との関係

以前のバージョンでは、このモーダルに「⭐ お気に入り」項目がありましたが、
以下の理由で削除されました：

1. **概念的な正しさ**: お気に入りは「フィード」ではなく「表示フィルター」
2. **操作性**: ヘッダーのトグルボタンとして機能する方が直感的
3. **フィルタの組み合わせ**: フィード選択とお気に入りフィルターを独立して制御できる

**現在の実装**:
- フィード選択: このモーダル
- お気に入りフィルター: Home画面ヘッダーの⭐トグルボタン

---

## 関連ドキュメント

- [`home.md`](./home.md) - Home画面（使用箇所）
- [`Feed.ts`](../../types/Feed.ts) - Feed型定義