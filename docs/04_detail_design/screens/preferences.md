# Preferences（表示・同期・その他）

## 概要
アプリの動作・表示に関する設定を行う。
ユーザーの好みに応じてアプリの動作をカスタマイズできる。

---

## 実装状況

### ✅ Phase 1（実装済み）
- **既読の表示方法**（dim / hide）
  - AsyncStorageで永続化
  - Home画面と連携
- **起動時自動更新**（ON / OFF）
  - AsyncStorageで永続化
  - 30分以上経過時のみ同期
  - バックグラウンド実行（画面表示を妨げない）

### 📋 Phase 2（今後実装予定）
- 取得頻度：手動のみ / 低頻度
- WiFi時のみ取得：ON/OFF
- 言語：ja / en
- テーマ：light / dark

---

## UI構成

### ヘッダー
```
┌────────────────────────────────────────┐
│ ←  Preferences                         │
└────────────────────────────────────────┘
```
- 左：戻るボタン（←）→ Settings画面へ
- 中央：タイトル（Preferences）
- 右：（なし）

**ヘッダー2重表示の防止**:
- `<Stack.Screen options={{ headerShown: false }} />`でデフォルトヘッダーを非表示
- 独自の`PreferencesHeader`コンポーネントを実装
- Global Allow Keywords画面と同じ構成

### 設定項目（Phase 1）

#### 起動時に更新
```
┌────────────────────────────────────────┐
│ 起動時に更新                            │
│ ┌──────────────────────────┐  ┌──┐   │
│ │ 自動でRSSを取得           │  │🔘│   │
│ │ アプリ起動時に自動的に...  │  └──┘   │
│ └──────────────────────────┘          │
└────────────────────────────────────────┘
```
- セクションタイトル: 「起動時に更新」
- トグル形式
  - **ON（デフォルト）**: アプリ起動時に自動的にRSSフィードを更新
  - **OFF**: 自動更新を無効化
  - 説明文: 「アプリ起動時に自動的にRSSフィードを更新します（30分以上経過時のみ）」

#### 既読の表示方法
```
┌────────────────────────────────────────┐
│ 既読の表示方法                          │
│ ┌──────────┐  ┌──────────┐           │
│ │ 薄く表示  │  │ 非表示    │           │
│ └──────────┘  └──────────┘           │
└────────────────────────────────────────┘
```
- セクションタイトル: 「既読の表示方法」
- 選択ボタン形式
  - **薄く表示（dim）**: 既読記事を60%不透明で表示（デフォルト）
  - **非表示（hide）**: 既読記事を一覧から完全に除外

### 今後追加予定
```
┌────────────────────────────────────────┐
│ その他の設定は今後追加予定です          │
└────────────────────────────────────────┘
```

---

## データ型

### ReadDisplayMode
```typescript
export type ReadDisplayMode = 'dim' | 'hide';
```

### ストレージキー
```typescript
const STORAGE_KEY_READ_DISPLAY = '@filto/preferences/readDisplay';
const STORAGE_KEY_AUTO_SYNC_ON_STARTUP = '@filto/preferences/autoSyncOnStartup';
```

---

## 操作

### 起動時自動更新を変更
```
1. トグルボタンをタップ
2. 即座にAsyncStorageに保存
3. 次回アプリ起動時から反映
```

### 既読の表示方法を変更
```
1. 「薄く表示」または「非表示」ボタンをタップ
2. 即座にAsyncStorageに保存
3. Home画面で次回読み込み時に反映
```

### 戻る
- ヘッダーの戻るボタン（←）をタップ → Settings画面へ遷移
- Preferences画面が右にスライドして消えるアニメーション

---

## データフロー

### 初回読み込み
```
画面表示
  ↓
useFocusEffect
  ↓
loadPreferences()
  ↓
AsyncStorage.getItem('@filto/preferences/readDisplay')
  ↓
setReadDisplay(value)
  ↓
選択状態を反映
```

### 設定変更
```
選択ボタンタップ
  ↓
handleChangeReadDisplay(mode)
  ↓
setReadDisplay(mode)
  ↓
AsyncStorage.setItem('@filto/preferences/readDisplay', mode)
  ↓
完了（即座に反映）
```

### 戻る操作
```
戻るボタン（←）タップ
  ↓
handlePressBack()
  ↓
router.back()
  ↓
Settings画面へ遷移
Preferences画面が右にスライドして消える
```

### Home画面での反映
```
Home画面表示
  ↓
loadData()
  ↓
AsyncStorage.getItem('@filto/preferences/readDisplay')
  ↓
setReadDisplay(value)
  ↓
useEffect（フィルタ適用）
  ↓
readDisplay === 'hide' の場合、既読記事を除外
  ↓
表示
```

---

## 永続化

### 使用技術
- **AsyncStorage**（`@react-native-async-storage/async-storage`）

### ストレージキー一覧
| キー | 型 | デフォルト値 | 説明 |
|-----|-----|------------|------|
| `@filto/preferences/readDisplay` | `'dim' \| 'hide'` | `'dim'` | 既読の表示方法 |

### データ保存例
```typescript
await AsyncStorage.setItem('@filto/preferences/readDisplay', 'hide');
```

### データ取得例
```typescript
const value = await AsyncStorage.getItem('@filto/preferences/readDisplay');
if (value === 'dim' || value === 'hide') {
  setReadDisplay(value);
}
```

---

## Home画面との連携

