# GlobalAllowKeywordService

## 概要
グローバル許可キーワード機能のビジネスロジックを提供するサービス層。
Repository 層を使用してデータアクセスを行い、Pro版制限チェックなどのビジネスロジックを実装。

---

## 責務

### ビジネスロジック層
- グローバル許可キーワードの CRUD 操作
- Pro版制限チェック（無料版は3件まで）
- データの検証（空文字列チェック、重複チェック）
- タイムスタンプの管理
- Repository 層とのブリッジ
- FilterEngine との連携

### 提供するメソッド
1. **list()** - キーワード一覧取得
2. **create()** - キーワード新規作成（Pro版制限チェック付き）
3. **delete()** - キーワード削除
4. **count()** - キーワード数取得

---

## データ型

### GlobalAllowKeyword型
```typescript
export interface GlobalAllowKeyword {
  id?: number;          // undefined = 新規
  keyword: string;      // 許可キーワード
  created_at: number;   // UnixTime（秒）
}
```

---

## メソッド詳細

### 1. list()

#### シグネチャ
```typescript
async list(): Promise<GlobalAllowKeyword[]>
```

#### 説明
全グローバル許可キーワードを作成日時の降順で取得。

#### 実装
```typescript
async list(): Promise<GlobalAllowKeyword[]> {
  return await GlobalAllowKeywordRepository.list();
}
```

#### フロー
```
UI層（Global Allow Keywords画面）
  ↓
GlobalAllowKeywordService.list()
  ↓
GlobalAllowKeywordRepository.list()
  ↓
SQLite: SELECT * FROM global_allow_keywords ORDER BY created_at DESC
  ↓
GlobalAllowKeyword[]
```

#### 使用場所
- Global Allow Keywords画面（初回読み込み、追加・削除後の再読み込み）
- Home画面（FilterEngine評価時）

#### 戻り値
- **型**: `Promise<GlobalAllowKeyword[]>`
- **内容**: 全キーワードの配列（作成日時降順）

#### エラー処理
- DB接続エラー: 例外をスロー → UI層でAlert表示

---

### 2. create()

#### シグネチャ
```typescript
async create(keyword: string): Promise<number>
```

#### 説明
新しいグローバル許可キーワードを作成。
Pro版制限チェック、空文字列チェック、重複チェックを実行。

#### 引数
- **keyword**: 登録するキーワード（文字列）

#### ビジネスロジック

##### 1. 入力検証
```typescript
// 空文字列チェック
if (!keyword || keyword.trim().length === 0) {
  throw new Error('キーワードを入力してください');
}
```

##### 2. Pro版制限チェック
```typescript
const currentCount = await GlobalAllowKeywordRepository.count();
const MAX_FREE_KEYWORDS = 3;

if (currentCount >= MAX_FREE_KEYWORDS) {
  // TODO: Pro版かどうかをチェック
  throw new Error(
    `無料版では${MAX_FREE_KEYWORDS}件まで登録できます。\n` +
    'Pro版にアップグレードすると無制限に登録できます。'
  );
}
```

##### 3. 重複チェック
```typescript
const exists = await GlobalAllowKeywordRepository.exists(keyword.trim());
if (exists) {
  throw new Error('このキーワードは既に登録されています');
}
```

##### 4. 登録
```typescript
return await GlobalAllowKeywordRepository.create(keyword.trim());
```

#### 実装
```typescript
async create(keyword: string): Promise<number> {
  // 1. 入力検証
  if (!keyword || keyword.trim().length === 0) {
    throw new Error('キーワードを入力してください');
  }

  // 2. Pro版制限チェック
  const currentCount = await GlobalAllowKeywordRepository.count();
  const MAX_FREE_KEYWORDS = 3;

  if (currentCount >= MAX_FREE_KEYWORDS) {
    // TODO: Pro版かどうかをチェック（現状は無料版のみ）
    throw new Error(
      `無料版では${MAX_FREE_KEYWORDS}件まで登録できます。\n` +
      'Pro版にアップグレードすると無制限に登録できます。'
    );
  }

  // 3. 重複チェック
  const exists = await GlobalAllowKeywordRepository.exists(keyword.trim());
  if (exists) {
    throw new Error('このキーワードは既に登録されています');
  }

  // 4. 登録
  return await GlobalAllowKeywordRepository.create(keyword.trim());
}
```

