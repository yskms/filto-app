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
Settings
 ├ 📚 Global Allow Keywords
 ├ 👁 Display & Behavior
 ├ 💾 Data Management
 ├ ⭐ Pro
 └ ℹ About
```

```
┌────────────────────────────────────────┐
│ 📚 Global Allow Keywords          >   │
├────────────────────────────────────────┤
│ 👁 Display & Behavior              >   │
├────────────────────────────────────────┤
│ 💾 Data Management                 >   │
├────────────────────────────────────────┤
│ ⭐ Pro                                │
│ （無効化）                              │
├────────────────────────────────────────┤
│ ℹ About                            >   │
└────────────────────────────────────────┘
```

※ Feeds はボトムタブから直接アクセスするため、Settings のメニューには含めない。

### メニュー項目

#### 1. 📚 Global Allow Keywords
- **説明**: グローバル許可キーワード管理
- **遷移先**: Global Allow Keywords画面
- **状態**: 有効
- **機能**: 全フィルタに対して優先的に適用される許可キーワードの管理（無料版3件まで、Pro版無制限）

#### 2. 👁 Display & Behavior
- **説明**: 表示・挙動の設定
- **遷移先**: Display & Behavior画面（`/display_behavior`）
- **状態**: 有効
- **含まれる項目**:
  - 既読の表示方法（dim / hide）
  - テーマ（Light / Dark / System）
  - 言語（日本語 / English）
  - 起動時の挙動（自動更新 ON/OFF）

#### 3. 💾 Data Management
- **説明**: データ管理の設定
- **遷移先**: Data Management画面（`/data_management`）
- **状態**: 有効
- **含まれる項目**:
  - 記事保持期間（90日/180日/無制限）
  - WiFi時のみ取得
  - 最低更新間隔
  - （将来）OPML Import/Export
  - （将来）データのバックアップ/復元

#### 4. ⭐ Pro
- **説明**: Pro版案内
- **遷移先**: Pro版案内画面
- **状態**: 無効化（将来実装）

#### 5. ℹ About
- **説明**: アプリ名・バージョン情報
- **遷移先**: About画面（`/about`）
- **状態**: 有効

---

## 操作

### メニュー項目タップ
- タップ → 対応する画面へ遷移
- 無効化された項目（Pro）はタップしても反応しない（opacity: 0.5）

### 画面遷移
```typescript
const handlePressMenuItem = (id: string) => {
  switch (id) {
    case 'global_allow_keywords':
      router.push('/global_allow_keywords');
      break;
    case 'display_behavior':
      router.push('/display_behavior');
      break;
    case 'data_management':
      router.push('/data_management');
      break;
    case 'pro':
      // 無効
      break;
    case 'about':
      router.push('/about');
      break;
  }
};
```

---

## 画面遷移

### 遷移先
| メニュー項目 | 遷移先 | パス |
|------------|-------|------|
| 📚 Global Allow Keywords | Global Allow Keywords画面 | `/global_allow_keywords` |
| 👁 Display & Behavior | Display & Behavior画面 | `/display_behavior` |
| 💾 Data Management | Data Management画面 | `/data_management` |
| ⭐ Pro | Pro版案内画面 | （TODO） |
| ℹ About | About画面 | `/about` |

※ Feeds はボトムタブでアクセス。Settings からのリンクはない。

---

## 実装ファイル

### コンポーネント
- **パス**: `filto/app/(tabs)/settings.tsx`
- **型**: Screen Component
- **メニュー**: 各項目にアイコン（📚👁💾⭐ℹ）を表示

### 参考
- [feeds.md](./feeds.md) - Feeds画面（ボトムタブでアクセス）
- [global_allow_keywords.md](./global_allow_keywords.md) - Global Allow Keywords画面
- [display_behavior.md](./display_behavior.md) - Display & Behavior画面
- [data_management.md](./data_management.md) - Data Management画面