### 既読表示ロジック
```typescript
// フィルタ適用時（Home画面）
React.useEffect(() => {
  // ... フィード・フィルタ適用 ...

  // 既読表示設定に基づいてフィルタリング
  if (readDisplay === 'hide') {
    displayed = displayed.filter(a => !a.isRead);
  }

  setFilteredArticles(displayed);
}, [articles, selectedFeedId, filters, globalAllowKeywords, readDisplay]);
```

### 表示の違い

#### dim（薄く表示）
```
┌────────────────────────────────────────┐
│ 📰  記事タイトル1                      │ ← 通常表示
│     フィード名 / 1h                     │
├────────────────────────────────────────┤
│ 📰  記事タイトル2                      │ ← 既読（薄く表示）
│     フィード名 / 2h                     │   opacity: 0.6
└────────────────────────────────────────┘
```

#### hide（非表示）
```
┌────────────────────────────────────────┐
│ 📰  記事タイトル1                      │ ← 通常表示
│     フィード名 / 1h                     │
└────────────────────────────────────────┘
（既読記事は表示されない）
```

---

## スタイル

### カラー
- 背景: `#f8f8f8`
- ヘッダー背景: `#fff`
- ヘッダー境界線: `#e0e0e0`
- 戻るボタン: `#1976d2`
- セクション背景: `#fff`
- セクションタイトル: `#666`
- 選択ボタン境界線: `#ccc`（非選択）、`#1976d2`（選択）
- 選択ボタン背景: `#fff`（非選択）、`#e3f2fd`（選択）
- 選択ボタンテキスト: `#666`（非選択）、`#1976d2`（選択）

### フォント
- ヘッダータイトル: 18px、600（semi-bold）
- セクションタイトル: 14px、600（semi-bold）、uppercase
- 選択ボタン: 16px、500（通常）/ 600（選択時）
- 今後追加予定: 14px、italic

### レイアウト
- ヘッダー高さ: 48px
- セクション margin-top: 24px
- セクション padding: 16px
- セクションコンテンツ padding: 16px
- セクションコンテンツ border-radius: 12px
- ボタングループ gap: 12px
- 選択ボタン padding: 12px 16px
- 選択ボタン border-radius: 8px
- 選択ボタン border-width: 1.5px

---

## エラーハンドリング

### 想定されるエラー
| エラー | 原因 | 対応 |
|-------|------|------|
| 読み込み失敗 | AsyncStorage読み取りエラー | console.error（デフォルト値使用） |
| 保存失敗 | AsyncStorage書き込みエラー | Alert: 「設定の保存に失敗しました」 |

### エラー表示例
```typescript
try {
  await AsyncStorage.setItem(STORAGE_KEY_READ_DISPLAY, mode);
} catch (error) {
  console.error('Failed to save read display mode:', error);
  Alert.alert('エラー', '設定の保存に失敗しました');
}
```

---

## 画面配置

### タブグループ外（Global Allow Keywords画面と同じ構成）
- **パス**: `/preferences` (`app/preferences.tsx`)
- **ボトムタブバー**: 表示されない
- **ヘッダー**: `<Stack.Screen options={{ headerShown: false }} />`でデフォルトヘッダーを非表示
- **独自ヘッダー**: PreferencesHeaderコンポーネントを実装

### タブバー構成
- Home / Filters / Settings の3つのみ
- Preferences画面にはタブは不要

---

## 画面遷移

### 遷移元
- **Settings画面** → Preferences画面

### 遷移先
- Preferences画面 → **Settings画面**（戻るボタン、右スライドアニメーション）

### ナビゲーション
```typescript
// Settings画面から遷移（左スライドで開く）
router.push('/preferences');

// 戻るボタンで遷移（右スライドで閉じる）
router.back();
```

### 遷移の特徴
- Global Allow Keywords画面と同じパターン
- 戻るボタンで`router.back()`を使用
- Settings → Preferences: 左スライドアニメーション（開く）
- Preferences → Settings: 右スライドアニメーション（閉じる）
- タブバーは非表示

---

## パフォーマンス

### 最適化
- **useFocusEffect**: 画面表示時のみ設定読み込み
- **useCallback**: ハンドラ関数のメモ化
- **AsyncStorage**: 高速な読み書き

---

## テスト項目

### 単体テスト
- [ ] 初回読み込み（デフォルト値）
- [ ] 初回読み込み（保存済み値）
- [ ] 設定変更（dim → hide）
- [ ] 設定変更（hide → dim）
- [ ] 保存エラー時のAlert表示

### 結合テスト
- [ ] Settings画面からの遷移
- [ ] Home画面での設定反映（dim）
- [ ] Home画面での設定反映（hide）
- [ ] 設定変更後のHome画面更新

### E2Eテスト
- [ ] 設定変更 → Home画面で確認（dim）
- [ ] 設定変更 → Home画面で確認（hide）
- [ ] アプリ再起動後も設定が保持される

---

## 実装ファイル

### コンポーネント
- **パス**: `filto/app/preferences.tsx`
- **型**: Screen Component
- **配置**: タブグループ外

### 使用ライブラリ
- `@react-native-async-storage/async-storage`

### エクスポート
- `ReadDisplayMode`型（Home画面でインポート）

---

## TODO

### 実装済み
- [x] 基本UI作成
- [x] 既読の表示方法設定
- [x] AsyncStorageでの永続化
- [x] Home画面との連携
- [x] Settings画面からの遷移

### 未実装
- [ ] 起動時に更新設定
- [ ] 取得頻度設定
- [ ] WiFi時のみ取得設定
- [ ] 言語設定
- [ ] テーマ設定
- [ ] 多言語対応
- [ ] ダークモード対応

---

## 参考
- [settings.md](./settings.md) - 遷移元の画面設計
- [home.md](./home.md) - 連携先の画面設計（既読表示）
