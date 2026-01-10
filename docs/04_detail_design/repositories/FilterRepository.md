# FilterRepository

## 概要
filters テーブルへのデータアクセスを提供するリポジトリ層。
SQLite を使用したフィルタの CRUD 操作を実装。

---

## 責務

### データアクセス層
- SQLite データベースとの直接通信
- SQL クエリの実行
- データの取得・保存・更新・削除
- 型安全なデータ変換

### 提供するメソッド
1. **list()** - フィルタ一覧取得（デフォルトソート）
2. **listWithSort()** - ソート付きフィルタ一覧取得
3. **get()** - 単一フィルタ取得
4. **create()** - フィルタ新規作成
5. **update()** - フィルタ更新
6. **delete()** - フィルタ削除
7. **count()** - フィルタ数取得

---

## データ型

### Filter型
```typescript
interface Filter {
  id?: number;                // undefined = 新規
  block_keyword: string;      // ブロックキーワード
  allow_keyword: string | null; // 許可キーワード（カンマ区切り）
  target_title: number;       // 0 or 1
  target_description: number; // 0 or 1
  created_at: number;         // UnixTime（秒）
  updated_at: number;         // UnixTime（秒）
}
```

### FilterSortType
```typescript
type FilterSortType = 
  | 'created_at_desc'
  | 'created_at_asc'
  | 'updated_at_desc'
  | 'updated_at_asc'
  | 'block_keyword_asc'
  | 'block_keyword_desc';
```

---

## メソッド詳細

### 1. list()

#### シグネチャ
```typescript
async list(): Promise<Filter[]>
```

#### 説明
全フィルタを作成日時の降順で取得。

#### SQL
```sql
SELECT * FROM filters ORDER BY created_at DESC
```

#### 実装
```typescript
async list(): Promise<Filter[]> {
  const db = openDatabase();
  const rows = db.getAllSync<{
    id: number;
    block_keyword: string;
    allow_keyword: string | null;
    target_title: number;
    target_description: number;
    created_at: number;
    updated_at: number;
  }>(
    'SELECT * FROM filters ORDER BY created_at DESC',
    []
  );

  return rows.map((row) => ({
    id: row.id,
    block_keyword: row.block_keyword,
    allow_keyword: row.allow_keyword,
    target_title: row.target_title,
    target_description: row.target_description,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}
```

#### 戻り値
- 成功: `Filter[]` - フィルタの配列
- 失敗: エラーをスロー

---

### 2. listWithSort()

#### シグネチャ
```typescript
async listWithSort(sortType: FilterSortType): Promise<Filter[]>
```

#### 説明
指定されたソート方法で全フィルタを取得。

#### パラメータ
- `sortType`: ソート方法

#### SQL例
```sql
-- created_at_desc
SELECT * FROM filters ORDER BY created_at DESC

-- block_keyword_asc
SELECT * FROM filters ORDER BY block_keyword COLLATE NOCASE ASC
```

#### 実装
```typescript
async listWithSort(sortType: FilterSortType): Promise<Filter[]> {
  const db = openDatabase();
  
  let orderByClause = '';
  switch (sortType) {
    case 'created_at_desc':
      orderByClause = 'ORDER BY created_at DESC';
      break;
    case 'created_at_asc':
      orderByClause = 'ORDER BY created_at ASC';
      break;
    case 'updated_at_desc':
      orderByClause = 'ORDER BY updated_at DESC';
      break;
    case 'updated_at_asc':
      orderByClause = 'ORDER BY updated_at ASC';
      break;
    case 'block_keyword_asc':
      orderByClause = 'ORDER BY block_keyword COLLATE NOCASE ASC';
      break;
    case 'block_keyword_desc':
      orderByClause = 'ORDER BY block_keyword COLLATE NOCASE DESC';
      break;
  }

  const rows = db.getAllSync<RowType>(
    `SELECT * FROM filters ${orderByClause}`,
    []
  );

  return rows.map((row) => ({ ...row }));
}
```

