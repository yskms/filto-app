# Global Allow Keywords（グローバル許可キーワード）

## 概要
全てのフィルタに対して優先的に適用される許可キーワードの管理画面。
登録されたキーワードを含む記事は、どのフィルタ条件にも関わらず必ず表示される。

---

## 目的

### ユースケース
1. **重要な情報を見逃さない**
   - 「速報」「公式発表」など、優先度の高いキーワードを登録
   - フィルタでブロックされるリスクを回避

2. **個別設定の手間を省く**
   - 各フィルタに個別に許可キーワードを設定する必要がない
   - 一元管理で効率的

3. **緊急時の対応**
   - 特定の話題（災害、重大ニュースなど）を一時的に全て表示したい場合

### 利用シーン
- 災害情報: 「地震」「台風」「避難」
- 重要発表: 「速報」「公式」「リリース」
- 個人の興味: 「プログラミング」「AI」「React」

---

## UI構成

### ヘッダー
```
┌────────────────────────────────────────┐
│ ←  Global Allow Keywords              │
└────────────────────────────────────────┘
```
- 左：戻るボタン（←）→ Settings画面へ
- 中央：タイトル（Global Allow Keywords）
- 右：（なし）

### 入力エリア
```
┌────────────────────────────────────────┐
│ ┌──────────────────────┐  ┌──────┐   │
│ │ 新しい許可キーワード    │  │ 追加 │   │
│ └──────────────────────┘  └──────┘   │
└────────────────────────────────────────┘
```
- 左：テキスト入力フィールド（プレースホルダー: 「新しい許可キーワード」）
- 右：追加ボタン（青背景、白文字）
- Enter キー押下でも追加可能

### キーワードリスト
```
┌────────────────────────────────────────┐
│ 速報                               ✕   │
├────────────────────────────────────────┤
│ 公式                               ✕   │
├────────────────────────────────────────┤
│ 重要                               ✕   │
└────────────────────────────────────────┘
```
- 1行につき1キーワード
- 左：キーワード名（16px、通常フォント）
- 右：削除ボタン（✕、赤文字）
- 作成日時の降順でソート（新しいものが上）

### 空状態
```
┌────────────────────────────────────────┐
│                                        │
│           🚫                          │
│                                        │
│    許可キーワードはまだありません          │
│                                        │
│   追加すると、そのキーワードを含む       │
│   記事はフィルタでブロックされなく       │
│   なります                             │
│                                        │
└────────────────────────────────────────┘
```

---

## 操作

### キーワード追加
1. テキストフィールドにキーワードを入力
2. 「追加」ボタンをタップ（またはEnterキー）
3. バリデーションチェック
   - 空文字列 → エラーAlert
   - 重複 → エラーAlert
   - Pro版制限（3件以上） → 制限Alertとアップグレード案内
4. 成功 → 一覧の最上部に追加 & テキストフィールドをクリア & 成功Alert

### キーワード削除
1. 削除ボタン（✕）をタップ
2. 確認ダイアログ表示
   ```
   キーワードを削除
   
   「速報」を削除しますか？
   
   [キャンセル] [削除]
   ```
3. 「削除」タップ → 削除実行 & 成功Alert

### 戻る
- ヘッダーの戻るボタン（←）をタップ → Settings画面へ遷移

---

## データフロー

### 初回読み込み
```
画面表示
  ↓
useFocusEffect
  ↓
loadKeywords()
  ↓
GlobalAllowKeywordService.list()
  ↓
GlobalAllowKeywordRepository.list()
  ↓
SQLite: SELECT * FROM global_allow_keywords ORDER BY created_at DESC
  ↓
setKeywords(list)
  ↓
FlatList に表示
```

### キーワード追加
```
「追加」ボタンタップ
  ↓
handleAddKeyword()
  ↓
空文字列チェック
  ↓
GlobalAllowKeywordService.create(keyword)
  ↓
[Service内]
  ├→ count() でPro版制限チェック
  ├→ exists() で重複チェック
  └→ create() で登録
  ↓
成功 → loadKeywords() で再読み込み
  ↓
成功Alert表示
```

