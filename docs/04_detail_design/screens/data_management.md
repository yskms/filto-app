# Data Management（データ管理）

## 概要
記事の保持・削除や取得条件など、データまわりに関する設定画面。Settings から「💾 Data Management」で遷移する。

## 含まれる項目

| 項目 | 内容 | 備考 |
|------|------|------|
| 記事保持期間 | 90日 / 180日 / 無制限 | AsyncStorage `@filto/data_management/articleRetentionDays`。SyncService と連携 |
| お気に入りも削除 | 自動削除時にスター付きも含めるか | `@filto/data_management/deleteStarredInAutoDelete` |
| バックグラウンド更新 | オン/オフ | `BackgroundSync` |
| WiFi時のみ取得 | 自動取得をWiFi接続時のみに限定 | `@filto/data_management/wifiOnlyFetch` |
| 最低更新間隔 | 手動更新の連打防止 | `@filto/data_management/minRefreshIntervalMinutes` |
| 初期化 | フィードをデフォルトに戻す | フィルタ・表示設定は残す |
| OPML Import/Export | フィードのインポート/エクスポート | `OpmlService` |
| データのバックアップ/復元 | バックアップ・復元（追加 / 置き換え） | `BackupService` |
| すべてのデータをリセット | 全削除 | `resetAllData()` |

## 記事保持期間の設計

選択肢と既定値・正規化は `constants/articleRetention.ts` に集約している。画面と
`SyncService`（バックグラウンド同期を含む）が同じ AsyncStorage の値を読むため、
片方だけで既定値を持つと「画面の表示より短い期間で消える」ズレが起きるため。

**短い保持期間を選択肢から外した理由（v1.6.0）**

articles は `UNIQUE(feed_id, link)` に対する `INSERT OR IGNORE` で保存され、削除判定は
`published_at` ではなく `fetched_at`（この端末が最初に取得した時刻）で行う。このため
保持期間で消した記事も、フィードのRSSにまだ載っていれば**次の同期で未読として再挿入
される**。更新の遅いフィード（RSSに古い記事がぶら下がったまま）ほど「まとめて消えて、
まとめて未読で戻る」が周期的に起きるため、7日・30日は選択肢から削除した。

保存済みの短い値は `normalizeArticleRetentionDays()` が既定値（90日）へ引き上げる。
引き上げる方向なので記事が余分に消えることはない。

## 記事の手動削除を持たない理由

`docs/02_basic_design/05_crud_matrix.md` のとおり、通常UIからの記事手動削除は想定しない。
v1.5.0 までは「記事を今すぐ削除」があったが、上記の再挿入の仕組みにより**削除しても次の
同期で戻ってくる**ため期待どおりに働かず、かつ最も破壊的な「全て削除」が初期選択という
状態だったため v1.6.0 で廃止した。掃除の用途は保持期間の自動削除と「初期化」「すべての
データをリセット」で足りる。

## 画面配置
- **パス**: `app/data_management.tsx`
- **タブグループ外**: ボトムタブ非表示。戻るで Settings に戻る。

## 遷移
- **←** → Settings

## 参考
- [settings.md](./settings.md) - 親画面
