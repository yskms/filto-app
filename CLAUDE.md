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

## 初回起動画面とオンボーディング完了判定（`components/FirstRunScreen.tsx` / `database/init.ts`）

### `isOnboardingComplete()` は3キーのOR/AND判定。安易に統合・単純化しない

`onboardingDone || (feedsSeeded && !inProgress)` という一見冗長な式になっている。

- `defaultFeedsSeeded`（`SEED_KEY`）は`seedDefaultFeeds()`が立てるが、これは
  `FirstRunScreen`の**mount直後**に呼ばれる。ステップ形式（ようこそ→スクショ→
  待機）になった今、「seedは実行した」ことは「オンボーディングを完了した」
  ことを意味しない。
- `onboardingInProgress`はそのズレを埋めるためのキーで、mount直後に立て、
  最終画面の「はじめる」到達時（`handleStart`）に消す。**このキーが無いと、
  スクショ閲覧中に強制終了したユーザーが次回起動でオンボーディングを
  スキップされ、フィード投入・初回同期が未完了のままホームに入る**
  （2026-09に実際に発生・修正）。
- `SEED_KEY`のOR判定自体は意図的（`ONBOARDING_KEY`を持たない旧バージョンからの
  継続ユーザーを誤って初回扱いしないため）。`onboardingInProgress`を導入せず
  `ONBOARDING_KEY`単体に単純化する、または`SEED_KEY`のORを外す、といった
  変更は、`onboardingInProgress`を持たない既存ユーザーを誤って再オンボーディング
  させる回帰になる。3キーとも残すこと。
→ WBS「初回起動画面刷新が新規インストールに反映されていなかった件」

### `constants/defaultFeeds.ts` の変更は、既存ユーザーには自動で届かない

`seedDefaultFeeds()`は`SEED_KEY`（`defaultFeedsSeeded`）が一度立つと、以後は
呼ばれても中身を見ずに即returnする。そのため、デフォルトフィードのURL一覧を
変更しても反映されるのは以下の場合だけ：

- **新規インストールの初回起動時のみ**（かつ、上記のOTA配信の限界と同じ理屈で、
  その時点で端末に変更後のJSバンドルが存在している場合に限る。OTA配信直後の
  新規インストールでは、真の初回起動に間に合わないことがある）。
- **既存ユーザーが明示的に操作した場合のみ**。設定→データ管理に「フィードだけ
  デフォルトに戻す」（`resetFeedsToDefault()`、`data_management.tsx`の
  `handleResetFeeds`）と「全データリセット」の2つの導線があり、どちらも
  `SEED_KEY`を消してから`seedDefaultFeeds()`を呼び直す。

つまり、デフォルトURLの追加・変更をOTAや通常のアプリ更新で配信しても、
**通常利用中の既存ユーザーには自動で反映されない**。全ユーザーに周知したい
変更なら、アプリ内のお知らせ等、別の手段が必要。

**ストアのリリースノートに書く際も同じ理屈が刺さる**：更新後に「最新情報」を
読むのはほぼ既存ユーザーなので、「デフォルトフィードに◯◯を追加しました」と
書いても当人の画面には反映されない。新規インストール限定である旨を明記するか、
書かないこと（v1.5.4で実際にこの文面を書きかけ、レビューで指摘されて
「安定性の改善」のみに差し替えた）。

## 同期の並行性モデル（`services/SyncService.ts` / `utils/syncLock.ts`）

- `SyncLock` は**単一JSランタイム内**の排他制御。`expo-background-task` が
  アプリのプロセスを完全に終了させたあとOSが別途ヘッドレスに実行する場合、
  この状態は共有されない（`isRefreshing` は見えない）。
- ただし**アプリのプロセスが生きたまま裏に回っている間**にバックグラウンド
  タスクが実行される場合は、同じJSランタイムを使うため `SyncLock` /
  `isRefreshing` / `onSyncComplete` は正しく機能する。「バックグラウンド同期は
  常にUIから見えない」という単純化は誤り。**実測（2週間の実機ヘビー使用）では
  真にheadlessな実行はほぼ観測されず、実運用の主経路は「30分以上アプリを裏に
  置いてから前面復帰した直後に走る」ケース**。`BackgroundSync.ts`のコメントを
  「例外的にJSランタイムが生きているケースがある」という書き方のままにすると、
  次に読む人がこれを稀なケースと誤解し、機能ごと削りかねない。