#### 注意点
- `COLLATE NOCASE`: 大文字小文字を区別しないソート
- 日本語も正しくソートされる

---

### 3. get()

#### シグネチャ
```typescript
async get(id: number): Promise<Filter | null>
```

#### 説明
指定IDのフィルタを取得。

#### パラメータ
- `id`: フィルタID

#### SQL
```sql
SELECT * FROM filters WHERE id = ?
```

#### 実装
```typescript
async get(id: number): Promise<Filter | null> {
  const db = openDatabase();
  const row = db.getFirstSync<RowType>(
    'SELECT * FROM filters WHERE id = ?',
    [id]
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    block_keyword: row.block_keyword,
    allow_keyword: row.allow_keyword,
    target_title: row.target_title,
    target_description: row.target_description,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
```

#### 戻り値
- 成功: `Filter` - フィルタデータ
- 存在しない: `null`

---

### 4. create()

#### シグネチャ
```typescript
async create(filter: Omit<Filter, 'id'>): Promise<number>
```

#### 説明
新しいフィルタを作成。

#### パラメータ
- `filter`: フィルタデータ（id なし）

#### SQL
```sql
INSERT INTO filters (
  block_keyword,
  allow_keyword,
  target_title,
  target_description,
  created_at,
  updated_at
) VALUES (?, ?, ?, ?, ?, ?)
```

#### 実装
```typescript
async create(filter: Omit<Filter, 'id'>): Promise<number> {
  const db = openDatabase();
  const result = db.runSync(
    `INSERT INTO filters (
      block_keyword,
      allow_keyword,
      target_title,
      target_description,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      filter.block_keyword,
      filter.allow_keyword,
      filter.target_title,
      filter.target_description,
      filter.created_at,
      filter.updated_at,
    ]
  );

  return result.lastInsertRowId;
}
```

#### 戻り値
- 成功: `number` - 作成されたフィルタの ID
- 失敗: エラーをスロー

---

### 5. update()

#### シグネチャ
```typescript
async update(filter: Filter): Promise<void>
```

#### 説明
既存のフィルタを更新。

#### パラメータ
- `filter`: 更新するフィルタデータ（id 必須）

#### SQL
```sql
UPDATE filters SET
  block_keyword = ?,
  allow_keyword = ?,
  target_title = ?,
  target_description = ?,
  updated_at = ?
