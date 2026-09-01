---
title: "RevenueCat × App Store Connect × Google Play Console 連携でハマった4箇所"
emoji: "🔑"
type: "tech"
topics: ["revenuecat", "iap", "appstoreconnect", "googleplayconsole", "expo"]
published: false
---

## はじめに

Expo(React Native)アプリにRevenueCatで課金機能を組み込む際、App Store Connect・Google Play Console・RevenueCatダッシュボードの3つを行き来する設定作業でいくつも詰まったので記録しておく。

一番時間を溶かしたのはAndroid側。実はEAS Submit用のサービスアカウントを作ったときにも同じ場所で迷った記憶があり、今回また同じ轍を踏んだ。「Google系のCI/IAP連携はPlay Console内で完結すると思わない」というのが今回一番の学びだったので、そこから書く。

## 1.（本命）GoogleのAPI連携は「Play Console」じゃなくて「Google Cloud Console」でやる

RevenueCatがAndroidの購入検証に使うサービスアカウントの発行元を、Play Console内で探し回った。

- 設定 → デベロッパー アカウント配下
- ユーザーと権限（ユーザー一覧・権限グループ・メール受信者の3タブのみ）
- 個別アプリ内の「テストとリリース」→「詳細設定」

2026年8月時点のPlay Console UIには、このどこにも「サービスアカウントを作成する」ボタンは無かった。

**答え**: サービスアカウントの作成・鍵の発行はPlay Console側の仕事ではなく、最初から **Google Cloud Console**（`console.cloud.google.com`）→「IAMと管理」→「サービスアカウント」の仕事。Play Console側でやるのは、できあがったサービスアカウントに**権限を招待する**ことだけ。この役割分担を最初に知っていれば探し回る時間はゼロだった。

どのGCPプロジェクトに紐付いているか分からない場合、既存のCI/CD用サービスアカウント（例: EAS Submit用の `xxx@your-project-id.iam.gserviceaccount.com`）のメールドメイン部分から、既にPlay Developer APIが有効化されているプロジェクトIDを逆算できる。新しくプロジェクトを作り直す必要はない。

### 権限は「どのアプリか」と「何の権限か」の2段階でセットする

Play Consoleの権限設定は2段階になっている。①どのアプリに対する権限を与えるか（「アプリの権限」でアプリを追加）、②そのアプリに対して具体的に何の権限を与えるか（チェックボックス）。**この2つを両方設定しないと、ユーザー一覧では「有効」と表示されていても実際の権限はゼロのまま**になる。

最低限、次の3つにチェックを入れれば通った。

- アプリ情報の閲覧、一括レポートのダウンロード（読み取り専用）
- 売上データ、注文、解約アンケートの回答の閲覧
- 注文と定期購入の管理

実際、招待時に②（権限チェックボックス）だけ入れて、①（アプリの追加）を忘れたまま進めたら、RevenueCat側は次のエラーを出し続けた。メッセージからは原因が権限未設定であることは一切分からない。

```
Service account credentials need attention
We were unable to validate your credentials.
```

## 2. App Store Connectの「鍵」は2種類ある

「ユーザとアクセス」→「キー」の中に、紛らわしい2つのサブメニューがある。

- **App Store Connect API**: 汎用キー。CI/CD（EAS Submit等）や、RevenueCatの商品自動インポート用。ダウンロードされるファイルは `AuthKey_XXXXXXXXXX.p8`
- **アプリ内購入**: サブスクリプション・StoreKit 2のトランザクション検証専用キー。ファイルは `SubscriptionKey_XXXXXXXXXX.p8`

RevenueCatの「In-app purchase key configuration」欄に間違えて前者をアップロードすると、次のエラーで弾かれる。

```
Invalid file name, it should be SubscriptionKey_XXXXXXXXXX.p8.
A file name with any other prefix could be a private key for a different Apple service.
```

**対処**: RevenueCatのApp設定画面には実は両方の入力欄がある。

- 「In-app purchase key configuration」→ アプリ内購入キー（`SubscriptionKey_`）
- 「App Store Connect API」→ App Store Connect APIキー（`AuthKey_`）

どちらか片方だけでは足りないので、ASC側で2種類とも発行する必要がある。

## 3. RevenueCatの商品登録で「Import」に固執しない・変な選択肢を選ばない

「New Product」ダイアログは「RevenueCat can automatically import Products from App Store Connect」という説明文が出るが、これは単なる案内文。下に並んでいる `Identifier` / `Display name` / `Product type` を手入力すれば、インポート機能が動いていなくても同じ結果になる。

- `Identifier` はストア側のProduct IDと**1文字も違わず完全一致**させる
- `Product type` は単純に **`Subscription`** を選ぶ

このとき選択肢の一番下に出てくる **「Monthly with 12 months commitment」** は選ばないこと。これはAppleの「毎月払いだが1年間の継続支払いが必須」という特殊な価格プラン向けの選択肢で、普通の自動更新サブスクとは別物。見た目上は`Subscription`の一種のように並んでいるので誤クリックしやすい。

## 4. Entitlementへの紐付けと、Offering内Packageへの紐付けは別作業

Entitlement（例: `pro`）に商品を紐付けても、既存のOffering内のPackageには自動で反映されない。

Offeringを開いて「Edit」→ 各Package（例: `$rc_monthly`）の中を見ると、ストアごとに商品が個別に紐付いているのが分かる。新しく追加したストアの商品がここで **「No product」** のままになっていることがあるので、Entitlement側だけ確認して満足せず、Offering側の該当Package内も必ず確認する。

## おわりに

この記事は、RevenueCatでのサブスク実装中に詰まったポイントの記録です。次に同じ作業をする自分自身と、同じ作業をするAIエージェントへのリファレンスになればと思って書きました。

検証時点は2026年8月21日、App Store Connect・Google Play Console・RevenueCatダッシュボードいずれもこの時点のUIです。各社のダッシュボードは変更されることがあるので、書いてある通りの場所に見当たらなければ「だいたいこのへんにある」という当たりをつける参考として読んでください。