#### フロー
```
UI層（Global Allow Keywords画面）
  ↓
GlobalAllowKeywordService.create('重要')
  ↓
入力検証（空文字列チェック）
  ↓
Pro版制限チェック（count() ≧ 3?）
  ↓
重複チェック（exists('重要')?）
  ↓
GlobalAllowKeywordRepository.create('重要')
  ↓
SQLite: INSERT INTO global_allow_keywords (keyword, created_at) VALUES (?, ?)
  ↓
lastInsertRowId を返す
```

#### 使用場所
- Global Allow Keywords画面（追加ボタンタップ時）

#### 戻り値
- **型**: `Promise<number>`
- **内容**: 新規作成されたキーワードのID

#### エラー処理
| エラー | 原因 | 対応 |
|-------|------|------|
| 空文字列 | 入力が空 | Alert表示 |
| Pro版制限 | 無料版で3件以上登録 | Alert + Pro版案内表示 |
| 重複 | 既に存在するキーワード | Alert表示 |
| DB接続エラー | データベース異常 | Alert表示 |

---

### 3. delete()

#### シグネチャ
```typescript
async delete(id: number): Promise<void>
```

#### 説明
指定されたIDのグローバル許可キーワードを削除。

#### 引数
- **id**: 削除対象のキーワードID

#### 実装
```typescript
async delete(id: number): Promise<void> {
  await GlobalAllowKeywordRepository.delete(id);
}
```

#### フロー
```
UI層（Global Allow Keywords画面）
  ↓
GlobalAllowKeywordService.delete(1)
  ↓
GlobalAllowKeywordRepository.delete(1)
  ↓
SQLite: DELETE FROM global_allow_keywords WHERE id = ?
  ↓
完了
```

#### 使用場所
- Global Allow Keywords画面（削除ボタンタップ時）

#### 戻り値
- **型**: `Promise<void>`
- **内容**: なし

#### エラー処理
- DB接続エラー: 例外をスロー → UI層でAlert表示

---

### 4. count()

#### シグネチャ
```typescript
async count(): Promise<number>
```

#### 説明
登録されているグローバル許可キーワードの総数を取得。
Pro版制限チェックに使用。

#### 実装
```typescript
async count(): Promise<number> {
  return await GlobalAllowKeywordRepository.count();
}
```

#### フロー
```
GlobalAllowKeywordService.count()
  ↓
GlobalAllowKeywordRepository.count()
  ↓
SQLite: SELECT COUNT(*) as count FROM global_allow_keywords
  ↓
count を返す
```

#### 使用場所
- create() 内でのPro版制限チェック

#### 戻り値
- **型**: `Promise<number>`
- **内容**: 登録済みキーワード数

#### エラー処理
- DB接続エラー: 例外をスロー

---

## データフロー

### 全体フロー図
```
┌─────────────────────────────────────────────────┐
│ Global Allow Keywords画面                        │
│ - キーワード一覧表示                              │
│ - 追加ボタン                                      │
│ - 削除ボタン                                      │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ GlobalAllowKeywordService                        │
│ - list(): 一覧取得                                │
│ - create(): Pro版制限チェック + 重複チェック      │
│ - delete(): 削除                                  │
│ - count(): 件数取得                               │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ GlobalAllowKeywordRepository                     │
│ - SQLiteへのCRUD操作                             │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ SQLite: global_allow_keywords テーブル           │
│ - id, keyword, created_at                        │
└─────────────────────────────────────────────────┘
```

### FilterEngineとの連携フロー
```
┌─────────────────────────────────────────────────┐
│ Home画面                                          │
│ - 記事一覧表示                                    │
│ - フィルタ評価                                    │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ loadData()                                       │
│ - GlobalAllowKeywordService.list() で取得        │
│ - グローバル許可キーワード配列を State に保存    │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ フィルタ適用（useEffect）                        │
│ - キーワード配列を文字列配列に変換               │
│   allowKeywords = globalAllowKeywords.map(k => k.keyword) │
│ - FilterEngine.evaluate(article, filters, allowKeywords) │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ FilterEngine                                     │
│ - グローバル許可キーワードを最優先でチェック     │
│ - マッチすれば無条件で表示（return false）       │
│ - マッチしなければ通常のフィルタ評価             │
└─────────────────────────────────────────────────┘
```

---

## Pro版制限

### 制限内容
| 版 | 登録可能件数 |
|----|-------------|
| 無料版 | 3件まで |
| Pro版 | 無制限 |

### 制限チェックのタイミング
- **create() 実行時**: count() で件数をチェック
- **3件以上の場合**: エラーをスローしてAlert表示