- 同期の「完了した」（`onSyncComplete`）と「開始/終了した」（`onRefreshingChange`）
  は別軸だが、どちらも**実際に同期を開始した（`SyncLock`を取得できた）回にしか
  発火しない**という点で対称。`offline`/`skippedNotWifi`/`busy`の早期returnは
  ロック取得前のため、どちらのイベントも発火しない。ロックを取得した後は、
  `onRefreshingChange`はキャンセルも含め成功・失敗問わず必ず発火するのに対し、
  `onSyncComplete`は世代がリセットで変わった＝キャンセルされた回だけ発火しない
  （成功・失敗は発火する）。UIのスピナー等はキャンセル時にも消す必要があるため
  `onRefreshingChange`に頼ること。
- `SyncService.refresh()`の`_emitSyncComplete`は、呼び出し元を問わず同じグローバル
  な`onSyncComplete`購読者（ホームの背景同期用トースト）に届く。手動更新・データ
  リセット・オンボーディング関連など、呼び出し側が既に自前のフィードバック
  （トースト・Alert・専用の進捗UI）を持つ場合は`refresh()`に`notify`を**渡さない**
  （既定`false`）。`BackgroundSync.ts`だけが明示的に`refresh({ notify: true })`を
  渡す（多数派側が既定値になるよう意図的に設計。付け忘れの失敗モードを「二重
  トースト」ではなく「トーストが出ないだけ」に倒すため）。新しく
  `SyncService.refresh()`を呼ぶ箇所を追加する際は毎回この判断が必要。
- `_emitSyncComplete`の`failed`は「新着0件の正常完了」と「取得失敗」を区別する
  ためのフラグ。例外で終わった回、および`feeds.length > 0 && fetched === 0`
  （フィードはあるのに1件も取得できなかった＝全滅）の回で`true`になる。
  フィード単位のエラーはworker内で握りつぶされ例外にならないため、「全滅」は
  例外に頼らず明示的に検出する必要がある（さもないと回線不安定時に「同期完了」
  という誤った成功表示になる）。
  → WBS「背景同期完了時にトーストが出ない」「コードレビュー指摘への対応」

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

## iOS 27 (UIScene) 対応（`plugins/withIosSceneDelegate.js`）

Xcode 27 / iOS 27 SDKでビルドしたアプリは、UISceneライフサイクルに対応していないと
起動直後にクラッシュする（"UIScene life cycle is required for apps built with this
SDK"）。Appleが2025年のWWDC25で予告済みの正式な仕様変更であり、環境不備ではない
（2026-09に判明）。

- Expo 54 / React Native 0.81時点では、Expo・RN本体ともに公式のシーン対応が未実装
  （RN公式テンプレートのシーン対応はRN 0.87/0.88以降が前提）。そのため
  `plugins/withIosSceneDelegate.js` というconfig pluginで、`ios/`生成時に
  `AppDelegate.swift`の書き換え・`SceneDelegate.swift`の新規生成・pbxprojへの登録・
  Info.plistへの`UIApplicationSceneManifest`追加を自前で行っている。
- **`ios/`はgitignore対象で`expo prebuild`の自動生成物のため、UIScene対応を
  `ios/Filto/AppDelegate.swift`や`ios/Filto/SceneDelegate.swift`へ直接手で
  書き込んでも、次の`expo prebuild`（cleanの有無を問わず）で上書き・消失する。**
  変更は必ず`plugins/withIosSceneDelegate.js`側に加えること。
- URLスキーム（`filto://`等）・Universal Linksは、UIScene採用後は
  `AppDelegate.application(_:open:options:)` / `application(_:continue:
  restorationHandler:)` がシステムから呼ばれなくなる。`expo-linking`
  （＝`expo-router`のディープリンク）や`expo-dev-launcher`（Dev Client起動時の
  URL処理）は`ExpoAppDelegateSubscriberManager`経由でこれらのコールバックに
  依存しているため、`SceneDelegate.swift`側で`RCTLinkingManager`だけでなく
  `ExpoAppDelegateSubscriberManager`へも同じイベントを転送している。
