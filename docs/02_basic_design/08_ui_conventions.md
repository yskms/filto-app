# UI / 実装ルール

1. StatusBar 管理方針
2. GestureHandler / Swipe の扱い
3. 削除操作の UI ルール
4. 画面構成の基本パターン
5. 実装上の禁止事項


## StatusBar 管理方針

- StatusBar は `app/_layout.tsx` で一元管理する
- 各画面では StatusBar を使用しない
- Android 安定動作のため `style="dark"` を明示指定する
- 各画面は SafeAreaView を使用する

## GestureHandler / Swipe の扱い

- `react-native-gesture-handler` を使用するため
  `GestureHandlerRootView` は RootLayout に配置する
- 各画面・各コンポーネントで GestureHandlerRootView を使用しない
- Swipeable / DraggableFlatList などのジェスチャー系 UI は
  この前提のもとで実装する

## 削除操作の UI ルール

### 単体削除（スワイプ削除）
- 行を左にスワイプすると削除ボタンを表示
- 削除ボタンは赤背景（#d32f2f）+ 🗑アイコン（白）
- 削除ボタンの幅：80px
- 削除時は確認ダイアログを表示する
- 適用画面：Feeds（個別フィード削除）、Filters（個別フィルタ削除）

### 複数削除（削除モード）
- ヘッダーの 🗑 アイコンで削除モードに入る
- 削除モード時はヘッダー全体が切り替わる
  - 左：キャンセル（青文字）
  - 中央：「N件選択」
  - 右：削除（赤文字、0件時は無効化）
- 行タップで複数選択
- 選択行は背景色変更（#e3f2fd）
- 削除モード中はスワイプ操作・ドラッグ操作を無効化する
- 削除ボタンタップ時は確認ダイアログを表示
- 適用画面：Feeds、Filters

### 削除確認ダイアログ

#### 個別削除の場合
- タイトル：
  - Feeds：「フィードを削除」
  - Filters：「フィルタを削除」
- メッセージ：「この〇〇を削除しますか？」
- ボタン：
  - キャンセル（style: 'cancel'）
  - 削除（style: 'destructive'、赤文字）

#### 一括削除の場合
- タイトル：「N件の〇〇を削除しますか？」
- メッセージ：「この操作は取り消せません」
- ボタン：
  - キャンセル（style: 'cancel'）
  - 削除（style: 'destructive'、赤文字）

## スワイプ操作の共通ルール

### 基本原則
- スワイプで開ける行は常に1件のみとする
- 削除モード中はスワイプ操作を無効化する
- スワイプが開いている間は他の操作（編集・遷移・選択）は実行されない

### スワイプを閉じる条件
スワイプが開いている状態で以下の操作が行われた場合、既存のスワイプを閉じる：
- 同一行のタップ → スワイプを閉じるのみ（他の操作は実行しない）
- 別行のタップ → スワイプを閉じてから操作実行
- 別行のスワイプ操作 → 前のスワイプを閉じてから新しいスワイプを開く
- 編集アイコンタップ（スワイプ中）→ スワイプを閉じるのみ
- 追加ボタンタップ → スワイプを閉じてから遷移
- 削除モード切替 → スワイプを閉じてからモード切替
- 画面遷移・Tabs切り替え → スワイプを自動クローズ

### 画面遷移時のスワイプ管理
- 画面のフォーカスが外れる際（useFocusEffect のクリーンアップ）に
  開いている Swipeable をすべて close する
- スワイプ状態は画面間で持ち越さない

### Feeds特有のルール
- 長押しドラッグはスワイプが開いていない時のみ有効
- スワイプ中の長押しは無効

## 画面構成の基本パターン

- 各画面は以下の構成を基本とする

SafeAreaView  
├─ Header  
└─ FlatList / ScrollView

- Header は原則として画面内に実装し、
  Navigation の header は使用しない

### Screen Header
- Height: 48px
- Padding: horizontal 16
- Vertical padding MUST NOT be used
- Vertical alignment is handled by alignItems: center
  (縦方向の中央揃え：alignItems: center で行う)
- Title:
  - fontSize: 18
  - fontWeight: 600
- Border bottom: 1px #e0e0e0

### Header実装上の注意（重要）
- paddingVertical は 使用しないこと
- 高さは height: 48 で固定する
- タイトルやアイコンの縦位置調整は余白ではなく alignItems: center によって行う
- 画面ごとに独自のヘッダー高さを定義しない
 （Home / Filters / Settings で必ず共通にする）
- Stack header は使用せず、戻る操作は各画面ヘッダーに明示的に配置する

### 削除モード時のヘッダー切り替え
- 削除モード突入時は、ヘッダー全体を条件分岐で切り替える
- 通常モード・削除モードで同じ Header コンポーネントを使い、
  内部で deleteMode フラグによって表示を変える
- ヘッダー高さ・枠線などの基本スタイルは変更しない

## 色の定義

### テキスト色
- 通常テキスト：#000
- サブテキスト：#666
- 無効化：opacity 0.3
- アクション（青）：#1976d2
- 破壊的操作（赤）：#ff3b30

### 背景色
- 通常：#fff
- 選択状態：#e3f2fd
- 削除ボタン背景：#d32f2f

## 実装上の禁止事項

- 新しい UI ライブラリを追加しない
- 画面ごとに独自の StatusBar 管理をしない
- 削除操作に即時削除（確認なし）を採用しない
- UI 実装段階で Service / DB ロジックを書かない
- ヘッダーの高さを画面ごとに変えない
- スワイプ状態を画面間で持ち越さない