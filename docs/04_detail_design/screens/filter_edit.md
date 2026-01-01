# FilterEdit（フィルタ追加・編集）

## 概要
キーワード条件によるフィルタルールを作成・編集する。

## UI構成
- ヘッダー：Filter Add / Edit
- 入力：
  - フィルタ名
  - 条件ビルダー
    - 含む / 含まない
    - AND / OR / NOT
- 保存ボタン

## 例
- 「FX」を含む
- ただし「仮想通貨」を含む場合は除外しない

## 保存仕様
- JSON形式でconditions保存

## 使用API / Service
- FilterService.save()

## 遷移
- ← Filters
