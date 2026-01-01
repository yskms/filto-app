# FeedAdd（RSS追加）

## 概要
RSSフィードURLを入力して新規登録する画面。

## UI構成
- ヘッダー：Feed Add
- 入力欄：RSS URL（ペーストしやすい）
- ボタン：取得 / 追加

## 操作
- URL入力 → 取得：RSS検証＆メタ取得
- 成功時：フィード名・アイコン仮表示
- 追加：保存して戻る

## バリデーション
- URL形式チェック
- RSS取得失敗時はエラー表示

## 使用API / Service
- RssService.fetchMeta(url)
- FeedService.create()

## 遷移
- ← Feeds
