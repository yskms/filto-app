# FilterEdit（フィルタ追加・編集）

## 概要
キーワードベースのフィルタルールを作成・編集する。

## 基本仕様
- **ブロックキーワード（必須）**：このキーワードを含む記事をブロック（単一）
- **許可キーワード（任意）**：ただしこのキーワードのいずれかを含む場合は例外的に許可（複数、OR条件）
- **対象範囲**：タイトル・概要のどちらをチェックするか

## フィルタロジック
```
// グローバル許可リストを最優先でチェック（FilterServiceで実行）
if (global_allow_keywords のいずれかが含まれる) {
  → 表示（無条件で許可、他のフィルタを無視）
}

// 通常のフィルタ評価
if (記事.タイトル or 概要 に block_keyword が含まれる) {
  if (allow_keyword が指定されている) {
    if (記事.タイトル or 概要 に allow_keyword のいずれかが含まれる) {
      → 表示（例外として許可）
    } else {
      → ブロック
    }
  } else {
    → ブロック
  }
}
```

---

## UI構成

### ヘッダー
- 左：← 戻る
- 中央：Add Filter / Edit Filter（新規/編集で切り替え）
- 右：なし

### フォーム

#### 1. ブロックキーワード（必須）
- ラベル：「ブロックキーワード」
- 単一行テキスト入力
- **単一のキーワードのみ**
- プレースホルダー：「例: FX」
- バリデーション：空欄不可

#### 2. 許可キーワード（任意）
- ラベル：「許可キーワード（任意）」
- **複数行テキスト入力（3-4行）**
- **改行区切りで複数指定**
- プレースホルダー：
  ```
  例:
  仮想通貨
  web3
  crypto
  ```
- ヒント：「1行に1キーワード」
- いずれか1つでも含まれていれば許可（OR条件）
- 空欄OK

#### 3. 対象範囲（チェックボックス）
- ラベル：「対象」
- チェックボックス2つ：
  - ☑ タイトル（デフォルト: ON）
  - ☑ 概要（デフォルト: ON）
- 最低1つはONである必要がある
- シンプルなチェックボックスUI（☑/☐）

#### 4. ボタン

##### 新規追加時
```
[ 保存 ]
```

##### 編集時
```
[ 保存 ]  [ 削除 ]
```

- 保存ボタン
  - テキスト：「保存」
  - 無効化条件：
    - block_keyword が空
    - target_title と target_description が両方OFF
    - 保存中（isSaving: true）
  - 保存中は「保存中...」またはスピナー表示

- 削除ボタン（編集時のみ）
  - テキスト：「削除」
  - 赤文字
  - タップ時：確認ダイアログ表示
  - 削除実行後：Filters画面に戻る

---

## 削除確認ダイアログ
```
タイトル: フィルタを削除
メッセージ: このフィルタを削除しますか？
ボタン:
  - キャンセル（style: 'cancel'）
  - 削除（style: 'destructive'）
```

---

## 入力例

### 例1: シンプルなブロック
```
ブロックキーワード: FX
許可キーワード: （空）
対象: ☑タイトル ☑概要
→ FXを含む記事をすべてブロック
```

### 例2: 例外付きブロック
```
ブロックキーワード: 新卒
許可キーワード: 
  react
  typescript
対象: ☑タイトル ☑概要
→ 新卒を含むが、react または typescript も含む場合は表示
```

### 例3: 複数の例外キーワード
```
ブロックキーワード: FX
許可キーワード:
  仮想通貨
  web3
  crypto
  ビットコイン
対象: ☑タイトル ☑概要
→ FXを含むが、暗号資産関連キーワードのいずれかも含む場合は表示
```

---

## バリデーション

### 入力時
- ブロックキーワードが空：保存ボタン無効化
- 対象範囲が0件：保存ボタン無効化

### 保存時（確認）
```typescript
if (!blockKeyword.trim()) {
  Alert.alert('エラー', 'ブロックキーワードを入力してください');
  return;
}

if (!targetTitle && !targetDescription) {
  Alert.alert('エラー', 'タイトルまたは概要のいずれかを選択してください');
  return;
}
```

---

## データ処理

### 保存時の変換
```typescript
// 改行区切り → カンマ区切り（DB保存用）
const allowKeywordsForDB = allowKeywords
  .split('\n')
  .map(k => k.trim())
  .filter(k => k.length > 0)
  .join(',');  // "仮想通貨,web3,crypto"
```

### 編集時の変換
```typescript
// カンマ区切り（DB） → 改行区切り（表示用）
const allowKeywordsForDisplay = filter.allow_keyword
  ?.split(',')
  .map(k => k.trim())
  .join('\n') || '';  // "仮想通貨\nweb3\ncrypto"
```

---

## DB保存仕様
```typescript
interface Filter {
  id?: number;                // undefined = 新規
  block_keyword: string;      // 単一キーワード: "FX"
  allow_keyword: string | null; // カンマ区切り: "仮想通貨,web3" or NULL
  target_title: boolean;      // タイトルを対象にするか (1 or 0)
  target_description: boolean; // 概要を対象にするか (1 or 0)
  created_at?: number;        // UnixTime（秒）
  updated_at?: number;        // UnixTime（秒）
}
```

