# 開発フロー（WBS）

## 全体イメージ

| 月 | フェーズ | 内容 |
|----|----------|------|
| 〜1月上旬 | 設計 | 詳細設計FIX |
| 1月 | 基盤 | データ・基盤 |
| 2月 | 実装 | 主要機能 |
| 3月 | 調整 | 品質向上 |
| 4月 | 準備 | リリース準備 |
| 5月 | 🎉 | リリース |

---

## フェーズ0：詳細設計仕上げ（〜1月上旬）

- [x] 画面仕様確定
- [x] API/サービスIF確定
- [x] DB最終確定
- [x] フィルタ条件仕様FIX
- [x] タスク分解＆優先度付け

**ゴール：実装に迷わず入れる状態**

**進捗**:
- 完了: 5/5タスク（100%）

**振り返り**:
- **達成**:
  - UI設計とドキュメント整備完了、主要3画面のUI実装完了
- **学び**: 
  - 実機で動かすと全然違う。気づくことが多く、イメージが具体的になる
  - ドキュメントを書きながら設計の穴に気づける
- **改善**: 
  - 設計を詰めきったつもりでも実装中に曖昧な部分が出てくる
  - ドキュメント更新を後回しにせず、気づいた時点で即更新する

---

## フェーズ1：基盤 & データ層（1月）🏃

**完了済み**:
- [x] プロジェクト初期化
- [x] ナビ（Tabs構成）
- [x] Home画面UI
- [x] Feeds画面UI + 削除機能
- [x] Filters画面UI + 削除機能
- [x] ドキュメント更新
- [x] FilterEdit画面
- [x] サービス層（FilterService）
- [x] DB層（FilterRepository, filters テーブル）
- [x] フィルタロジック実装
- [x] FilterEngine実装
- [x] SQLite設計・CRUD（残りのテーブル）
- [x] RSS取得・パーサ
**追加実装した内容:**
- ✅ ArticleRepository（記事データのDB操作）
- ✅ FeedRepository（フィードデータのDB操作）
- ✅ ArticleService（記事のビジネスロジック）
- ✅ FeedService（RSS自動検出機能付き）
- ✅ RssService（RSS 1.0/2.0/Atom対応、文字エンコーディング自動検出）
- ✅ SyncService（RSS同期処理）
- ✅ 全Service・Repositoryのドキュメント作成

**実装中・今後**:
- [ ] テーマ対応（基礎：Context + 色定義）

**ゴール：データが流れる"骨組み"完成**
→ 1つのRSSフィードを登録して、記事が表示され、フィルタでブロックできる: ✅ 達成！

**進捗**:
- 完了: 13/14タスク（93%）

**振り返り**:
- **達成**:
  - ドキュメントの更新も並行して進めれている
- **学び**: 
  - 自分で実装してみる事で、サービス層、DB層についての理解が深まった
  - RSS取得の実装にかなり工数がかかった。実際のデータは想像以上に多種多様だった。。
- **改善**: 
  - ドキュメントに大幅な刷新が出ている。後半になってからブレないように早めに詰めておく必要がある
  - ボトムタブにFeedsを含めるか否かの検討を行う必要がある
---

## フェーズ2：主要機能UI実装（2月）

- [x] FeedAdd画面
- [x] 複数フィード対応
- [x] フィード切替モーダル（FeedSelectModal）
- [x] 既読管理（markRead実装済み）
- [x] 手動更新（Pull to Refresh）
- [x] 起動時自動更新（動作確認はフェーズ3で行う）
  - Display & Behavior で設定 ON/OFF
  - 最終同期時刻の記録（SyncService）
  - 30分以内は同期スキップ
  - バックグラウンド実行（画面表示を妨げない）
- [x] Settings画面
- [x] Display & Behavior / Data Management 実装（Phase 1完了）
  - 既読の表示方法設定（dim / hide）
  - 起動時自動更新設定（ON / OFF）
  - AsyncStorageでの永続化
  - Home画面との連携
- [x] グローバル許可キーワード画面実装
  - 一覧表示
  - 追加・削除
  - Pro版制限（無料3件）
  - FilterEngineとの統合（Home画面で適用）
- [x] Filters ソート機能
- [x] Feeds ソート機能（ドラッグ&ドロップではなくソートモーダル方式を採用）
- [x] エラーハンドリング（Phase 1: 基礎実装）
  - 統一的なエラー表示（ErrorHandler）
  - FeedAdd: 重複URL登録防止
  - 詳細なエラーハンドリングはPhase 3で実施

**ゴール：主要画面が一通り動く**
→ 自分が毎日使える状態

**進捗**:
- 完了: 12/12タスク（100%）

**振り返り**:
- **達成**:
  - 主要機能すべて実装完了
  - RSS自動検出、複数フィード、フィルタ、既読管理、起動時自動更新
  - グローバル許可キーワード、Display & Behavior / Data Management、エラーハンドリング
  - ドキュメント更新も並行実施
- **学び**: 
  - 実機テストで発見：Yahoo!の`<image>`タグ、TechCrunchの圧縮レスポンス
  - 多種多様なRSSフォーマットへの対応が想像以上に重要だった
  - 実機での動作確認が具体的な改善につながる（お気に入り、記事削除）
- **改善**: 
  - Phase 3では実機テストを重視
  - 色々なケースへの対応を継続

---

## フェーズ3：磨き込み & 内部テスト（3月）

### 機能追加・改善
- [x] お気に入り機能
  - 記事を長押しでお気に入りに追加/解除
  - Home画面にお気に入りフィルタ追加
  - DB: is_starred カラム追加
- [x] 古い記事の自動削除機能
  - Data Management で記事保持期間を設定（7日/30日/90日/無制限）
  - 同期時に自動削除（お気に入り記事は除外）
  - Settings画面から手動削除も可能（お気に入り記事も選択可）
  - DB: fetched_at でフィルタリング
- [x] Display & Behavior 詳細設定（言語・テーマ切替の反映）
- [x] 記事詳細画面（外部ブラウザで開く）
- [x] UI/UX調整（アニメーション、色、フォント）
  - 全画面のダークテーマ対応（ハードコード色の撤廃）
  - ハイライトアニメーションのダーク対応
  - 不要なAlert削除（成功通知・フィード情報取得）
- [x] 空/初期状態対応（全画面統一）
  - 全タブ画面（Home・Filters・Feeds）に空状態を追加・統一
  - Ioniconsアイコン＋メッセージ＋ヒントの構成で揃える
- [x] アイコン統一（Ionicons）
  - 全画面の絵文字・UnicodeアイコンをIoniconsに置き換え
  - ボトムタブアイコンもIoniconsに統一（Filters・Settings表示バグ修正）
  - テーマカラー連動・フォーカス時塗り/非フォーカス時アウトライン

### エラーハンドリング強化
- [x] オフライン時の挙動改善
  - expo-network導入
  - RSS取得前にネットワークチェック
  - 適切なエラーメッセージ表示
- [x] 入力バリデーション追加
  - FilterEdit: ブロックキーワード必須チェック
  - GlobalAllowKeywords: 空白/重複チェック
  - 全画面: 入力文字数制限
- [x] ローディング状態の統一
  - `LoadingView`（全画面ローディング）・`LoadingOverlay`（操作中オーバーレイ）作成
  - index.tsx・filter_edit.tsx・data_management.tsx に適用
- [x] 成功フィードバックの追加
  - ToastProviderによるスライドインアニメーション通知
  - FilterEdit保存・GlobalAllowKeywords追加時に表示

