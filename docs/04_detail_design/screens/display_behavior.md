# Display & Behavior（表示・挙動）

## 概要
表示やアプリの挙動に関する設定画面。Settings から「👁 Display & Behavior」で遷移する。

## 含まれる項目

| 項目 | 内容 | 備考 |
|------|------|------|
| 既読の表示方法 | dim（薄く表示）/ hide（非表示） | AsyncStorage `@filto/display_behavior/readDisplay`。Home と連携 |
| テーマ | Light / Dark / System | AsyncStorage `@filto/display_behavior/theme` |
| 言語 | 日本語 / English | AsyncStorage `@filto/display_behavior/language` |
| 起動時の挙動 | 自動更新 ON/OFF | AsyncStorage `@filto/display_behavior/autoSyncOnStartup`。30分以上経過時のみ同期 |

## 画面配置
- **パス**: `app/display_behavior.tsx`
- **タブグループ外**: ボトムタブ非表示。戻るで Settings に戻る。

## 遷移
- **←** → Settings

## 参考
- [settings.md](./settings.md) - 親画面
