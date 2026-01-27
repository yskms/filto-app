# Data Management（データ管理）

## 概要
記事の保持・削除や取得条件など、データまわりに関する設定画面。Settings から「💾 Data Management」で遷移する。

## 含まれる項目

| 項目 | 内容 | 備考 |
|------|------|------|
| 記事保持期間 | 7日 / 30日 / 90日 / 無制限 | AsyncStorage `@filto/data_management/articleRetentionDays`。SyncService と連携 |
| お気に入りも削除 | 自動削除時にスター付きも含めるか | `@filto/data_management/deleteStarredInAutoDelete` |
| 手動削除オプション | 記事を今すぐ削除 | モーダルで期間選択・実行。ArticleRepository 使用 |
| WiFi時のみ取得 | モバイル時は取得しない | 今後対応予定 |
| 最低更新間隔 | 連打防止 | 今後対応予定 |
| （将来）OPML Import/Export | フィードのインポート/エクスポート | 今後対応予定 |
| （将来）データのバックアップ/復元 | バックアップ・復元 | 今後対応予定 |

## 画面配置
- **パス**: `app/data_management.tsx`
- **タブグループ外**: ボトムタブ非表示。戻るで Settings に戻る。

## 遷移
- **←** → Settings

## 参考
- [settings.md](./settings.md) - 親画面
