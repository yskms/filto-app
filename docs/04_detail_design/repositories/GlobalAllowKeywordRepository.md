# GlobalAllowKeywordRepository

## 概要
global_allow_keywords テーブルへのデータアクセスを提供するリポジトリ層。
SQLite を使用したグローバル許可キーワードの CRUD 操作を実装。

---

## 責務

### データアクセス層
- SQLite データベースとの直接通信
- SQL クエリの実行
- データの取得・保存・削除
- 型安全なデータ変換

### 提供するメソッド
1. **list()** - グローバル許可キーワード一覧取得
2. **create()** - キーワード新規作成
3. **delete()** - キーワード削除
4. **count()** - キーワード数取得
5. **exists()** - キーワード存在チェック

---

## データ型

### GlobalAllowKeyword型
```typescript
interface GlobalAllowKeyword {
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

#### SQL
```sql
SELECT * FROM global_allow_keywords ORDER BY created_at DESC
```

#### 実装
```typescript
async list(): Promise<GlobalAllowKeyword[]> {
  const db = openDatabase();
  
  const rows = db.getAllSync<{
    id: number;
    keyword: string;
    created_at: number;
  }>(
    'SELECT * FROM global_allow_keywords ORDER BY created_at DESC',
    []
  );

  return rows.map(row => ({
    id: row.id,
    keyword: row.keyword,
    created_at: row.created_at,
  }));
}
```

#### 戻り値
- **型**: `Promise<GlobalAllowKeyword[]>`
- **内容**: 全キーワードの配列（作成日時降順）

#### エラー処理
- DB接続エラー: 例外をスロー
- クエリ実行エラー: 例外をスロー

---

### 2. create()

#### シグネチャ
```typescript
async create(keyword: string): Promise<number>
```

#### 説明
新しいグローバル許可キーワードを作成。
UNIQUE 制約により、重複するキーワードは登録できない。

#### 引数
- **keyword**: 登録するキーワード（文字列）

#### SQL
```sql
INSERT INTO global_allow_keywords (keyword, created_at) VALUES (?, ?)
```

#### 実装
```typescript
async create(keyword: string): Promise<number> {
  const db = openDatabase();
  const createdAt = Math.floor(Date.now() / 1000);
  
  const result = db.runSync(
    'INSERT INTO global_allow_keywords (keyword, created_at) VALUES (?, ?)',
    [keyword, createdAt]
  );
  
  return result.lastInsertRowId;
}
```

#### 戻り値
- **型**: `Promise<number>`
- **内容**: 新規作成されたキーワードのID

#### エラー処理
- UNIQUE制約違反: 例外をスロー（キーワードが既に存在）
- DB接続エラー: 例外をスロー

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

#### SQL
```sql
DELETE FROM global_allow_keywords WHERE id = ?
```

#### 実装
```typescript
async delete(id: number): Promise<void> {
  const db = openDatabase();
  db.runSync('DELETE FROM global_allow_keywords WHERE id = ?', [id]);
}
```

#### 戻り値
- **型**: `Promise<void>`
- **内容**: なし

#### エラー処理
- DB接続エラー: 例外をスロー
- 該当IDが存在しない: エラーにならない（0件削除として正常終了）

---

### 4. count()

#### シグネチャ
```typescript
async count(): Promise<number>
```

#### 説明
登録されているグローバル許可キーワードの総数を取得。
Pro版制限チェックに使用。

#### SQL
```sql
SELECT COUNT(*) as count FROM global_allow_keywords
```

#### 実装
```typescript
async count(): Promise<number> {
  const db = openDatabase();
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM global_allow_keywords'
  );
  return row?.count || 0;
}
```

#### 戻り値
- **型**: `Promise<number>`
- **内容**: 登録済みキーワード数

#### エラー処理
- DB接続エラー: 例外をスロー

---

### 5. exists()

#### シグネチャ
```typescript
async exists(keyword: string): Promise<boolean>
```

#### 説明
指定されたキーワードが既に登録されているかチェック。
重複登録を防ぐために使用。

#### 引数
- **keyword**: チェック対象のキーワード

#### SQL
```sql
SELECT COUNT(*) as count FROM global_allow_keywords WHERE keyword = ?
```

#### 実装
```typescript
async exists(keyword: string): Promise<boolean> {
  const db = openDatabase();
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM global_allow_keywords WHERE keyword = ?',
    [keyword.trim()]
  );
  return (row?.count ?? 0) > 0;
}
```

#### 戻り値
- **型**: `Promise<boolean>`
- **内容**: 
  - `true`: キーワードが既に存在
  - `false`: キーワードは未登録

#### エラー処理
- DB接続エラー: 例外をスロー

---

## DB テーブル定義

### global_allow_keywords テーブル

```sql
CREATE TABLE IF NOT EXISTS global_allow_keywords (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword     TEXT NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_global_allow_keyword ON global_allow_keywords(keyword);
```

#### カラム説明
| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | キーワードID |
| keyword | TEXT | NOT NULL, UNIQUE | 許可キーワード |
| created_at | INTEGER | NOT NULL | 作成日時（UnixTime秒） |

#### インデックス
- `idx_global_allow_keyword`: keyword カラムにインデックス（高速検索用）

#### 制約
- `UNIQUE(keyword)`: 同じキーワードを重複登録できない

---

## データフロー

### 登録フロー
```
1. GlobalAllowKeywordService.create(keyword)
   ↓
2. count() でキーワード数をチェック（Pro版制限）
   ↓
3. exists() で重複チェック
   ↓
4. create(keyword) で登録
   ↓
5. lastInsertRowId を返す
```

### 削除フロー
```
1. GlobalAllowKeywordService.delete(id)
   ↓
2. delete(id) でDB削除
   ↓
3. 完了
```

### 一覧取得フロー
```
1. GlobalAllowKeywordService.list()
   ↓
2. list() で全件取得（作成日時降順）
   ↓
3. GlobalAllowKeyword[] を返す
```

---

## 型変換

### DB → App
| DB | App | 変換 |
|----|-----|------|
| id: INTEGER | id: number | そのまま |
| keyword: TEXT | keyword: string | そのまま |
| created_at: INTEGER | created_at: number | そのまま（UnixTime秒） |

### App → DB
| App | DB | 変換 |
|-----|-----|------|
| keyword: string | keyword: TEXT | trim() 後にそのまま |
| - | created_at: INTEGER | Math.floor(Date.now() / 1000) |

---

## エラーハンドリング

### 想定されるエラー
1. **UNIQUE constraint failed**
   - 原因: 既に存在するキーワードを登録しようとした
   - 対応: exists() で事前チェック、エラー時は上位層でAlert表示

2. **DB接続エラー**
   - 原因: データベースファイルが破損、または権限不足
   - 対応: 例外をスローして上位層でキャッチ

3. **SQL実行エラー**
   - 原因: 不正なSQL文、型不一致
   - 対応: 例外をスローして上位層でキャッチ

---

## 使用例

### キーワード一覧取得
```typescript
const keywords = await GlobalAllowKeywordRepository.list();
console.log(keywords);
// [
//   { id: 3, keyword: '速報', created_at: 1705123456 },
//   { id: 2, keyword: '公式', created_at: 1705123400 },
//   { id: 1, keyword: '重要', created_at: 1705123300 }
// ]
```

### キーワード登録
```typescript
// 重複チェック
const exists = await GlobalAllowKeywordRepository.exists('速報');
if (exists) {
  Alert.alert('エラー', 'このキーワードは既に登録されています');
  return;
}

// 登録
const newId = await GlobalAllowKeywordRepository.create('速報');
console.log(`New keyword ID: ${newId}`);
```

### キーワード削除
```typescript
await GlobalAllowKeywordRepository.delete(1);
console.log('Keyword deleted');
```

### キーワード数取得
```typescript
const count = await GlobalAllowKeywordRepository.count();
console.log(`Total keywords: ${count}`);
```

---

## パフォーマンス

### 最適化ポイント
1. **インデックス**: keyword カラムにインデックスを作成済み
2. **ORDER BY**: created_at でソート（インデックスなし、件数が少ないため問題なし）
3. **UNIQUE制約**: keywordの重複チェックが高速

### スケーラビリティ
- 想定件数: 無料版3件、Pro版でも100件程度
- パフォーマンス影響: ほぼなし

---

## テスト項目

### 単体テスト
- [ ] list() - 空状態での取得
- [ ] list() - 複数件の取得
- [ ] list() - ソート順の確認（created_at DESC）
- [ ] create() - 正常登録
- [ ] create() - UNIQUE制約違反
- [ ] delete() - 存在するIDの削除
- [ ] delete() - 存在しないIDの削除
- [ ] count() - 0件の場合
- [ ] count() - 複数件の場合
- [ ] exists() - 存在する場合
- [ ] exists() - 存在しない場合

### 結合テスト
- [ ] Service層との連携
- [ ] トランザクション処理
- [ ] エラーハンドリング

---

## 実装ファイル
- **パス**: `filto/repositories/GlobalAllowKeywordRepository.ts`
- **型定義**: `filto/types/GlobalAllowKeyword.ts`

---

## 参考
- [FilterRepository.md](./FilterRepository.md) - 類似の実装例
- [03_db_design.md](../../02_basic_design/03_db_design.md) - DB設計
