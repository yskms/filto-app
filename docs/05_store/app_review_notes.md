# App Review に関する情報（メモ）

App Store Connect の「App Reviewに関する情報 → メモ」に貼り付ける本文。
**アプリの挙動を変えたらここも必ず直す**（ガイドライン2.3 Accurate Metadata に触れる）。

## 経緯

v1.5.0 提出時のメモは、初期バージョンのまま更新されておらず現在の挙動と食い違っていた:

- 「初回起動でフィード一覧は空」→ 実際は **FirstRunScreen でデフォルトフィードを自動投入**する（`seedDefaultFeeds`）
- 「+ ボタンでRSSフィードを追加」→ 追加自体は可能だが、レビュアーが最初に見る画面ではない
- 「長押しでお気に入りに保存」→ 実際は **長押しはメニュー表示**で、お気に入りは**スワイプのスターアクション**
- 「Settings > Filters」→ フィルタは**独立したタブ**で、設定の下ではない
- 「スクリーン録画を添付した」→ **添付ファイルは未選択**（存在しない添付を参照していた）

v1.5.1 で以下に差し替える。

---

## 貼り付け用（英語）

```
1. App Purpose

Filto is a privacy-focused RSS reader that gives users control over their news feed.

Most news apps use algorithmic recommendations that surface content the user did not
ask for. Filto removes the algorithm entirely: users read only the RSS feeds they
subscribe to, and use keyword filters to hide topics they do not want (with optional
allow keywords as exceptions).

No account, no tracking, and no user data leaves the device.

2. Instructions for Review

No login credentials are required. The app has no account system.

- On first launch, an onboarding screen appears and a set of default RSS feeds is
  added automatically, then articles are fetched. You do not need to add a feed to
  start reviewing.
- The app has four tabs: Home, Feeds, Filters, and Settings.
- Home: the article list. Tap an article to open it in the system browser.
  Swipe an article horizontally to reveal quick actions - a star (add to Favorites)
  and an eye-off icon (hide the article). Long-press an article to open a menu with
  "hide this article" and "hide this site".
- Filters (tab): add a block keyword (for example "politics") to hide matching
  articles, and optionally an allow keyword as an exception. Return to Home to see
  the result.
- Feeds (tab): add your own RSS/Atom feed, reorder, or mute a feed from Home.
- Settings > Data Management: article retention period, backup/restore, OPML
  import/export.

3. Ads and Subscription

- The free version shows a banner ad on Home. Ads are non-personalized only; the app
  does not track users across other apps or websites and does not request App
  Tracking Transparency permission.
- Settings > Filto Pro opens the subscription screen. "Filto Pro" is an
  auto-renewing monthly subscription that removes ads and lifts the free-version
  limits (10 filters and 2 global allow keywords).
- The subscription screen shows the localized price from the App Store, the
  subscription terms, and functional links to the Terms of Use (Apple standard EULA)
  and the Privacy Policy. The same information is in the App Description.

4. External Services

- RSS feeds are fetched directly from the URLs the user subscribes to. No
  third-party aggregation service is used.
- Articles open in the system browser (Safari). No in-app browser is embedded.
- All user data is stored on-device with SQLite (expo-sqlite).
- Google AdMob is used for banner ads (non-personalized). RevenueCat is used to
  manage subscription state.
- No analytics SDK, no authentication service, and no AI service is used.
- The app does not request camera, microphone, location, contacts, or photo library
  access.

5. Regional Differences

The app behaves the same in all regions. It supports English and Japanese, following
the device language setting. The set of default feeds differs between the two
languages.

6. Regulated Industry

This app does not operate in a regulated industry. No special credentials or
authorizations are required.
```

---

## 添付ファイル

スクリーン録画を添付する場合のみ、メモの冒頭に参照を書くこと。
**添付しないなら参照も書かない**（v1.5.0 で存在しない添付を参照していた）。