### SQLite型変換
```typescript
// Booleanは0/1で保存
target_title: targetTitle ? 1 : 0
target_description: targetDescription ? 1 : 0

// 読み込み時は逆変換
targetTitle: filter.target_title === 1
targetDescription: filter.target_description === 1
```

---

## 画面遷移

### 遷移元
- **新規追加**: Filters → FilterEdit（filterId なし）
  - ＋ボタンタップ
- **編集**: Filters → FilterEdit（filterId あり）
  - **行タップ（通常モード時）**
  - スワイプ削除は個別削除のみ（編集画面には遷移しない）

### 遷移先
- **保存成功**: FilterEdit → Filters
  - `router.back()`
  - Filters画面で再読み込み（自動）
- **削除成功**: FilterEdit → Filters
  - `router.back()`
  - Filters画面で再読み込み（自動）
- **戻るボタン**: FilterEdit → Filters
  - `router.back()`
  - 未保存の変更は破棄

---

## 使用API / Service

### 編集時（filterId あり）
```typescript
FilterService.get(id: number): Promise<Filter>
```

### 保存時
```typescript
FilterService.save(filter: Filter): Promise<void>
// 新規の場合: filter.id = undefined
// 更新の場合: filter.id = number
// 保存後、全記事を再評価（バックグラウンド）
```

### 削除時（編集時のみ）
```typescript
FilterService.delete(id: number): Promise<void>
// 削除後、全記事を再評価（バックグラウンド）
```

### フィルタ再評価
```typescript
// 保存・削除後に自動実行（Service内部で処理）
FilterService.evaluateAll(): Promise<void>
// グローバル許可リスト → 通常フィルタの順で評価
```

---

## ブロックキーワードの重複について

### 仕様
- **重複を完全に許可**
- 警告なし
- チェックなし

### 理由
```
同じキーワードでも、異なる許可条件で管理したい場合がある:

フィルタ1: FX → 仮想通貨は許可
フィルタ2: FX → web3は許可
フィルタ3: FX → 投資は許可

→ それぞれ異なる文脈で管理できる
```

### 重複の確認方法
Filters画面で **ソート機能** を使って確認できる：
- ブロックキーワード順でソート → 同じキーワードが隣接
- 重複を見つけたら、編集または削除で整理

---

## Pro版の制限

### 無料版
- フィルタ数：**100個まで**
- 正規表現：**使用不可**

### Pro版
- フィルタ数：**無制限**
- 正規表現：**使用可能**

### 上限到達時の挙動
```
フィルタが100個に達した状態で＋ボタンをタップ:

Alert表示:
タイトル: フィルタの上限
メッセージ: 無料版では100個までフィルタを作成できます。
ボタン:
  - キャンセル
  - Pro版を見る → /settings/pro へ遷移
```

---

## State管理

### Component State
```typescript
const [blockKeyword, setBlockKeyword] = useState('');
const [allowKeywords, setAllowKeywords] = useState(''); // 改行区切り
const [targetTitle, setTargetTitle] = useState(true);
const [targetDescription, setTargetDescription] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
```

### 初期化（編集時）
```typescript
useEffect(() => {
  if (filterId) {
    loadFilter();
  }
}, [filterId]);

async function loadFilter() {
  const filter = await FilterService.get(filterId);
  setBlockKeyword(filter.block_keyword);
  setAllowKeywords(
    filter.allow_keyword
      ?.split(',')
      .map(k => k.trim())
      .join('\n') || ''
  );
  setTargetTitle(filter.target_title === 1);
  setTargetDescription(filter.target_description === 1);
}
```

---

## エラーハンドリング

### 保存失敗時
```typescript
try {
  await FilterService.save(filter);
  router.back();
} catch (error) {
  Alert.alert(
    'エラー',
    '保存に失敗しました。もう一度お試しください。'
  );
  setIsSaving(false);
}
```

### 削除失敗時
```typescript
try {
  await FilterService.delete(filterId);
  router.back();
} catch (error) {
  Alert.alert(
    'エラー',
    '削除に失敗しました。もう一度お試しください。'
  );
  setIsDeleting(false);
}
```

---

## 将来的な拡張（今回は実装しない）

### 正規表現対応（Pro版限定）
```
ブロックキーワード: ^FX.*取引$
→ 正規表現で高度なマッチング
```

### フィルタの有効/無効切り替え
```
[ 保存 ]  [ 削除 ]  [ 無効化 ]
→ is_enabled フラグで制御
```

### その他の拡張
- 複数のブロックキーワード対応（→ 複数フィルタで対応）
- AND/OR/NOTの高度な条件（将来検討）

---

## 備考

### 入力方式の選択理由
- **改行区切り**を採用
  - シンプルで実装が容易
  - 編集がしやすい
  - ユーザーにとって直感的
  - タグUIは将来的な改善案として保留

### 複数ブロックキーワードについて
- 1フィルタ = 1ブロック対象
- 複数のキーワードをブロックしたい場合は複数のフィルタを作成
- これにより：
  - フィルタ一覧が見やすい
  - 個別に編集・無効化が可能
  - ロジックがシンプル

### グローバル許可リストとの関係
- グローバル許可リストに登録されたキーワードは、すべてのフィルタより優先して許可される
- FilterEdit では設定できない（Preferences画面で管理）
- フィルタ評価時に FilterService が自動的にチェック