### キーワード削除
```
「✕」ボタンタップ
  ↓
確認ダイアログ表示
  ↓
「削除」タップ
  ↓
handleDeleteKeyword(id)
  ↓
GlobalAllowKeywordService.delete(id)
  ↓
GlobalAllowKeywordRepository.delete(id)
  ↓
SQLite: DELETE FROM global_allow_keywords WHERE id = ?
  ↓
成功 → loadKeywords() で再読み込み
  ↓
成功Alert表示
```

---

## Pro版制限

### 無料版
- **上限**: 3件まで
- **制限時の動作**:
  - 4件目を追加しようとするとエラーAlert
  - Pro版へのアップグレード案内を表示

### エラーメッセージ
```
無料版では3件まで登録できます。

Pro版にアップグレードすると
無制限に登録できます。

[キャンセル] [Pro版を見る]
```

### Pro版
- **上限**: 無制限
- **判定**: （TODO: Pro版購入状態の取得実装）

---

## バリデーション

### 入力チェック
| チェック項目 | 条件 | エラーメッセージ |
|------------|------|---------------|
| 空文字列 | keyword.trim().length === 0 | `キーワードを入力してください` |
| 重複 | 既に存在するキーワード | `このキーワードは既に登録されています` |
| Pro版制限 | 無料版で3件以上 | `無料版では3件まで登録できます。\nPro版にアップグレードすると無制限に登録できます。` |

### エラー表示
- Alert.alert() で表示
- タイトル: 「エラー」
- メッセージ: 上記のエラーメッセージ

---

## FilterEngineとの連携

### 評価フロー
```
Home画面
  ↓
loadData()
  ↓
GlobalAllowKeywordService.list() で取得
  ↓
State: globalAllowKeywords に保存
  ↓
useEffect（フィルタ適用）
  ↓
キーワード配列を文字列配列に変換
allowKeywords = globalAllowKeywords.map(k => k.keyword)
  ↓
FilterEngine.evaluate(article, filters, allowKeywords)
  ↓
[FilterEngine内]
  ↓
1. グローバル許可キーワードをチェック（最優先）
   - 記事のタイトルまたは概要に含まれる？
   - YES → return false（ブロックしない）
   - NO → 次のステップへ
  ↓
2. 通常のフィルタ評価
   - ブロックキーワードに一致？
   - 許可キーワードに一致？
  ↓
3. 結果を返す
   - true: ブロック
   - false: 表示
```

### 優先順位
```
1. グローバル許可キーワード（最優先）
   ↓ マッチしない場合のみ
2. 個別フィルタの評価
   - ブロックキーワード
   - 許可キーワード
```

### 具体例
```
【設定】
- グローバル許可キーワード: 「速報」
- フィルタ: ブロックキーワード = 「事故」

【記事】
タイトル: 「速報：交通事故が発生」

【評価】
1. グローバル許可キーワードチェック
   - 「速報」が含まれる → ✅ 表示（ブロックしない）

2. フィルタ評価はスキップ
   - 「事故」が含まれてもブロックされない
```

---

## 状態管理

### State
```typescript
const [keywords, setKeywords] = useState<GlobalAllowKeyword[]>([]);
const [newKeyword, setNewKeyword] = useState('');
const [isLoading, setIsLoading] = useState(false);
```

### 更新タイミング
- **初回読み込み**: useFocusEffect
- **追加後**: loadKeywords() で再読み込み
- **削除後**: loadKeywords() で再読み込み

---

## スタイル

### カラー
- ヘッダー背景: `#fff`
- ヘッダー境界線: `#e0e0e0`
- 戻るボタン: `#1976d2`（青）
- 追加ボタン背景: `#1976d2`（青）
- 追加ボタン文字: `#fff`（白）
- 削除ボタン: `#e53935`（赤）
- キーワード背景: `#fff`
- キーワード境界線: `#eee`

### フォント
- ヘッダータイトル: 18px、600（semi-bold）
- キーワード: 16px、通常
- 追加ボタン: 16px、600（semi-bold）
- 空状態メッセージ: 18px、通常
- 空状態ヒント: 14px、通常

### レイアウト
- ヘッダー高さ: 48px
- 入力エリア padding: 16px
- 入力フィールド高さ: 40px
- キーワード行 padding: 14px 16px
- 空状態アイコン: 60px
- 空状態 padding: 40px 20px