### テスト・確認
- [x] 起動時自動更新の動作確認
- [x] グローバル許可リストの動作確認
- [x] Pro版制限の動作確認
- [x] パフォーマンス調整
  - ArticleItem を React.memo でラップし、不要な再レンダリングを防止
  - renderItem を useCallback でメモ化
  - getHighlightAnim を useCallback でラップし参照を固定
  - FlatList に removeClippedSubviews を追加
- [x] 多言語対応（ja / en）
- [x] システム言語に基づく自動言語検出（expo-localization）
  - 初回起動時にデバイスのシステム言語を自動検出
  - 対応外言語の場合は英語にフォールバック
  - 手動設定がある場合はそちらを優先
- [x] バグ修正・動作確認
  - FilterEdit のプロパティ名不一致バグ修正
  - Feed画面・Filter画面・GlobalAllowKeywords画面のテーマ対応バグ修正
  - ボトムタブ Filters・Settings アイコン未表示バグ修正

**ゴール：普段使いできる品質**
→ 快適に使える状態

**進捗**:
- 完了: 20/20タスク（100%）

**振り返り**:
- **達成**:
  - Display & Behavior の言語・テーマ切替反映を改善
  - 全画面のダークテーマ対応（ハードコード色の撤廃）
  - 不要なAlertを削除し、なるべくAlertを使わない方針を確立
  - FilterEdit のプロパティ名不一致バグを修正（camelCase → snake_case）
  - 入力文字数制限を全入力画面に追加
  - expo-network によるオフライン検知・エラー表示を実装
  - 全画面の絵文字アイコンをIoniconsに統一（ダーク対応・サイズ制御）
  - 全タブ画面の空状態を統一（アイコン＋メッセージ＋ヒント）
- **学び**: 
  - Contextでの言語切替は、固定文言の直書きを残すと画面単位で不整合が起きやすい
  - サービス層のIF（型・メソッド名）と画面層の不一致は実機テストで初めて発覚しやすい
  - OSテーマとアプリ内テーマは別物。Alert等のネイティブUIはアプリ内テーマに追従しない
  - Ioniconsアイコンごとにsvg内部の余白が異なる。サイズが大きい場合は実機確認が必要
  - IconSymbolのMAPPING未登録はAndroidで無音でアイコン非表示になる
- **改善**: 
  - 新規画面追加時は文言直書きを避け、翻訳キー追加を実装ルールとして徹底する
  - 色・アイコンは最初からuseThemeColor/Ioniconsを使う習慣をつける

---

## フェーズ4：リリース準備（4月）

- [x] 総合テスト（全機能動作確認）
- [x] アプリアイコン
- [x] スプラッシュスクリーン
- [x] 実機テスト（iOS + Android）
- [x] ストア素材作成（スクショ・説明文）
  - [x] 日本語説明文・キーワード作成
  - [x] 英語説明文・キーワード作成
  - [x] スクリーンショット構成設計・RSSフィード準備
  - [ ] スクリーンショット撮影（日本語 / 英語）
  - ※ iPad 対応は将来検討（後述）
- [x] プライバシーポリシー
- [x] EAS Build 設定
- [x] 最終バグ修正
  - DB初期化競合バグ修正
  - FeedAdd: Fetch成功後のみ追加ボタン活性化
  - 全画面の戻るボタン動作・位置を統一
  - お気に入り記事のみ残っている場合のデータ削除バグ修正

**ゴール：申請できる状態**

**進捗**:
- 完了: 9/10タスク（90%）
- 残り: スクリーンショット撮影

---

## フェーズ5：リリース（5月）

- [x] ストア申請（App Store / Google Play）
- [x] 審査対応
  - Apple: Guideline 4.2.2（ブラウザ相当）指摘 → フィルタバー追加・返信文面改善で通過 🎉
  - Google Play: ニュースポリシー・空コンテンツ指摘 → 連絡先情報追加・デフォルトフィード登録で対応 🎉
- [x] 軽微修正
  - フィルタ済み件数バーを一覧画面に追加（Apple Review対応）
  - 初回起動時デフォルトブロックキーワード登録（Trump / Google / Apple）
  - Google Playニュースポリシー対応（連絡先情報追加）
- [x] 初回リリース 🎉
  - iOS: 2026年5月19日 リリース
  - Android: 2026年5月21日 リリース

**ゴール：アプリストアからDLして実機で使用する**
→ ✅ 達成！

**進捗**:
- 完了: 4/4タスク（100%）

**振り返り**:
- **達成**:
  - iOS・Android 両ストアへのリリース完了
  - Apple審査でGuideline 4.2.2指摘を乗り越え、思想を伝える返信文面とUIで通過
  - Google Playニュースポリシー対応も完了
- **学び**:
  - Appleは機能説明より「なぜこのアプリが存在するのか」の思想を見ている
  - UIで価値を"見せる"ことが審査突破に直結した（フィルタバー）
  - 審査対応は文章だけでなく実際のアプリ体験の改善とセットで行うべき

---

## フェーズ6：リリース後改善（2026年5月〜）

### オンボーディング実装
- [x] 初回起動時オンボーディング画面（2ステップ）
  - Step 1: RSSフィードカテゴリ選択（全チェック済み初期状態）
    - JA: ニュース / テクノロジー / ビジネス / スポーツ / 芸能・エンタメ
    - EN: World News / Technology / Science & Tech / Entertainment / Business
    - 言語別に異なるフィードを提供（expo-localization で検出）
    - フィードアイコン（Google Favicons API）付きで登録
    - 「フィード画面からいつでも追加・削除できます」ヒント表示
  - Step 2: ブロックキーワード直接選択（タグ形式、任意）
    - JA: 38項目（野球 / サッカー / 政治 / 仮想通貨 など）
    - EN: 38項目（Baseball / Football / Politics / Crypto など）
    - 選択したキーワードがそのまま1件ずつ登録される
  - 完了時に SyncService.refresh() を実行してホーム画面を即時表示
  - 既存ユーザー（`defaultFeedsSeeded` あり）はオンボーディングをスキップ
- [x] データ管理画面に「すべてのデータをリセット」機能追加
  - DB全テーブル削除 + AsyncStorage全クリア
  - リセット後の再起動でオンボーディングが再表示される

**ゴール：新規ユーザーの初期体験向上**

**進捗**:
- 完了: 2/2タスク（100%）

### UX改善
- [x] ホーム画面スクロール位置保持
  - タブ切り替え・バックグラウンド復帰時にスクロール位置を維持
  - 初回ロードのみスピナー表示、再フォーカス時はバックグラウンドでDB更新
  - フィード切り替え時はトップへ戻す
- [x] 起動時自動同期タイミング改善
  - 1.5秒ディレイを削除（DB初期化完了後に画面表示されるため不要）
  - 30分インターバルチェックを削除し、アプリ終了→起動のたびに必ず同期
  - バックグラウンド復帰・タブ切り替えでは同期しない（hasAutoSyncedでセッション管理）

**進捗**:
- 完了: 4/4タスク（100%）