### Pro版判定（TODO）
```typescript
// 現状は無料版のみ
const isPro = false; // TODO: Pro版購入状態を取得

if (!isPro && currentCount >= MAX_FREE_KEYWORDS) {
  throw new Error(
    `無料版では${MAX_FREE_KEYWORDS}件まで登録できます。\n` +
    'Pro版にアップグレードすると無制限に登録できます。'
  );
}
```

### 将来的な実装
- [ ] Pro版購入状態の管理（SettingService?）
- [ ] App Store / Google Play の課金実装
- [ ] Pro版制限の解除

---

## エラーハンドリング

### エラーメッセージ一覧
| エラー | メッセージ | 原因 |
|-------|-----------|------|
| 空文字列 | `キーワードを入力してください` | 入力が空 |
| Pro版制限 | `無料版では3件まで登録できます。\nPro版にアップグレードすると無制限に登録できます。` | 無料版で3件以上登録 |
| 重複 | `このキーワードは既に登録されています` | 既に存在するキーワード |
| DB接続エラー | `キーワードの追加に失敗しました` | データベース異常 |

### UI層でのエラー処理例
```typescript
try {
  await GlobalAllowKeywordService.create(newKeyword.trim());
  Alert.alert('成功', 'キーワードを追加しました');
} catch (error: any) {
  console.error('Failed to add keyword:', error);
  Alert.alert('エラー', error.message || 'キーワードの追加に失敗しました');
}
```

---

## 使用例

### キーワード一覧取得
```typescript
// Global Allow Keywords画面の初回読み込み
const loadKeywords = async () => {
  try {
    const list = await GlobalAllowKeywordService.list();
    setKeywords(list);
  } catch (error) {
    Alert.alert('エラー', 'キーワードの読み込みに失敗しました');
  }
};
```

### キーワード追加
```typescript
// 追加ボタンタップ時
const handleAddKeyword = async () => {
  try {
    await GlobalAllowKeywordService.create(newKeyword.trim());
    setNewKeyword('');
    await loadKeywords();
    Alert.alert('成功', 'キーワードを追加しました');
  } catch (error: any) {
    Alert.alert('エラー', error.message || 'キーワードの追加に失敗しました');
  }
};
```

### キーワード削除
```typescript
// 削除ボタンタップ時
const handleDeleteKeyword = async (id: number) => {
  try {
    await GlobalAllowKeywordService.delete(id);
    await loadKeywords();
    Alert.alert('成功', 'キーワードを削除しました');
  } catch (error) {
    Alert.alert('エラー', 'キーワードの削除に失敗しました');
  }
};
```

### Home画面での使用
```typescript
// Home画面でグローバル許可キーワードを取得
const loadData = async () => {
  const globalAllowList = await GlobalAllowKeywordService.list();
  setGlobalAllowKeywords(globalAllowList);
};

// フィルタ適用時
useEffect(() => {
  const allowKeywords = globalAllowKeywords.map(k => k.keyword);
  const displayed = articles.filter(article => {
    const shouldBlock = FilterEngine.evaluate(article, filters, allowKeywords);
    return !shouldBlock;
  });
  setFilteredArticles(displayed);
}, [articles, filters, globalAllowKeywords]);
```

---

## テスト項目

### 単体テスト
- [ ] list() - 正常取得
- [ ] create() - 正常登録
- [ ] create() - 空文字列エラー
- [ ] create() - Pro版制限エラー（4件目）
- [ ] create() - 重複エラー
- [ ] delete() - 正常削除
- [ ] count() - 正常カウント

### 結合テスト
- [ ] UI層との連携
- [ ] FilterEngineとの連携
- [ ] エラーハンドリング

### E2Eテスト
- [ ] キーワード追加→一覧表示
- [ ] キーワード削除→一覧更新
- [ ] 3件登録→4件目でエラー
- [ ] グローバル許可キーワード適用→記事表示

---

## 実装ファイル
- **パス**: `filto/services/GlobalAllowKeywordService.ts`
- **型定義**: `filto/types/GlobalAllowKeyword.ts`
- **Repository**: `filto/repositories/GlobalAllowKeywordRepository.ts`

---

## 参考
- [FilterService.md](./FilterService.md) - 類似の実装例
- [FilterEngine.md](./FilterEngine.md) - グローバル許可キーワードの評価ロジック
- [GlobalAllowKeywordRepository.md](../repositories/GlobalAllowKeywordRepository.md) - Repository層
- [global_allow_keywords.md](../screens/global_allow_keywords.md) - 画面設計
