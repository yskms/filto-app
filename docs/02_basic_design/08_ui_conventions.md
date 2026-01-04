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

### 単体削除
- 行を左にスワイプすると削除ボタンを表示
- 削除ボタンは赤背景 + 🗑アイコン
- 削除時は確認ダイアログを表示する

### 複数削除
- ヘッダーの 🗑 アイコンで削除モードに入る
- 行タップで複数選択
- 削除モード中はスワイプ操作を無効化する

## スワイプ操作の共通ルール

- スワイプで開ける行は常に1件のみとする
- スワイプ中に他の操作が発生した場合、
  その操作は実行せずスワイプを閉じる
- 編集・遷移・選択操作とスワイプ操作は同時に成立しない

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

## 実装上の禁止事項

- 新しい UI ライブラリを追加しない
- 画面ごとに独自の StatusBar 管理をしない
- 削除操作に即時削除（確認なし）を採用しない
- UI 実装段階で Service / DB ロジックを書かない