### Androidスプラッシュ画面の修正（v1.1.3）
- [x] ダークモードで起動画面の中央に白い円が表示される問題を解消
  - 原因: expo-splash-screen が `splashscreen_logo.png` に背景色(#ffffff)を焼き込んでおり、Android 12+ のアイコン円形クリップでダーク背景に白円として露出していた
  - 切り分け: `windowSplashScreenIconBackgroundColor`（compat/native 両方）では制御不可と確認 → 画像側で対処する方針に転換
  - 対策: 透明背景のロゴを各密度の `splashscreen_logo.png` に上書きする config plugin を実装
  - ロゴをキャンバスの約50%に縮小し、円形クリップでの端欠けも解消
- [x] リリース: Android v1.1.3（2026年6月3日）

**進捗**:
- 完了: 1/1タスク（100%）

### フィード編集機能（v1.1.4）
- [x] フィード一覧をタップで編集画面を開けるように（従来は削除のみで「タップできない」違和感があった）
  - URLを編集 → フェッチボタンで再取得（タイトル・アイコン更新）→ 保存
  - フィード名の変更・URLのコピー・削除を同一画面に集約
  - URL変更時はフェッチが成功するまで保存ボタンを不活性化（誤登録防止）
- [x] リリース:
  - Android v1.1.4（2026年6月4日 製品版公開）
  - iOS v1.1.4（2026年6月5日 App Store Connect 提出・審査待ち）

**進捗**:
- 完了: 1/1タスク（100%）

### 振り返り（v1.1.3 スプラッシュ修正 / v1.1.4 フィード編集）
- **達成**:
  - Androidスプラッシュの白円問題を、原因の切り分けから解決まで完遂（透明ロゴ上書き + 50%縮小）
  - フィード編集機能を追加（タップで編集・URL編集＋再フェッチ・名前変更・コピー・削除）
  - Android は即日で製品版公開、iOS も同バージョンを審査提出までワンサイクルで完了
- **学び**:
  - Android 12+ の SplashScreen API は透明アイコンの背景を白で焼き込むため、`windowSplashScreenIconBackgroundColor` 等の属性では円の色を制御できないケースがある。画像そのものを差し替えるのが確実だった
  - 推測でビルドを繰り返すより、prebuild の出力（styles.xml・生成PNG）を実際に確認して切り分ける方が圧倒的に速い
  - typedRoutes は新規ルート追加直後は tsc エラーになるが、dev サーバー／ビルド時の型生成で解消する（実害なし）
  - URL編集のような「再検証が必要な変更」は、フェッチ成功までSaveを不活性にするガードを入れると誤登録を防げる
- **改善**:
  - シェルのループ内 `set -- $pair` の単語分割ミスでゴミファイルが生成された。スクリプトは個別実行や明示展開で確実性を上げる
  - production ビルドはキュー待ちで時間がかかり、ローカルCLIがハングすることがある。`eas build:list` での状態確認を併用して完了を追う

---

### インタラクティブ初回ツアー & UX改善（v1.1.5）

#### 初回チュートリアルをライブコーチマークに刷新
- [x] 静的な使い方ガイドを廃止し、ホーム実画面上で要素を順にハイライトするコーチマーク方式に刷新
  - 待ち時間中に非ブロッキングで実施（初回フィード取得を待つ間にツアーが進む）
  - 実記事が届くまでダミー記事を背景表示し、長押し・フィルタ説明の対象を成立させる
- [x] 画面を跨ぐ周遊ツアー（Home → Filters → フィルタ追加 → Feeds → フィード追加 → Home 終了）
  - 各画面間の「進む / 戻る」両方向に対応（AsyncStorage でフラグ受け渡し）
  - 遷移直後の無防備な瞬間を解消（即暗幕＋計測リトライ）
- [x] ハイライト位置の安定化（measure-until-stable：2回連続一致するまで待って表示）
  - push 画面（フィルタ追加・フィード追加）で位置がズレる問題を解消
  - 吹き出しとハイライトを同時に切り替え（shownIndex 導入）
  - 最終ステップが計測不能でも自動遷移せず中央カードを出すフォールバック
- [x] 吹き出し・ハイライトの視認性向上
  - 吹き出しを太字1本＋一部だけアクセント色で強調、フォント拡大
  - ハイライトのリングを native driver で常時ゆっくり鼓動（注目誘導）

#### フィルタ編集UIの簡素化（PR #5）
- [x] プレースホルダーを廃止し、各キーワードの挙動を説明する小文字テキストを追加
  - ブロックキーワード：「この文字を含む記事を非表示にします。」
  - 許可キーワード：ラベルから「(カンマ区切り)」を削除し挙動ベースの説明に変更
  - 許可キーワードの入力欄を複数行 → 1行に（カンマ分割は内部実装として維持）

#### ホーム記事の大画像レイアウト切替（PR #6）
- [x] ヘッダーに表示切替アイコンを追加（コンパクト ⇔ 大画像、AsyncStorage で永続化）
  - 大画像：全幅16:9の画像＋下にタイトル/メタ、画像なしは同枠プレースホルダー
  - 初回ツアーに「大画像切替」ステップを追加し、ハイライト順を画面の上→下に整理
- [x] ENデフォルトフィードを整理（92→68件）
  - 重複/品質：BBC World・NYT World・CBS News・Vice を削除
  - 大カテゴリを定番中心に縮小（Tech 16→8 / Fitness 15→7 / Gaming 10→6）で初回取得を軽量化

#### リリース
- [x] v1.1.5 Android（2026年6月28日 製品版公開）
  - ※ eas submit の releaseStatus: completed により意図せず即時100%公開（スクショ・リリースノート未設定のまま）。以後 draft 運用に変更
  - ※ iOS はASCへビルド提出済みだが審査未提出のまま、本番ビルドでツアーのズレが発覚し v1.1.6 に統合

**進捗**:
- 完了: 4/4タスク（100%）

### 振り返り（v1.1.5 初回ツアー & UX改善）
- **達成**:
  - 静的ガイドを廃し、実画面上のライブコーチマークによる画面跨ぎ周遊ツアーを実装
  - 計測安定化・同時切替・フォールバックで、push画面でも崩れない堅牢なツアー基盤を確立
  - フィルタ編集UIの簡素化、ホーム大画像レイアウト、ENフィード整理まで一連の体験改善を完了
- **学び**:
  - 実画面ハイライトは「いつ計測するか」が肝。アニメーション完了後に複数回計測して安定を待たないとズレる
  - 吹き出しとハイライトは別管理だと片方だけ先に動いて違和感が出る。表示インデックスを分離して同時にコミットすると自然
  - ハイライトの鼓動は「倍率（native driver）＋opacity」が滑らか。固定px方式はカクつく
  - デフォルトフィードは多いほど初回取得が重い。定番中心に絞ると体感が明確に改善する
- **改善**:
  - 切替トグルは連打耐性を優先し、あえて関数型 setState を維持（stale closure を回避）
  - フィード一覧は生成パイプライン（feed-candidates → verify → 再生成）のソースから編集し、再生成で復活しないようにする

---

### 初回設定のやり直し & edge-to-edge対応（v1.1.6）

#### 本番ビルドのツアーずれ修正（edge-to-edge対応）
- [x] 初回ツアーのハイライトが本番ビルドだけステータスバー分ズレる問題を解消
  - 原因: edge-to-edge の standalone では Modal が全画面（画面上端基準）になる一方、measureInWindow はコンテンツ基準を返すため座標系が不一致（Expo Go では Modal が非全画面のため再現せず）
  - 切り分け: 推測での修正（statusBarTranslucent 一律付与→Expo Go側がズレる、オーバーレイ自己補正→Modal別ウィンドウで ovl=0,0 となり無効）を経て、デバッグHUD入りAPKで実測値を取得して確定
  - 対策: 全画面Modal時のみ insets.top を加算（FULLSCREEN_MODAL 定数で statusBarTranslucent と補正を同一駆動）。端末ごとのステータスバー高さ（Pixel=68 / Pixel3=28）に自動追従
- [x] 小画面端末で吹き出しカードがハイライトに重なる問題を解消
  - 原因: 上側カードの bottom 基準が window 高さで、window<screen の端末（Pixel3 の3ボタンナビ等）でズレる → 全画面Modal時は screen 高さを使用
- [x] プッシュ7画面の最下部ボタンが3ボタンナビに隠れて押せない問題を解消
  - data_management / filter_edit / feed_add / feed_edit / global_allow_keywords / display_behavior / about の SafeAreaView を edges={top, bottom} に

#### 初回設定のやり直し（replay-tour）
- [x] 設定に「初回設定をやり直す」を追加
  - イベントバス（utils/onboarding.ts）経由で RootLayout がオンボーディング画面を再表示
  - 押下時に確認ダイアログを表示（いきなり始まらないように・実機FB反映）
  - 「やり直す」でフィード・フィルタ（feed_id CASCADE で記事も連動）を削除して選び直す（表示設定・グローバル許可KWは保持・実機FB反映）
  - データ全リセット後にもやり直し導線を用意
- [x] 設定メニューを並び替え＋グループ区切りを追加
  - 一般設定（許可KW／表示と動作／初回設定をやり直す）とデータ・システム系（データ管理／Pro／アプリについて）の間に余白

#### ストア掲載情報の刷新（ASO）
- [x] 説明文を全面リライト（日英）：悩み起点の構成（ミュート訴求）に変更、iOSプロモーションテキスト新設、キーワード更新
- [x] リリースノート作成（Android は v1.1.5+v1.1.6 まとめ版、iOS も v1.1.5 未配信のためまとめ版）
- [x] docs/04_store/description_ja.md / description_en.md を最新化

#### リリース
- [x] v1.1.6 本番ビルド（iOS build 10 / Android versionCode 11）
- [x] 両ストアへ提出完了（2026年7月7日）
  - Android: Play に draft アップロード（リリースノート設定→手動公開待ち）
  - iOS: ASC へ配信済み（バージョンを1.1.6に変更しビルド紐付け→審査提出待ち）
- [x] Android 手動公開 / iOS 審査通過・公開（両ストア公開完了）

**進捗**:
- 完了: 5/5タスク（100%）

### 振り返り（v1.1.6 replay-tour & edge-to-edge）
- **達成**:
  - Expo Go と本番ビルドの座標系差という再現困難な不具合を、デバッグHUDによる実測で確定させて解消
  - preview ビルド（内部配布APK）を検証サイクルに組み込み、複数端末（Pixel / Pixel3）での検証体制を確立
  - eas submit の draft 運用に切替え、意図しない即時公開を防止
- **学び**:
  - Expo Go と standalone は Modal の座標系・edge-to-edge の扱いが異なり、片方で直してももう片方がズレる。環境の代理判定（IS_EXPO_GO）より「なぜ補正するか」を表す定数（FULLSCREEN_MODAL）で挙動を一括駆動する方が壊れにくい
  - 推測で修正ビルドを繰り返すより、実測値（デバッグHUD）を1本仕込んで数値で確定させる方が速くて確実
  - window と screen の高さは端末設定（3ボタンナビ等）で異なる。全画面オーバーレイの配置基準には screen を使う
  - Apple の契約（無料アプリ契約）は再有効化後、配信APIへの反映にラグがある。403 REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED は時間を置いて再提出
  - Play の公開済みリリースはノートを後から編集できない。releaseStatus: draft でアップロードのみ行い、Console で確認してから公開する運用が安全
- **改善**:
  - 破壊的操作（設定リセット等）の導線には必ず確認ダイアログを入れる
  - 「やり直す」系の機能は、既存データの扱い（残す/消す）をユーザー目線で設計してから実装する

---

### v1.1.7（提出完了）

> ⚠️ **次回ストア配信は新規ビルド必須**
> `expo-clipboard` / `expo-document-picker` / `expo-sharing` などネイティブモジュールを追加しているため、
> OTA更新では反映されない。**dev client の作り直しと実機での動作確認（ファイル選択・共有）が必要**。

#### マージ済み
- [x] フィルタ編集のブロックキーワードにクリップボード貼り付けボタンを追加
  - 許可キーワードとの間に区切り線＋余白を入れてセクションを分離
- [x] 非推奨の React Native `Clipboard` を `expo-clipboard` へ移行（filter_edit / feed_add / feed_edit）
  - `feed_edit` の「URLをコピー」はコピー成功時のみトーストを表示するよう改善
- [x] 空白のみのクリップボードを貼り付けると入力値が消える不具合を修正（3画面）
- [x] `feeds.pasteFromClipboard` を `common.pasteFromClipboard` に集約、`MAX_KEYWORD_LENGTH` を定数化
- [x] 重複フィードURL追加時に専用エラーを表示

#### マージ済み（機能ブランチ 4本 → 共通化 → 追加改善）
> マージ順は ① WiFiのみ → ② 最低更新間隔 → ③ ストレージキー集約 → ④ OPML → ⑤ バックアップ の順で実施。
> ②で設定キーを出し切ってから③で一度に集約し、③のあと⑤を入れることで BackupService が
> 私的なキー一覧を再生産しないようにした。

- [x] WiFi接続時のみ取得（`feature/wifi-only-fetch`、PR #16）
  - SyncService にWiFi判定を追加。自動同期のみ制限し、手動更新は常時取得。オン時の手動更新は確認ダイアログ。トグルUI
- [x] 連打防止の最低更新間隔（`feature/min-refresh-interval`、PR #17）
  - クールダウン判定を追加。手動更新が制限中なら残り時間を案内。制限なし/1/3/5/10分から選択
- [x] ストレージキーを `constants/storageKeys.ts` に集約（PR #18）
  - `@filto/` プレフィックスをコンパイル時に強制する型ガード（`satisfies`）付き。
    `resetAllData` は `getAllKeys()` のプレフィックス走査に変更し、キー追加のたびの列挙漏れを防止
- [x] OPMLインポート/エクスポート（`feature/opml-import-export`、PR #19）
  - `OpmlService` 新規。OPML書き出し（共有）/取り込み（URL検証・重複スキップ・ファビコン補完）。`expo-document-picker` / `expo-sharing` 追加
- [x] データのバックアップ/復元（`feature/data-backup-restore`、PR #20）
  - `BackupService` 新規。フィード・フィルタ・許可KW・**記事**をJSONで入出力。表示設定は対象外
  - エクスポートは「すべての記事／お気に入りのみ」をトグルで選択。記事はURLでフィードに紐づけ復元
  - 復元は中身を見せてから「追加（マージ）／置き換え」を選択。置き換えは二段階確認＋消す前に安全バックアップ、進行中同期のキャンセル
  - マージ時は既存記事のお気に入りを立て直す（既読は端末側を正として維持）
- [x] 共通ユーティリティ切り出し
  - `utils/exportFile.ts`（`writeAndShare` / `writeCacheFile`）で OPML・バックアップの書き出し/共有を共通化
  - `utils/feedUrl.ts`（`isValidFeedUrl` / `getFaviconUrl`）で重複解消
- [x] 外部キーを有効化（`fix/enable-foreign-keys`、PR #21）
  - `PRAGMA foreign_keys = ON` を接続ごとに張り、フィード削除で記事が孤児化する既存バグを修正。
    有効化前に生まれた孤児記事は初期化時に一度だけ掃除
- [x] 設定トグルの共通コンポーネント化・削除トランザクションの集約（`refactor/toggle-and-reset-dedup`、PR #22）
  - `components/Toggle.tsx` に集約（iOS標準スイッチ準拠）。`deleteAllFromTables` で削除処理を共通化

#### ビルド・提出
- [x] RCビルド（`preview` / Android APK・versionCode 11）＋実機でファイル選択・共有・各機能を確認
- [x] v1.1.7 本番ビルド（`production` / iOS build 11・Android versionCode 12、version 1.1.7）
- [x] リリースノート作成（日英、`docs/04_store/release_notes_v1.1.7.md`）
- [x] ストア説明文・キーワードに「シンプル」を追加（ASO、PR #23）
- [x] iOS/Android ストア提出（`eas submit`。Android は `releaseStatus: draft`）
  - Android 提出はローカルCLIが2分でタイムアウト→サーバー側は継続のため二重スケジュールの可能性あり。
    DRAFT のため公開影響なし。Play Console で versionCode 12 のドラフトが1つか要確認
- [x] 両ストアに提出完了（リリースノート・説明文はストア側で手動反映）

#### 残タスク（次期以降）
- [ ] `components/PasteButton.tsx` への共通化（filter_edit / feed_add / feed_edit で重複、優先度低）

---

### v1.1.8（提出完了）

> ⚠️ **新規ビルド必須**：`expo-background-task` / `expo-task-manager` を追加（OTA不可）。

#### マージ済み
- [x] 記事リストのスクロール位置を改善（`fix/article-list-scroll-jump`、PR #27）
  - `maintainVisibleContentPosition` で差し込み時に位置がずれない。手動更新は取得後に確実に先頭へ戻す
- [x] バックグラウンド更新＋起動時同期の再設計（`feature/background-fetch`、PR #28）
  - `expo-background-task` でタスク登録。中身は既存 `SyncService.refresh()`。lastSyncTime を更新しクールダウンにも反映、WiFiのみ設定も尊重
  - 間隔30分目安（OSにより間引かれる／iOSは特に不確実）。データ管理にオン/オフのトグル（既定オン）
  - 「起動のたびに同期」を廃止し、オンボーディング完了時の一度きりの初回取得に再設計（`pendingInitialFetch`）。通常起動は既存記事を即表示し、記事を手動削除しただけでは再取得しない
  - 前面復帰時（`AppState`）にホームの記事を読み直し。「表示と動作」→「表示」に改名し起動時同期トグルを削除
  - オンボーディング連打の突き抜け防止、「初回設定をやり直す」時のみツアーにスキップ、ツアー完走時に完了ダイアログ、文言見直し

#### ビルド・提出
- [x] preview APK で実機検証（連打・スキップ・文言・前面復帰・バックグラウンド更新）
- [x] v1.1.8 本番ビルド（`production` / Android versionCode 13、version 1.1.8。ビルド番号は remote 自動採番）
- [x] リリースノート作成（日英、`docs/04_store/release_notes_v1.1.8.md`）
- [x] iOS/Android とも提出・審査提出済み（Android は `releaseStatus: draft` → Play Console で手動反映・審査へ）
  - Android は `--no-wait` だとアップロード未完了のことがある。完了まで待つモードで再実行して成功を確認した

#### 学び
- Android のバックグラウンド更新は **App Standby Buckets** で数時間に間引かれる（アプリを開かない期間が長いほど遅延）。15分指定でも実機で1〜2時間の遅延を確認。仕様として受容し、確実な更新は手動プルに委ねる
- WorkManager 定期タスクは最短15分。間隔変更は再インストール（登録クリア）しないと反映されない（頻繁に開くと待機タイマーがリセットされるため、既登録なら再登録しない実装）

### v1.2.0（iOS / Android とも審査提出済み）

> ⚠️ **新規ビルド必須**：v1.1.9（iOSコーチマークずれ修正）を内包。ネイティブ構成は据え置き。

#### 事前分析（多様性の検討）
- [x] 1媒体あたりの取得上限（`MAX_ARTICLES=50`）を下げるべきか、ライブフィードのシミュレーションで検証
  - 上限を 10/20/30/50 と変えても top-100 の多様性はほぼ不変（媒体数 ≒26、上位5媒体で ≒40%）。上限を下げても多様性は改善しないと確認
  - 上限50は「1日分の記事を取りこぼさない最小値」（上限10だと22媒体で当日分を欠落、上限50だと欠落0）。**据え置きで確定**
  - 多様性の本質的改善は並び順ルール（1媒体1件まで／同一媒体を連続させない）であり、**将来対応**とする（下記）

#### マージ済み
- [x] フィード取得を並列化して更新時間を短縮（`perf/parallel-feed-fetch`、commit 35eee52）
- [x] タイムゾーン略称のパース対応で記事日時のずれを修正（RssService）
  - `Date.parse` は RFC-2822 の略称（GMT/EST 等）しか解釈できず、BST/CEST/JST 等は失敗して「現在時刻」にフォールバック → 一覧の先頭を埋めてしまう問題を修正
  - `TIMEZONE_ABBREVIATIONS`（BST/WET/CET/CEST/JST/KST/AEST 等）で末尾略称をオフセットに正規化。Sky Sports が日付解決 0/20 → 20/20 に改善
  - 単体テスト 7/7 合格。GMT / ISO8601 / 数値オフセット / RFC-2822略称(EST) は不変を確認（デグレなし）
- [x] デフォルトフィード整理（JA 9件・EN 5件削除、`defaultFeeds.ts`）
  - 削除後 ja63 + en63、16カテゴリすべて2フィード以上を維持。Sky Sports / BBC Sport は残す（BST修正で復活）
  - 既存ユーザーのDBは不変。**新規オンボーディングのみ**構成が変わる

#### ビルド・提出
- [x] v1.2.0 本番ビルド（`production` / appVersionSource: remote・autoIncrement、iOS build 15）
- [x] リリースノート作成（日英、`docs/05_store/release_notes_v1.2.0.md`）
- [x] iOS / Android とも `eas submit` で 1.2.0 を審査提出済み
  - iOS: EAS submit で提出（`✔ Submitted your app to Apple App Store Connect!` build 15）。ASC で「新機能」入力 → build 紐付け → 審査提出
  - Android: `releaseStatus: draft` でアップロード → Play Console で反映・審査提出
  - ※ 無料 Tier のためキュー待ちで時間がかかることがあるが、待てば EAS submit で完了する（従来どおり EAS で運用）

#### 学び
- `eas submit` の `409 Conflict "build N already exists"` は成功を意味しない。EAS Submissions 一覧と ASC TestFlight のビルド一覧で**実状態を必ず確認**する
- `Write` 後は `ls`/`wc` で**実在を必ず確認**する（生成したつもりで存在しないことがあった）
- 取得上限の引き下げは多様性に効かない。多様性は「並び順」で解くべき課題（次期以降）

#### 残タスク（次期以降）
- [ ] 記事一覧の並び順ルールで多様性を改善（1媒体1件まで／同一媒体を連続させない）
  - ※ v1.3.0 で**棚上げ**（アプリが順序を決めるのは思想に合わないため）。下記 v1.3.0 参照

---

### v1.3.0（iOS / Android 審査通過・リリース済み 2026-08-06）

> 方針転換: v1.2.0 で検討した「並び順による多様性」は棚上げ（`diversifyByFeed` は `feature/diversify-feed-order` に保存・未マージ）。代わりに **「引き算で育てる」整理UX**（表示/非表示の 0/1 のみ、ランキングには踏み込まない）へ舵を切った版。

#### マージ済み（整理UX 一式 ①〜④）
- [x] ① フィードのホーム非表示（ミュート）: `feeds.hidden_from_home`。フィード画面はスワイプ=非表示トグル・複数非表示モード・すべて選択
- [x] フィルタ画面にも一括選択＋最適化（メモ化・色ハイスト・ref管理）を横展開
- [x] ② 記事スワイプで非表示: `articles.is_hidden`（完全除外だが復元可能）。Undoトースト＋既存フィルタバーに統合した「除外N件・非表示M件[表示]」で復元
- [x] ③ 記事の長押しメニュー（この記事/このサイトを非表示、`ArticleActionSheet`）＋お気に入りを左スワイプへ移設
- [x] ④ フィード既読シグナル（🟢よく読む=既読数10以上 / ⚪全く読んでいない=淡いグレー）＋「既読数」並び替え（相関サブ `SUM(is_read)`）

#### マージ済み（その他）
- [x] 条件付きGET（ETag/Last-Modified）で通信量削減
- [x] ホーム未更新バグ修正（`SyncService.onSyncComplete` でホーム自動再読込）
- [x] オンボード刷新: 選択式＋コーチツアーを廃し、デフォルト自動投入＋「非表示にできる」GIF 1枚（`FirstRunScreen`）。seed は必ず残す
- [x] 「初回設定やり直す」を廃止→データ管理に「フィードをデフォルトに戻す」（フィルタ・表示設定は残す）
- [x] About のバージョンを `expo-constants` で動的表示（以後ズレない）
- [x] オンボードGIF→アニメWebP軽量化（同梱 約6.1MB→2.6MB、320px＋フレーム間引き＋lossy）

#### ビルド・提出
- [x] `eas build --platform all --profile production --auto-submit`（appVersionSource: remote・autoIncrement）
- [x] iOS build 16 → auto-submit → 審査**通過・公開**
- [x] Android: 初回 `SERVER_ERROR`（ワーカーOOM/ネットワークの一時障害）で失敗 → **再ビルドで通過**（versionCode 16）→ auto-submit → 審査**通過・公開**
- [x] リリースノート（日英、`docs/05_store/release_notes_v1.3.0.md`）

#### 学び
- Android `SERVER_ERROR "We've lost connection to the worker"` はコードでなくEASインフラの一時障害。iOSが同コードで成功していれば**再実行で通ることが多い**
- デフォルトフィードの seed は **デバイスロケールでなくアプリの言語設定**で（英語設定で英語フィードが入らない不具合の原因）
- seed 時に `icon_url` は `getFaviconUrl` で付ける（null だと全て新聞プレースホルダになる）
- Swipeable のアクション内ボタンは **RNGH の RectButton/Touchable** を使う（react-native の TouchableOpacity は左アクションでタップを取りこぼす）。アクション幅80はコンテナ側に指定（dpなので端末差なし）
- スワイプ後の状態更新は閉じアニメ後に遅延＋**明示的目標値**で更新（遅延とDBのトグルずれ防止）。`ToastContext` は `useMemo` 必須（consumer全体の再描画防止）
- GIF は寸法縮小＋フレーム間引き＋lossy WebP で大幅減。expo-image はアニメWebP対応

#### 残タスク（次期以降）
- [ ] ⑤ 整理提案モーダル（「整理しますか？[あとで][見る]」＝押し付けない・数件だけ提案）
- [ ] R8/ProGuard 有効化（`expo-build-properties`）＋実機で全機能テスト（minify のクラッシュ検証）。Play の推奨対応、1.3.1以降

---

### v1.3.1（EAS Update導入・フィード拡充・高速化 / iOS公開→P0発覚で1.3.2に置換）

#### マージ済み
- [x] **EAS Update(OTA)導入**（`expo-updates`、`runtimeVersion=appVersion`、production channel）。JSのみの修正を審査なしで配信可能に。有効化には expo-updates を埋め込んだビルドの提出が必要、以降 `eas update --branch production`
- [x] デフォルトフィード拡充: JA 63→76。新カテゴリ **アート・イラスト / 釣り・アウトドア / ペット・動物 / ガーデニング・植物**、Zennトピック(react/ts/python)、BBC News日本語、おたくまURL修正
- [x] フィード台帳の整理: `scripts/feed-candidates.json` に不採用フィードを `exclude`＋`excludeReason` で恒久記録（再調査防止）、`verify-feeds.mjs` は exclude を取得スキップ、運用手順 `scripts/README.md`。`defaultFeeds.ts` は生成物（直接編集不可）
- [x] 記事取得の高速化: 保存時の全記事3回ロード撤廃（`INSERT OR IGNORE`＋`insertMany` 戻り値に一本化）、`FETCH_CONCURRENCY` 6→10

#### ビルド・提出／結果
- [x] iOS buildNumber17 公開（自動リリース）／Android versionCode17 は審査中に破棄
- ⚠️ 直後に**P0（新規インストールでDB初期化落ち）が発覚** → 1.3.2 で修正・置換（下記）

---

### v1.3.2（緊急修正: 新規インストールでアプリが起動しない致命バグ / iOS・Android 公開済み）

#### P0 バグ
- `database/init.ts` で **articles テーブル作成の前**に `is_hidden` の `ALTER`/`CREATE INDEX` を実行 → 新規インストール（articles未作成）は `no such table: articles` で `initDatabase` が例外 → seedスキップ → **空の壊れた状態**でホームが開く
- v1.3.0（整理UX②）から混入。**開発/更新では既存DBに表があり再現せず、新規インストールだけで発症**したため見逃し。公開中の1.3.0・iOS公開の1.3.1 とも新規インストール全滅（更新ユーザーは無影響・自己回復不可）

#### 修正・配布
- [x] `ALTER`/`INDEX` を `CREATE TABLE` の後へ移動 ＋ `ensureColumn` にテーブル非存在ガード。sqlite3 で旧失敗/新成功を実証
- [x] 配布はOTA不可（1.3.0はexpo-updates未搭載、1.3.1は初回起動で埋め込みbundleが先に落ちる）→ **新規ストアビルド必須**。壊れた新規ユーザーも 1.3.2 更新で自動復旧（初期化やり直し＋初回seed）
- [x] iOS buildNumber18（1.3.1公開済のため優先審査申請）／Android versionCode18（審査中1.3.1を破棄して置換）。両OS公開済み

#### 学び（重要）
- **新規インストール経路は dev/更新では隠れる**。まっさらDBに対する初期化の回帰検出が必要 → 1.3.3 で `scripts/check-db-init-order.mjs` を追加
- `ensureColumn`/`CREATE INDEX` は必ず対象テーブルの `CREATE TABLE` の**後**に置く

---

### v1.3.3（整理UX完走・ホーム検索・起動堅牢化 / iOS・Android 審査通過・公開 2026-08-13）

#### マージ済み（機能）
- [x] **ホーム検索**: タイトル/本文で「今見えている一覧」を絞り込み（`filteredArticles` 後段の `useMemo`・軽量、非表示表示中は淡色一致も出る）。恒久フィルタとは別物の一時検索
- [x] **⑤ サイト非表示の提案【整理UX完了】**: 同一サイトの記事を連続3件 or 累計5件 非表示にしたらブロッキングモーダルで「このサイトごと非表示に?」を提案、「あとで」で7日抑制（`utils/siteSuggest.ts`、`SiteHideSuggestModal`）。定期モーダルでなく**行動連動の文脈版**
- [x] スクロール開始で開いた横スワイプを自動クローズ（`onScrollBeginDrag`）
- [x] 既読シグナルの全体ゲート **100→30**（読み飛ばしがちでも早めに判断材料が出る）

#### マージ済み（起動堅牢化 / P0再発防止）
- [x] `_layout` の init 失敗握り潰しを廃止 → `InitErrorScreen`＋再試行（`onboardingDone=true` にしない）
- [x] `FilterEngine`/`BackupService` で空 `block_keyword`・空グローバル許可を弾く（空フィルタで全記事消失/全無効化を防止）
- [x] `is_hidden`/`hidden_from_home` を `CREATE TABLE` 直書き（`ensureColumn` 依存を減らす保険）
- [x] **`scripts/check-db-init-order.mjs`（`npm run check:db-init`）**で新規インストールのDB初期化順序退行を静的検出（旧v1.3.0で違反検出を実証）

#### ビルド・提出
- [x] iOS buildNumber19 / Android versionCode19、auto-submit。両OS審査通過・公開
- [x] 全JS変更（OTA可能だが新規インストール向けにフルビルド選択）

#### 運用・学び
- **main マージ前は敵対的セルフレビューを徹底**（P0漏れの反省）
- ストア説明文を全面改訂（「読みながらフィードを育てる」路線）＋検索追記。GitHub/ストア/アプリでキャラクターが一致
- **整理UXロードマップ ①〜⑤ 完走**（①フィードミュート ②記事スワイプ非表示 ③長押しメニュー＋お気に入り左スワイプ ④既読シグナル＋既読数ソート ⑤サイト非表示の提案）

#### 残タスク（次期以降）
- [ ] R8/ProGuard 有効化（`expo-build-properties`）＋実機で全機能テスト（minify のクラッシュ検証）
- [ ] 提案のグローバル ON/OFF 設定（提案機能を増やすタイミングで、`areSuggestionsEnabled()` 共有ヘルパー経由に）
- [ ] （任意）ホーム大リストの FlatList チューニング（`getItemLayout` 等）。リリースビルドで実測して必要なら

#### リリース後 OTA（審査なし・EAS Update 初運用）
- [x] 横スワイプの発火閾値 **10→30**（片手操作で縦スクロールが横スワイプに化けるのを軽減。`ReanimatedSwipeable` の `dragOffsetFromLeftEdge/RightEdge`＝内部 `activeOffsetX`。実機で 20→25→30 と調整）
- [x] これを **初の `eas update`（OTA）で配信**。version は据え置き（1.3.3のまま＝`runtimeVersion` 一致でストア版1.3.3ユーザーに到達）。次回起動で裏DL→その次の起動で反映、実機で確認済み
- 学び: `eas update` は既定で web も書き出すため `expo-sqlite/web/worker.ts` の `wa-sqlite.wasm` 未解決で export 失敗 → **`--platform android` と `--platform ios` を個別**に打って回避（実ユーザーはネイティブなので影響なし）
- [x] OTA②: fast-xml-parser のエンティティ展開上限バグ修正＋長いフィード名のヘッダー被り修正＋はてブ記事画像（`hatena:imageurl`優先）＋はてブをデフォルトdevカテゴリに追加

---

### v1.3.4（フィードURL自動検出 / iOS・Android 審査通過・公開 2026-08-19）

#### マージ済み（機能）
- [x] **フィードURL自動検出（RSS Autodiscovery）**: `feed_add` でサイトのトップページURL等を貼ると、入力URLがフィードとして解釈できない場合に `<head>` の `<link rel="alternate" type="application/rss+xml|atom+xml">` を読んでフィードURLを解決。設計: `docs/04_detail_design/services/FeedAutodiscovery.md`
  - `utils/feedAutodiscovery.ts`（`extractFeedLinks`）: `<base href>` 優先の相対URL解決、WordPress等のコメントフィードを判別（末尾に回す＋UIでバッジ表示）
  - `RssService.fetchMetaOrBody`: 既存 `fetchMeta` を壊さない薄いラッパ化。フィードでなければHTML本文（先頭200KB）を返し、同じURLの二重取得を回避
  - `FeedService.discoverFeedUrl`: 入力URL→Autodiscovery→**セクション/ユーザーのトップページで再Autodiscovery**→サイト直下URL限定の既知パス並列プローブ、の順で解決
  - `FeedCandidateModal`: 複数候補時の選択UI（コメントフィードはバッジで区別）
  - 候補1件のときは自動採用し「フィードを見つけました: URL」を必ず明示（黙って書き換えない）

#### 実機の敵対的セルフレビューで発見・修正した不具合（2周実施）
- [x] **深い記事URLでの誤検出**: `https://note.com/{user}/n/{記事id}` のような記事URLで見つからなかった場合、既知パス総当たりフォールバックが常にドメイン直下の絶対パスに解決される仕様のため、記事とは無関係な `https://note.com/rss`（サイト全体のフィード）を「見つけました」と誤答していた。`isSiteRootUrl()` でフォールバックの発火をサイト直下URL限定に制限し、深いURLでは素直に「見つかりませんでした」を返すよう修正
- [x] ユーザー要望で **`sectionRootUrl()`** を追加: 記事URLの最初のパスセグメントだけ残した「著者/セクションのトップページ」で再度Autodiscoveryを試す（パスの推測ではなく実在ページの`<link>`宣言を読むだけなので安全性の性質が異なる）。note.com・Qiitaの複数URLで安定動作を実データ確認
- [x] **セクショントップ再取得のタイムアウト**: 既定10秒のままだと元URL取得と直列で最悪20秒待たせる状態を実測で発見（Qiitaでサーバー応答が遅いタイミングに再現）→ フォールバックプローブと同じ5秒に短縮、最悪15秒に

#### プライバシーポリシー更新
- [x] `docs/privacy-policy.md`「4. 外部通信について」に自動検出の通信（ユーザー操作時のみ・巡回なし）を追記。GitHub Pages（`main`:`/docs` legacy build）は push で自動反映、追加操作不要

#### 配信方式の判断
- **OTAではなく通常の審査ルートを選択**: 新UI（`FeedCandidateModal`）を伴う実質的な新機能であり、これまでのOTA①②（スワイプ閾値調整・パーサ修正）とは異なりExpo/AppleのOTAポリシー（アプリの主目的を変えない範囲のJS更新）の想定範囲を超えると判断
- README.md の「通信」記述も更新（GitHub限定・審査とは無関係だが開発者向けの正確性のため）。ストア説明文（`description_ja/en.md`）は技術的な通信の主張を含まないため変更不要と判断

#### ビルド・提出
- [x] iOS buildNumber20 / Android versionCode20、`eas build` → `eas submit`（Androidは `releaseStatus: draft` のため一度DRAFTで提出）。両OS審査通過・公開

#### リリース後 OTA
- [x] **OTA③（2026-08-20）**: ダークモードでボタン文字が読めなくなる不具合を修正。`tint` 色がダークモードで `#fff` になる一方、`SiteHideSuggestModal`（サイト非表示提案の確定ボタン）と `InitErrorScreen`（DB初期化失敗時の再試行ボタン）の文字色が固定 `#fff` だったため、白背景に白文字で視認不能になっていた。ユーザー実機のスクショで発覚。他画面（`filter_edit.tsx` 等）と同じ「文字色を `light:#fff` / `dark:#151718` で動的に切り替える」パターンに合わせて修正し、既存パターンとの一貫性を確認（`/code-review` による敵対的セルフレビューで、最初の修正案＝新色 `#2f81f7` を追加する方式は既存パターンとの不一致とコントラスト不足を指摘され、既存パターンへの合わせ込みに変更）。version据え置き（1.3.4のまま）。Android update group `ac164957-979e-4188-a0aa-8b49c284e090` / iOS update group `594a9b94-dda4-4d3d-8ecf-843a2875da02`（Runtime 1.3.4）

---

## 既知の不具合

### fast-xml-parser のエンティティ展開上限でフィードが丸ごとパース失敗する（2026-08-15 検出 → 2026-08-16 修正・OTA②で配信済み）

- **症状**: 一部フィードが**登録も更新もできない**。`fetchMeta` / `fetchArticles` の双方が例外で落ちる。
  ```
  [EntityReplacer] Entity expansion count limit exceeded: 1444 > 1000
  ```
- **原因**: `services/RssService.ts` の `processEntities: true`（ブール指定）が fast-xml-parser v5 の既定上限 `maxTotalExpansions: 1000` を適用する。`&#39;` `&#x27;` `&nbsp;` のような**数値文字参照・HTML名前付きエンティティが1文書に1000個を超えると例外**（`&amp;` `&lt;` `&gt;` は対象外）。
- **混入経路**: `d04feff fix: npm audit で検出された脆弱性を全件修正`（2026-04-16）で **5.3.3 → 5.6.0**。5.3.3 にこの上限は無い。**コードは変えていないが依存更新で踏んだ**。以降のリリース（v1.2.x / v1.3.x）に含まれる。
- **影響範囲**（実データで計測）:
  - **デフォルトフィード139本: 全件OK**。このため初期状態では表面化せず、長期間気づかれなかった。
  - ユーザーが自分で追加するフィードで発生。確認できたもの: はてなブックマーク（人気エントリ / タグ検索）、メルカリ、クックパッド、サイボウズ、freee、SmartHR、Sansan、AWS News Blog、Google Developers Japan、Reddit `.rss`。**はてなブログ系の企業テックブログが軒並み該当**。
- **修正方針**: オブジェクト指定に切り替える。ただし**オブジェクト形式は既定値がブール形式と全く違う**ので、緩めるパラメータ以外は**ブール既定と同値に明示的に固定する**こと。

  | パラメータ | boolean:true の既定 | オブジェクトの既定 | 採用値 |
  |---|---|---|---|
  | `maxTotalExpansions` | **1000** | Infinity | **100000**（ここだけ緩める） |
  | `maxExpandedLength` | 100000 | 100000 | 1000000 |
  | `maxExpansionDepth` | 10 | **10000** | **10**（据え置き） |
  | `maxEntityCount` | 100 | **1000** | **100**（据え置き） |
  | `maxEntitySize` | 10000 | 10000 | 10000 |

  ```ts
  processEntities: {
    enabled: true,
    maxTotalExpansions: 100000,  // ← 1000 では足りない（実測ピーク 25,071）
    maxExpandedLength: 1000000,
    maxExpansionDepth: 10,       // オブジェクト既定(10000)に流されないよう明示
    maxEntityCount: 100,         // 同上（既定は1000）
    maxEntitySize: 10000,
  },
  ```

- **検証済み**: この設定で **キャッシュした170フィード（デフォルト139＋記事用31）が全件OK、回帰ゼロ**。
- **実測ピーク**: エンティティ出現数の最大は **25,071個**（はてなブックマークのタグ検索フィード / 342KB）、次点 16,786個（はてブIT人気）。
  ※ 当初「最大約2500」と記載していたが誤り。エラーメッセージの数値は**上限到達時点で打ち切られた値**であり、総数ではなかった。100000 は実測ピークの約4倍のマージン。
- **`Infinity` にしない理由**: フィードは未信頼の外部入力。展開後サイズの上限（`maxExpandedLength`）が実質的なOOM防御になる。`maxEntitySize`(10000) × `maxTotalExpansions`(100000) の最悪ケースを `maxExpandedLength` が 1MB で頭打ちにする、という関係。
- **billion laughs について（検証結果）**: 多段ネストのエンティティ爆弾を実際に食わせたが、**どの設定でも展開されなかった**。このバージョンの fast-xml-parser は DTD 定義エンティティを**1段しか展開しない**ため（単段の `<!ENTITY x "HELLO">` は展開されることを確認済み）、指数的展開は再現しない。したがって `maxExpansionDepth` の緩みは**現状は実害を確認できていない**が、パーサ側の実装変更で復活しうるため据え置きにしておく。

#### 修正が必要な箇所は3つ（同じ設定が重複している）

| ファイル | 用途 | 影響 |
|---|---|---|
| `services/RssService.ts:13` | フィード取得の本体 | 本命。登録も更新も落ちる |
| `services/OpmlService.ts:17` | **OPMLインポート** | 他リーダーから移行するユーザーの取り込みが失敗しうる |
| `scripts/verify-feeds.mjs:12` | フィード候補の検証スクリプト | エンティティの多い候補を**誤ってFAIL判定**する（カタログ品質に影響） |

将来また分岐しないよう、**共有の定数として1箇所に切り出して3ファイルから参照する**のが望ましい。

- **対応済み**: `constants/xmlEntityOptions.ts` に共有定数化のうえ3箇所（`RssService.ts` / `OpmlService.ts` / `scripts/verify-feeds.mjs`）に適用。実機確認済み。OTA②（2026-08-16）で配信済み。

---

## 将来対応検討

### バックグラウンド定期更新 → v1.1.8 で実装済み
- `expo-background-task` で実装（間隔30分・オン/オフのみ）。詳細は上の「v1.1.8」を参照。
- 実機での結論：Android は App Standby でかなり間引かれる（数時間遅延もあり得る）。「必ず開いた時に最新」は保証できず、確実な更新は手動プルに委ねる方針で確定。

### 起動・前面復帰時の自動更新（アイドル時のみ）→ 保留
- **経緯**: 「同期完了通知でホーム自動再読込」を実装済み（`SyncService.onSyncComplete` をホームが購読）。走行中の同期が完了すれば、新着がタブ往復なしで反映される。あわせて条件付きGET（ETag / Last-Modified）を導入し、再取得のコストを大幅に削減済み。
- **保留にした補完**: 「そもそも同期が走っていない」コールドスタート（Doze 等でバックグラウンド取得が抑制され、開いても取りに行かないケース）への対策。前面復帰・起動時に `SyncService.isRefreshing === false` かつ `lastSyncTime` が一定（例: 15分）より古ければ、軽く `refresh()` を起動する（表示反映は完了通知が担う）。条件付きGET導入でリクエストはほぼ 304 のため安価。
- **保留理由**: 通常操作では問題が出ていないため様子見。「起動のたびに同期しない」既存方針の一部見直しになるので、必要になってから入れる。
- **実装の勘所**: WiFi限定設定・オフライン・多重実行ガードは `refresh()` が既に尊重。前面復帰は `index.tsx` の AppState `active` 分岐、コールドスタートは初期フェッチ effect の通常起動パスに足す。

### iPad / iPad mini 対応
- **現状**: `supportsTablet: false`（iPhone 専用アプリとして提出）
- **背景**: 全画面で固定サイズのスタイル（px ハードコード）が多用されており、`useWindowDimensions` 等のレスポンシブ対応が未実装。iPad レイアウト実装には数日〜1週間の工数が見込まれるため、初回リリースでは見送り。
- **将来的にやること**:
  - `useWindowDimensions` を導入してスタイルを動的計算に変更
  - 大画面向けレイアウト（2カラム等）の検討
  - `supportsTablet: true` に戻し、iPad 用スクリーンショットを用意
  - iPad / iPad mini シミュレーターでの動作確認