WHERE id = ?
```

#### 実装
```typescript
async update(filter: Filter): Promise<void> {
  if (filter.id === undefined) {
    throw new Error('Filter id is required for update');
  }

  const db = openDatabase();
  db.runSync(
    `UPDATE filters SET
      block_keyword = ?,
      allow_keyword = ?,
      target_title = ?,
      target_description = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      filter.block_keyword,
      filter.allow_keyword,
      filter.target_title,
      filter.target_description,
      filter.updated_at,
      filter.id,
    ]
  );
}
```

#### エラーハンドリング
- `id` が undefined の場合: エラーをスロー

---

### 6. delete()

#### シグネチャ
```typescript
async delete(id: number): Promise<void>
```

#### 説明
指定IDのフィルタを削除。

#### パラメータ
- `id`: 削除するフィルタの ID

#### SQL
```sql
DELETE FROM filters WHERE id = ?
```

#### 実装
```typescript
async delete(id: number): Promise<void> {
  const db = openDatabase();
  db.runSync('DELETE FROM filters WHERE id = ?', [id]);
}
```

#### 注意点
- 存在しない ID を指定してもエラーにならない
- Service 層でエラーハンドリング推奨

---

### 7. count()

#### シグネチャ
```typescript
async count(): Promise<number>
```

#### 説明
フィルタの総数を取得。

#### SQL
```sql
SELECT COUNT(*) as count FROM filters
```

#### 実装
```typescript
async count(): Promise<number> {
  const db = openDatabase();
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM filters',
    []
  );

  return row?.count ?? 0;
}
```

#### 戻り値
- 成功: `number` - フィルタ数
- データなし: `0`

---

## 使用例

### フィルタ一覧取得
```typescript
const filters = await FilterRepository.list();
// → Filter[] （作成日時降順）
```

### ソート付き取得
```typescript
const filters = await FilterRepository.listWithSort('block_keyword_asc');
// → Filter[] （キーワード昇順）
```

### 単一取得
```typescript
const filter = await FilterRepository.get(1);
// → Filter | null
```

### 新規作成
```typescript
const id = await FilterRepository.create({
  block_keyword: 'FX',
  allow_keyword: '仮想通貨,web3',
  target_title: 1,
  target_description: 1,
  created_at: Math.floor(Date.now() / 1000),
  updated_at: Math.floor(Date.now() / 1000),
});
// → number (新しいID)
```

### 更新
```typescript
await FilterRepository.update({
  id: 1,
  block_keyword: 'FX',
  allow_keyword: 'crypto',
  target_title: 1,
  target_description: 1,
  created_at: 1704067200,
  updated_at: Math.floor(Date.now() / 1000),
});
```

### 削除
```typescript
await FilterRepository.delete(1);
```

### 件数取得
```typescript
const count = await FilterRepository.count();
// → number
```

---

## エラーハンドリング

### update() の ID チェック
```typescript
if (filter.id === undefined) {
  throw new Error('Filter id is required for update');
}
```

### その他のエラー
- SQLite エラーは自動的にスローされる
- Service 層で try-catch してハンドリング

---

## パフォーマンス最適化

### インデックス活用
```sql
CREATE INDEX idx_filters_created_at ON filters(created_at);
CREATE INDEX idx_filters_updated_at ON filters(updated_at);
```

### バッチ処理
- 複数削除は Service 層でループ
- 将来的には SQL の IN 句で一括削除も検討

### キャッシュ
- Repository 層ではキャッシュなし
- Service 層でキャッシュ実装（将来）

---

## テストケース

### list()
- [ ] 空のテーブル → 空配列を返す
- [ ] 複数のフィルタ → 作成日時降順で返す

### listWithSort()
- [ ] 全てのソートタイプで正しくソートされる
- [ ] COLLATE NOCASE が機能する

### get()
- [ ] 存在する ID → Filter を返す
- [ ] 存在しない ID → null を返す

### create()
- [ ] 正常に作成 → ID を返す
- [ ] created_at, updated_at が正しく保存される

### update()
- [ ] ID なし → エラーをスロー
- [ ] 正常に更新 → updated_at が更新される

### delete()
- [ ] 正常に削除
- [ ] 存在しない ID → エラーにならない

### count()
- [ ] 空のテーブル → 0 を返す
- [ ] フィルタあり → 正しい件数を返す

---

## 将来の拡張

### トランザクション
```typescript
async bulkDelete(ids: number[]): Promise<void> {
  const db = openDatabase();
  db.withTransactionSync(() => {
    for (const id of ids) {
      db.runSync('DELETE FROM filters WHERE id = ?', [id]);
    }
  });
}
```

### ページネーション
```typescript
async listPaginated(page: number, limit: number): Promise<Filter[]> {
  const offset = (page - 1) * limit;
  const rows = db.getAllSync(
    'SELECT * FROM filters ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return rows.map(...);
}
```

### 検索機能
```typescript
async search(keyword: string): Promise<Filter[]> {
  const rows = db.getAllSync(
    'SELECT * FROM filters WHERE block_keyword LIKE ?',
    [`%${keyword}%`]
  );
  return rows.map(...);
}
```

---

## 依存関係

### インポート
```typescript
import { openDatabase } from '@/database/init';
import { Filter } from '@/services/FilterService';
import { FilterSortType } from '@/components/FilterSortModal';
```

### 使用されている場所
- FilterService（全メソッド）

---

## 備考

### オブジェクトスタイル vs クラススタイル
- 現在: オブジェクトスタイル (`export const FilterRepository = { ... }`)
- 利点: シンプル、static メソッドのみ
- 将来的にはクラススタイルも検討可能

### 型安全性
- SQLite の行型を明示的に定義
- Filter 型への変換を確実に実行
- null チェックを適切に実装