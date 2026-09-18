# Filto プロジェクト固有の注意事項

このファイルは「コードを読むだけでは分かりにくい前提」「過去に誤解・後退した領域」
を凝縮したもの。詳細な経緯は各項目末尾の参照先（`docs/03_dev_plan/01_wbs.md`）を見ること。

## ホーム画面（`filto/app/(tabs)/index.tsx`）

### 更新トリガーごとにスクロール方針が違う（過去に3回書き換えられた領域）

「手動更新」は一枚岩ではない。トリガーによって完了後にスクロールを先頭へ強制するかどうかが異なる。

| トリガー | 完了後の挙動 |
|---|---|
| 上から下スワイプ（`RefreshControl`） | 常に先頭へ戻す |
| ヘッダーの更新ボタン | 下スクロール中は保持（先頭付近10px以内では新着に自動追従） |
| 自動更新（起動時・バックグラウンド、`onSyncComplete`） | 先頭付近10px以内だけ追従、それ以外は保持 |

この方針は同じ論点で3回揺れている（2026-07に一度「強制ジャンプしない」→30分後に
「常に戻す」へ全撤回→2026-09に実機で不整合が発覚し再修正）。**「手動更新は常に
先頭へ戻すべき」のような一枚岩の単純化は過去に実際に導入されて破棄された**。
`runRefresh` に `scrollToTopOnComplete: boolean` があるのはこの区別のため。
→ WBS「ホーム更新のスクロール位置ポリシー」

### 世代カウンタは2種類あり、統合してはいけない

- `articleLoadGenerationRef`: `loadData` の全呼び出し（タブ復帰・フィルタ変更・
  バックグラウンド同期など、位置を保持する「中立な」再読込）が対象。
- `manualRefreshGenerationRef`: `runRefresh`（手動更新）だけが対象。

一見同じ「読み込みの世代管理」に見えて統合したくなるが、**統合すると回帰する**。
プルリフレッシュの「必ず先頭へ戻す」処理を `articleLoadGenerationRef` で有効性
チェックすると、単なるタブ切替復帰（中立な再読込）でも世代が進んだと判定され、
スワイプの「必ず先頭へ戻す」という約束自体が握りつぶされる（実際にこの回帰を
一度作り、ユーザーの指摘で気づいた）。

### 記事一覧は必ずページング経由。無制限の全件取得を足さない

`ArticleRepository.listAll()` は元々LIMIT無しで全件を同期APIで返し、性能問題
だった（保持期間90日で数万件規模）。250件単位のキーセットページングに移行済み。
新しい絞り込み条件を足す際も、全件をJS側にロードしてからフィルタする設計に
戻さないこと。

### バックグラウンド同期スピナー: `refreshing` を直接共有しない

`runRefresh` 自身の `refreshing` state と、それ以外の同期（起動時・
バックグラウンドタスク）を示す `backgroundSyncing` state は独立している
（`RefreshControl` には `refreshing || backgroundSyncing` でORして渡す）。
共有すると、`SyncService.refresh()` 内部で完了通知が `runRefresh` 自身の
後続処理（`loadData`・トースト・スクロール）より先に発火するため、手動更新の
スピナーが本来より早く消える。

## 同期の並行性モデル（`services/SyncService.ts` / `utils/syncLock.ts`）

- `SyncLock` は**単一JSランタイム内**の排他制御。`expo-background-task` が
  アプリのプロセスを完全に終了させたあとOSが別途ヘッドレスに実行する場合、
  この状態は共有されない（`isRefreshing` は見えない）。
- ただし**アプリのプロセスが生きたまま裏に回っている間**にバックグラウンド
  タスクが実行される場合は、同じJSランタイムを使うため `SyncLock` /
  `isRefreshing` / `onSyncComplete` は正しく機能する。「バックグラウンド同期は
  常にUIから見えない」という単純化は誤り。
- 同期の「完了して新着があった」（`onSyncComplete`、成功時のみ）と「開始/終了
  した」（`onRefreshingChange`、成功・失敗・キャンセル問わず必ず発火）は別軸。
  UIの表示状態を後者だけに頼ると、前者は失敗時に来ないため状態が壊れる。

## 文字サイズ・フォントスケーリング（`allowFontScaling`）

- 方針は**原則スケーリング許容＋レイアウト側を可変にする**。`fontSize` を
  カスタム指定する箇所は `lineHeight` も明示するか `lineHeight: undefined`
  にして自然な行高に任せる（詳細は `components/themed-text.tsx` のコメント）。
- `maxFontSizeMultiplier` による制限は、レイアウト修正で解決できないと確認
  できた箇所にのみ局所的に使う。**アプリ全体への一律の倍率制限や完全無効化は
  採用しない**（記事タイトル等が読めないと外部ブラウザを開く操作自体に
  到達できないため、拡大機能を全体で削るのは本末転倒）。
- React 19が関数コンポーネントの`defaultProps`対応を廃止しており、RN 0.81の
  `Text`も関数コンポーネントのため、`Text.defaultProps.allowFontScaling = false`
  のような一括設定の定石はもう効かない。`TextInput`やライブラリ内部の文字表示も
  対象外になるため、そもそも「1箇所で全体を制御する」こと自体が成立しない。
- → WBS「`allowFontScaling`（Dynamic Type / 文字サイズ設定）の方針」

## リリース作業

- `eas build` / `eas submit` / `eas update` は必ず事前確認する
  （`.claude/settings.local.json` の `permissions.ask` に登録済み。詳細は
  auto-memory の `feedback_no-build-without-confirmation.md`）。
- JSのみの変更は `eas update` でOTA配信できる（審査不要）。ただし
  `--platform ios` と `android` は個別に実行すること（同時実行だとweb向け
  wasmビルドで失敗することがある）。

## ドキュメントの置き場所

- `docs/_local/`: gitignore対象。Zenn記事の下書きなど、リポジトリに含めない
  個人的な文書はここに置く。
- `docs/cursor/`: 過去のAIエージェント生成指示の凍結記録。更新・同期の対象外。
- 各バージョンの詳細な作業履歴・意思決定の経緯は `docs/03_dev_plan/01_wbs.md`
  に集約されている（このファイルより詳細）。
