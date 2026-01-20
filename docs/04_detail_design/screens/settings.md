# Settings（設定）

## 概要
各種設定画面へのメニュー。
アプリの主要機能へのエントリーポイント。

---

## UI構成

### ヘッダー
```
┌────────────────────────────────────────┐
│              Settings                  │
└────────────────────────────────────────┘
```
- 中央：タイトル（Settings）
- タブバー表示: あり

### メニューリスト
```
┌────────────────────────────────────────┐
│ Feeds                              >   │
├────────────────────────────────────────┤
│ Global Allow Keywords              >   │
├────────────────────────────────────────┤
│ Preferences                        >   │
├────────────────────────────────────────┤
│ Pro                                >   │
│ （無効化）                              │
└────────────────────────────────────────┘
```

### メニュー項目

#### 1. Feeds
- **説明**: フィード管理
- **遷移先**: Feeds画面
- **状態**: 有効

#### 2. Global Allow Keywords
- **説明**: グローバル許可キーワード管理
- **遷移先**: Global Allow Keywords画面
- **状態**: 有効
- **機能**: 
  - 全フィルタに対して優先的に適用される許可キーワードの管理
  - 無料版は3件まで、Pro版は無制限

#### 3. Preferences
- **説明**: 各種設定
- **遷移先**: Preferences画面
- **状態**: 有効（将来実装）

#### 4. Pro
- **説明**: Pro版案内
- **遷移先**: Pro版案内画面
- **状態**: 無効化（将来実装）

---

## 操作

### メニュー項目タップ
- タップ → 対応する画面へ遷移
- 無効化された項目はタップしても反応しない（opacity: 0.5）

### 画面遷移
```typescript
const handlePressMenuItem = (id: string) => {
  switch (id) {
    case 'feeds':
      router.push('/(tabs)/feeds');
      break;
    case 'global_allow_keywords':
      router.push('/(tabs)/global_allow_keywords');
      break;
    case 'preferences':
      router.push('/(tabs)/preferences');
      break;
    case 'pro':
      // TODO: Pro版案内画面へ遷移
      break;
  }
};
```

---

## データフロー

### 初回読み込み
```
画面表示
  ↓
メニュー項目を表示（静的）
  ↓
完了
```

### メニュー項目タップ
```
タップ
  ↓
handlePressMenuItem(id)
  ↓
router.push(path)
  ↓
対応する画面へ遷移
```

---

## 画面遷移

### 遷移先
| メニュー項目 | 遷移先 | パス |
|------------|-------|------|
| Feeds | Feeds画面 | `/(tabs)/feeds` |
| Global Allow Keywords | Global Allow Keywords画面 | `/(tabs)/global_allow_keywords` |
| Preferences | Preferences画面 | `/(tabs)/preferences` |
| Pro | Pro版案内画面 | （TODO） |

### タブバー
- Settings画面はタブグループ内にあるため、タブバーが表示される
- 各遷移先もタブグループ内（`/(tabs)/`）にあるため、タブバーは維持される

---

## スタイル

### カラー
- 背景: `#f8f8f8`
- メニュー項目背景: `#fff`
- メニュー項目境界線: `#e0e0e0`
- メニュー項目テキスト: `#000`（有効）、`rgba(0, 0, 0, 0.3)`（無効）
- 矢印アイコン: `#999`

### フォント
- タイトル: 28px、700（bold）
- メニュー項目: 17px、通常

### レイアウト
- メニュー項目高さ: 56px
- メニュー項目 padding: 0 16px
- 矢印アイコン: 20px

---

## 実装ファイル

### コンポーネント
- **パス**: `filto/app/(tabs)/settings.tsx`
- **型**: Screen Component

### 使用コンポーネント
- `SafeAreaView`（react-native-safe-area-context）
- `FlatList`（react-native）
- `TouchableOpacity`（react-native）

### ナビゲーション
- `useRouter`（expo-router）

---

## TODO

### 実装済み
- [x] 基本UI作成
- [x] Feeds画面への遷移
- [x] Global Allow Keywords画面への遷移

### 未実装
- [ ] Preferences画面の実装
- [ ] Pro版案内画面の実装
- [ ] Pro版購入状態の取得
- [ ] 多言語対応
- [ ] ダークモード対応

---

## 参考
- [feeds.md](./feeds.md) - Feeds画面
- [global_allow_keywords.md](./global_allow_keywords.md) - Global Allow Keywords画面
- [preferences.md](./preferences.md) - Preferences画面（TODO）
