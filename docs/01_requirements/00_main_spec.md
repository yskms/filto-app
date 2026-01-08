# Filto 仕様書

> RSSベースのローカル完結型ニュースリーダー

---

## ドキュメント構成

### 要件定義
- [00_main_spec.md](00_main_spec.md) - 本ファイル（要件定義）

### 基本設計
- [画面遷移図](../02_basic_design/01_screen_flow.md)
- [ワイヤーフレーム](../02_basic_design/02_wireframes.md)
- [DB設計](../02_basic_design/03_db_design.md)
- [ER図](../02_basic_design/04_er_diagram.md)
- [CRUD整理](../02_basic_design/05_crud_matrix.md)
- [API設計](../02_basic_design/06_api_design.md)
- [アーキテクチャ](../02_basic_design/07_architecture.md)
- [UI規約](../02_basic_design/08_ui_conventions.md)

### 開発計画
- [開発スケジュール](../03_dev_plan/01_wbs.md)

### 詳細設計
- [Home画面](../04_detail_design/home.md)
- [FeedSelectModal画面](../04_detail_design/feed_select_modal.md)
- [Feeds画面](../04_detail_design/feeds.md)
- [FeedAdd画面](../04_detail_design/feed_add.md)
- [Filters画面](../04_detail_design/filters.md)
- [FilterEdit画面](../04_detail_design/filter_edit.md)
- [Settings画面](../04_detail_design/settings.md)
- [Preferences画面](../04_detail_design/preferences.md)

### 実装制約
- [実装制約](../cursor/CONSTRAINTS.md)

---

## 要件概要

### アプリの目的
RSSフィードを用いて必要な情報のみを効率的に収集し、
キーワードベースのフィルタでノイズを抑えた"自分専用ニュースフィード"を提供する。

### 想定ユーザー
- Google Discover 等のレコメンド型フィードをよく使う人
- 技術・投資・音楽など特定ジャンルを継続的に追いたい人
- 不要な話題をキーワードで細かく除外したい人
- サインインやクラウド連携を好まない個人ユーザー

### 解決したい課題
- 興味のない話題や広告的記事が混ざりやすい
- キーワード単位で細かな制御ができない
- サービス・アカウント依存への不安

### 提供価値
- 自分で選んだRSSのみから情報取得
- block / allow による柔軟なフィルタ
- 完全ローカル動作で安心
- 本文は外部ブラウザで快適に閲覧

---

## 機能要件

### MVP（初期リリース）
- RSSフィード管理（追加・削除・並び替え）
- 記事取得・一覧表示
- 既読管理
- キーワードフィルタ（block / allow）
- フィルタの追加・編集・削除
- 手動更新
- 外部ブラウザでの記事表示
- 設定管理（言語・テーマ・同期関連）

### リリース後に対応予定
- 課金（Proプラン）
- グローバル許可リスト
- 正規表現対応
- お気に入り（スター）
- OPMLインポート/エクスポート

### スコープ外
- プッシュ通知
- バックグラウンド常時更新
- 全文取得・オフライン全文保存
- クラウド同期
- SNS共有

---

## 非機能要件

### パフォーマンス
- 起動は数秒以内
- Home表示は体感的に即時

### セキュリティ
- アカウント・個人情報を保持しない
- 通信はRSS取得のみ
- 外部へデータ送信しない

### 対応OS / 端末
- iOS / Android
- 一般的なスマートフォン端末

### 保守・運用
- ローカルDB破損時も再取得で復旧可能
- 設定はKey-Valueで拡張容易

---

## 方式設計

### アーキテクチャ
- フロント：React Native + Expo + TypeScript
- DB：SQLite（ローカル完結）
- バックエンド：なし（アプリ内ローカルAPIとして実装）

詳細は [アーキテクチャ図](../02_basic_design/07_architecture.md) を参照

### 外部サービス・API
- 利用なし（各RSS URLへ直接アクセス）

### データ構造
主要テーブル：
- `feeds` - RSSフィード
- `articles` - 記事
- `filters` - フィルタルール
- `settings` - 設定（Key-Value）

詳細は [DB設計](../02_basic_design/03_db_design.md) / [ER図](../02_basic_design/04_er_diagram.md) を参照

### フィルタロジック
```
if (記事.タイトル or 概要 に block_keyword が含まれる) {
  if (allow_keyword のいずれかが含まれる) {
    → 表示（例外として許可）
  } else {
    → ブロック
  }
}
```

### 画面構成
```
Tab Navigation
├─ Home（記事一覧）
├─ Filters（フィルタ管理）
└─ Settings（設定・フィード管理）
```

詳細は [画面遷移図](../02_basic_design/01_screen_flow.md) / [ワイヤーフレーム](../02_basic_design/02_wireframes.md) を参照

---

## 🚀 開発状況

詳細は [開発スケジュール](../03_dev_plan/01_wbs.md) を参照

---
