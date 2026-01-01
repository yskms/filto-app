# Feeds（フィード管理）

## 概要
登録済みRSSフィードの一覧・並び替え・削除を行う画面。

## UI構成
- ヘッダー
  - タイトル：Feeds
  - 右：削除モードアイコン
- フィードリスト
  - 左：アイコン
  - 中：フィード名
  - 右：ドラッグハンドル
- 右下：＋ボタン（追加）

## 表示仕様
- 並び順：feeds.order_no ASC

## 操作
- 長押し：ドラッグで並び替え
- 削除モードON時：タップで削除対象
- ＋：FeedAddへ

## 使用データ
- feeds

## 使用API / Service
- FeedService.list()
- FeedService.reorder()
- FeedService.delete()

## 遷移
- → FeedAdd
- ← Settings