- **`AppDelegate`のwindow生成（`didFinishLaunchingWithOptions`内の
  `window = UIWindow(...)` / `factory.startReactNative(...)`）は意図的に
  そのまま残しており、SceneDelegate側で新規windowを作ってはいけない。**
  `expo-dev-launcher`（Dev Client、Debugビルドのみ）は`didFinishLaunchingWithOptions`
  の時点で`UIApplication.shared.delegate?.window`（またはkeyWindow）の存在を
  前提にしており、無いと`fatalError`する
  （`ExpoDevLauncherAppDelegateSubscriber.swift`）。windowの生成をSceneDelegate側
  （`scene(_:willConnectTo:)`）に完全移管すると、didFinishLaunching時点では
  まだシーンが接続されておらずwindowが存在しないため、**Dev Client
  （Debugビルド）だけが起動直後に確実にクラッシュする**（Releaseビルドは
  `expo-dev-launcher`を含まないため影響しない、という非対称な壊れ方をする）。
  「windowはAppDelegateが生成し、SceneDelegateはwindowSceneを割り当てるだけ」
  という役割分担を崩さないこと。経緯は WBS「iOS 27 SDK対応：UISceneライフサイクル
  必須化」を参照。
- これはExpo側の公式対応が来るまでの暫定シムという位置づけ。Expo SDKが
  UISceneに公式対応した場合は、このプラグインと`SceneDelegate.swift`を撤去し、
  公式の仕組みに乗り換えること。
- **Xcode 27のSDKは`IPHONEOS_DEPLOYMENT_TARGET`が15.0未満のターゲットのビルドも
  拒否する**（UIScene必須化とは別の変更）。SDWebImage・RevenueCat・
  Google Mobile Ads等、一部Podのリソースバンドルターゲットが個別に古い値を
  指定しており単独ではビルド不能なため、`plugins/withIosPodsDeploymentTargetFix.js`
  でPodfileの`post_install`にターゲット引き上げ処理を追加している。これも
  `ios/Podfile`への直接編集ではなく、必ずこのプラグイン側に変更を加えること。
- Simulator・実機（iPhone 8, iOS 16.7.16、TestFlight経由）の両方で起動・
  `filto://`の画面遷移まで確認済み。**Xcode 27はiOS 16実機との開発用
  ペアリングが成立しなかった**ため、実機確認はXcode経由を諦めTestFlight
  経由（`eas build --local` → `eas submit`）で行った。詳細・経緯は
  WBS「iOS 27 SDK対応：UISceneライフサイクル必須化」を参照。

## リリース作業

- `eas build` / `eas submit` / `eas update` は必ず事前確認する
  （`.claude/settings.local.json` の `permissions.ask` に登録済み。詳細は
  auto-memory の `feedback_no-build-without-confirmation.md`）。
- JSのみの変更は `eas update` でOTA配信できる（審査不要）。ただし
  `--platform ios` と `android` は個別に実行すること（同時実行だとweb向け
  wasmビルドで失敗することがある）。
- **例外：初回起動画面（`FirstRunScreen`）のようにアプリの最初の起動でしか
  意味を持たない画面は、OTA配信だけでは新規ユーザーに届かない。**
  `expo-updates`は`checkAutomatically`の設定に関わらず起動時にバックグラウンドで
  アップデートを取得するだけで、その回の描画には反映されない（次回起動から
  有効）。新規インストール直後の1回目の起動時点では、端末にOTAの内容がまだ
  存在しないため原理的にどの設定でも間に合わない。この種の画面を変更した場合は
  ネイティブビルドの再submitが必須（2026-09に「OTA配信済み＝反映済み」と
  誤認した実例あり）。→ WBS「初回起動画面刷新が新規インストールに反映
  されていなかった件」
- ローカルの `filto/android/`（gitignore対象・`expo prebuild` の自動生成物）は、
  存在している限り `expo run:android` を実行しても自動では作り直されない。
  `app.json` のネイティブ設定（config plugin等、例: AdMobの`androidAppId`）を
  変更した後にローカルビルドすると、その変更が反映されないまま古い設定で
  ビルド・起動してしまう（実際にAdMobの`APPLICATION_ID`不正で起動直後に
  クラッシュした事例あり）。ローカルビルドで原因不明の挙動に当たったら、まず
  `android/`の生成日時と`app.json`の更新日時を比較し、古ければ
  `expo prebuild --platform android --clean` で作り直してからビルドし直すこと。

## ドキュメントの置き場所

- `docs/_local/`: gitignore対象。Zenn記事の下書きなど、リポジトリに含めない
  個人的な文書はここに置く。
- `docs/cursor/`: 過去のAIエージェント生成指示の凍結記録。更新・同期の対象外。
- 各バージョンの詳細な作業履歴・意思決定の経緯は `docs/03_dev_plan/01_wbs.md`
  に集約されている（このファイルより詳細）。