---

## エラーハンドリング

### 想定されるエラー
| エラー | 原因 | 対応 |
|-------|------|------|
| 読み込み失敗 | DB接続エラー | Alert: 「キーワードの読み込みに失敗しました」 |
| 追加失敗（空文字列） | 入力が空 | Alert: 「キーワードを入力してください」 |
| 追加失敗（重複） | 既存のキーワード | Alert: 「このキーワードは既に登録されています」 |
| 追加失敗（Pro版制限） | 無料版で3件以上 | Alert: Pro版案内 |
| 追加失敗（DB接続エラー） | DB異常 | Alert: 「キーワードの追加に失敗しました」 |
| 削除失敗 | DB接続エラー | Alert: 「キーワードの削除に失敗しました」 |

### エラー表示例
```typescript
try {
  await GlobalAllowKeywordService.create(newKeyword.trim());
  Alert.alert('成功', 'キーワードを追加しました');
} catch (error: any) {
  Alert.alert('エラー', error.message || 'キーワードの追加に失敗しました');
}
```

---

## 画面遷移

### 遷移元
- **Settings画面** → Global Allow Keywords画面

### 遷移先
- Global Allow Keywords画面 → **Settings画面**（戻るボタン）
- Global Allow Keywords画面 → **Pro版案内画面**（TODO: Pro版制限時）

### ナビゲーション
```typescript
// Settings画面から遷移
router.push('/(tabs)/global_allow_keywords');

// 戻るボタンで遷移
router.back(); // → Settings画面へ
```

---

## パフォーマンス

### 最適化
- **useFocusEffect**: 画面表示時のみデータ読み込み
- **useCallback**: ハンドラ関数のメモ化
- **FlatList**: 仮想化リスト（件数が少ないため影響は軽微）

### 想定データ量
- 無料版: 最大3件
- Pro版: 100件程度を想定
- パフォーマンス影響: ほぼなし

---

## アクセシビリティ

### キーボード操作
- テキストフィールドにフォーカス可能
- Enter キーで追加実行

### タップ領域
- 削除ボタン: hitSlop 設定（10px）
- 戻るボタン: hitSlop 設定（10px）

### フィードバック
- ボタンタップ: activeOpacity: 0.7
- 成功時: Alert表示
- エラー時: Alert表示

---

## テスト項目

### 単体テスト
- [ ] 初回読み込み（空状態）
- [ ] 初回読み込み（データあり）
- [ ] キーワード追加（正常）
- [ ] キーワード追加（空文字列エラー）
- [ ] キーワード追加（重複エラー）
- [ ] キーワード追加（Pro版制限エラー）
- [ ] キーワード削除（正常）
- [ ] キーワード削除（確認ダイアログ）

### 結合テスト
- [ ] Settings画面からの遷移
- [ ] FilterEngineとの連携
- [ ] Home画面での動作確認

### E2Eテスト
- [ ] キーワード追加 → Home画面で記事表示確認
- [ ] キーワード削除 → Home画面で記事ブロック確認
- [ ] 3件登録 → 4件目でエラー確認

---

## 実装ファイル

### コンポーネント
- **パス**: `filto/app/global_allow_keywords.tsx`
- **型**: Screen Component

### 使用Service
- `GlobalAllowKeywordService`

### 使用Repository
- `GlobalAllowKeywordRepository`（Serviceを通じて間接的に使用）

### 型定義
- `GlobalAllowKeyword`

---

## TODO

### 実装済み
- [x] 画面UI作成
- [x] CRUD機能実装
- [x] Pro版制限（無料版3件）
- [x] バリデーション（空文字列、重複）
- [x] FilterEngineとの統合

### 未実装
- [ ] Pro版購入状態の取得
- [ ] Pro版案内画面への遷移
- [ ] Settings での設定保存（ソート順など）
- [ ] 多言語対応
- [ ] ダークモード対応

---

## 参考
- [FilterEngine.md](../services/FilterEngine.md) - 評価ロジック
- [GlobalAllowKeywordService.md](../services/GlobalAllowKeywordService.md) - ビジネスロジック
- [settings.md](./settings.md) - 遷移元の画面設計
- [home.md](./home.md) - 連携先の画面設計
