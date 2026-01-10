# FilterService

## 概要
フィルタ機能のビジネスロジックを提供するサービス層。
Repository 層を使用してデータアクセスを行い、UI 層にシンプルなインターフェースを提供。

---

## 責務

### ビジネスロジック層
- フィルタの CRUD 操作
- データの検証
- タイムスタンプの管理
- Repository 層とのブリッジ
- 将来的なフィルタ評価エンジンとの連携

### 提供するメソッド
1. **list()** - フィルタ一覧取得（デフォルトソート）
2. **listWithSort()** - ソート付きフィルタ一覧取得
3. **get()** - 単一フィルタ取得
4. **save()** - フィルタ保存（新規 or 更新）
5. **delete()** - フィルタ削除
6. **count()** - フィルタ数取得

---

## データ型

### Filter型
```typescript
export interface Filter {
  id?: number;                // undefined = 新規
  block_keyword: string;      // ブロックキーワード
  allow_keyword: string | null; // 許可キーワード（カンマ区切り）
  target_title: number;       // 0 or 1
  target_description: number; // 0 or 1
  created_at: number;         // UnixTime（秒）
  updated_at: number;         // UnixTime（秒）
}
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

#### 実装
```typescript
async list(): Promise<Filter[]> {
  return await FilterRepository.list();
}
```

#### フロー
```
UI層
  ↓
FilterService.list()
  ↓
FilterRepository.list()
  ↓
SQLite: SELECT * FROM filters ORDER BY created_at DESC
  ↓
Filter[]
```

#### 使用場所
- Filters画面（初回読み込み）

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

#### 実装
```typescript
async listWithSort(sortType: FilterSortType): Promise<Filter[]> {
  return await FilterRepository.listWithSort(sortType);
}
```

#### フロー
```
UI層（currentSort state）
  ↓
FilterService.listWithSort(sortType)
  ↓
FilterRepository.listWithSort(sortType)
  ↓
SQLite: SELECT * FROM filters ORDER BY ...
  ↓
Filter[]
```

#### 使用場所
- Filters画面（ソート選択後）
- Filters画面（画面フォーカス時）

---

### 3. get()

#### シグネチャ
```typescript
async get(id: number): Promise<Filter>
```

#### 説明
指定IDのフィルタを取得。存在しない場合はエラーをスロー。

#### パラメータ
- `id`: フィルタID

#### 実装
```typescript
async get(id: number): Promise<Filter> {
  const filter = await FilterRepository.get(id);
  if (!filter) {
    throw new Error(`Filter with id ${id} not found`);
  }
  return filter;
}
```

#### エラーハンドリング
- フィルタが存在しない場合: `Error` をスロー
- UI 層で try-catch してハンドリング

#### 使用場所
- FilterEdit画面（編集モード）

---

### 4. save()

#### シグネチャ
```typescript
async save(filter: Filter): Promise<void>
```

#### 説明
フィルタを保存（新規作成 or 更新）。
タイムスタンプを自動的に設定。

#### パラメータ
- `filter`: 保存するフィルタデータ

#### 実装
```typescript
async save(filter: Filter): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  if (filter.id === undefined) {
    // 新規作成
    const newFilter: Omit<Filter, 'id'> = {
      ...filter,
      created_at: filter.created_at || now,
      updated_at: now,
    };
    await FilterRepository.create(newFilter);
  } else {
    // 更新
    const updatedFilter: Filter = {
      ...filter,
      updated_at: now,
    };
    await FilterRepository.update(updatedFilter);
  }

  // TODO: 将来的に evaluateAll() を呼び出す
  // await FilterEngine.evaluateAll();
}
```

#### ロジック

##### 新規作成時
1. `id` が undefined
2. `created_at` を設定（未設定の場合は現在時刻）
3. `updated_at` を現在時刻に設定
4. `FilterRepository.create()` を呼び出し

##### 更新時
1. `id` が存在
2. `updated_at` を現在時刻に更新
3. `created_at` は変更しない
4. `FilterRepository.update()` を呼び出し

#### タイムスタンプ管理
```typescript
const now = Math.floor(Date.now() / 1000); // UnixTime（秒）

// 新規作成時
created_at: filter.created_at || now  // 未設定なら現在時刻
updated_at: now                       // 常に現在時刻

// 更新時
created_at: そのまま                   // 変更しない
updated_at: now                       // 常に現在時刻に更新
```

#### 将来の拡張
```typescript
// フィルタ保存後、全記事を再評価
await FilterEngine.evaluateAll();
```

#### 使用場所
- FilterEdit画面（保存ボタン）

---

### 5. delete()

#### シグネチャ
```typescript
async delete(id: number): Promise<void>
```

#### 説明
指定IDのフィルタを削除。

#### パラメータ
- `id`: 削除するフィルタの ID

#### 実装
```typescript
async delete(id: number): Promise<void> {
  await FilterRepository.delete(id);

  // TODO: 将来的に evaluateAll() を呼び出す
  // await FilterEngine.evaluateAll();
}
```

#### 将来の拡張
```typescript
// フィルタ削除後、全記事を再評価
await FilterEngine.evaluateAll();
```

#### 使用場所
- Filters画面（スワイプ削除）
- Filters画面（複数削除）
- FilterEdit画面（削除ボタン）

---

### 6. count()

#### シグネチャ
```typescript
async count(): Promise<number>
```

#### 説明
フィルタの総数を取得。

#### 実装
```typescript
async count(): Promise<number> {
  return await FilterRepository.count();
}
```

#### 使用場所
- Pro版制限チェック（無料版: 100件まで）
- 将来的な統計表示

---

## 使用例

### フィルタ一覧取得
```typescript
const filters = await FilterService.list();
// → Filter[] （作成日時降順）
```

### ソート付き取得
```typescript
const filters = await FilterService.listWithSort('block_keyword_asc');
// → Filter[] （キーワード昇順）
```

### 単一取得
```typescript
try {
  const filter = await FilterService.get(1);
  // → Filter
} catch (error) {
  Alert.alert('エラー', 'フィルタが見つかりません');
}
```

### 新規作成
```typescript
await FilterService.save({
  block_keyword: 'FX',
  allow_keyword: '仮想通貨,web3',
  target_title: 1,
  target_description: 1,
  created_at: Math.floor(Date.now() / 1000),
  updated_at: Math.floor(Date.now() / 1000),
});
```

### 更新
```typescript
await FilterService.save({
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
await FilterService.delete(1);
```

### 件数取得
```typescript
const count = await FilterService.count();
if (count >= 100 && !isPro) {
  Alert.alert('フィルタの上限', '無料版では100個までです');
}
```

---

## エラーハンドリング

### get() のエラー
```typescript
try {
  const filter = await FilterService.get(filterId);
  setBlockKeyword(filter.block_keyword);
} catch (error) {
  Alert.alert('エラー', 'フィルタの読み込みに失敗しました');
  router.back();
}
```

### save() のエラー
```typescript
try {
  await FilterService.save(filter);
  router.back();
} catch (error) {
  Alert.alert('エラー', '保存に失敗しました');
}
```

### delete() のエラー
```typescript
try {
  await FilterService.delete(filterId);
  await loadFilters();
} catch (error) {
  Alert.alert('エラー', '削除に失敗しました');
}
```

---

## データフロー

### 新規作成フロー
```
FilterEdit画面（新規）
  ↓
ユーザーが入力
  ↓
保存ボタンタップ
  ↓
FilterService.save({ id: undefined, ... })
  ↓
created_at, updated_at を設定
  ↓
FilterRepository.create()
  ↓
SQLite: INSERT INTO filters
  ↓
Filters画面に戻る
  ↓
FilterService.listWithSort(currentSort)
  ↓
新しいフィルタが表示される
```

### 編集フロー
```
Filters画面
  ↓
行タップ（filterId 付き）
  ↓
FilterEdit画面（編集）
  ↓
FilterService.get(filterId)
  ↓
FilterRepository.get(filterId)
  ↓
フィルタデータを表示
  ↓
ユーザーが編集
  ↓
保存ボタンタップ
  ↓
FilterService.save({ id: filterId, ... })
  ↓
updated_at を更新
  ↓
FilterRepository.update()
  ↓
SQLite: UPDATE filters
  ↓
Filters画面に戻る
  ↓
更新されたフィルタが表示される
```

### 削除フロー
```
Filters画面
  ↓
スワイプまたは削除モード
  ↓
削除確認ダイアログ
  ↓
FilterService.delete(filterId)
  ↓
FilterRepository.delete(filterId)
  ↓
SQLite: DELETE FROM filters
  ↓
FilterService.listWithSort(currentSort)
  ↓
フィルタが消える
```

---

## 将来の拡張

### フィルタ評価エンジン連携

#### evaluateAll()
```typescript
async save(filter: Filter): Promise<void> {
  // ... 保存処理
  
  // 全記事を再評価
  await FilterEngine.evaluateAll();
}

async delete(id: number): Promise<void> {
  // ... 削除処理
  
  // 全記事を再評価
  await FilterEngine.evaluateAll();
}
```

#### evaluateArticle()
```typescript
async evaluateArticle(article: Article): Promise<boolean> {
  const filters = await this.list();
  return FilterEngine.evaluate(article, filters);
}
```

### キャッシュ機能
```typescript
private filterCache: Filter[] | null = null;
private cacheTimestamp: number = 0;
private CACHE_TTL = 60 * 1000; // 1分

async list(): Promise<Filter[]> {
  const now = Date.now();
  if (this.filterCache && (now - this.cacheTimestamp < this.CACHE_TTL)) {
    return this.filterCache;
  }
  
  const filters = await FilterRepository.list();
  this.filterCache = filters;
  this.cacheTimestamp = now;
  return filters;
}

clearCache(): void {
  this.filterCache = null;
  this.cacheTimestamp = 0;
}
```

### バッチ削除
```typescript
async deleteMultiple(ids: number[]): Promise<void> {
  for (const id of ids) {
    await FilterRepository.delete(id);
  }
  // または
  await FilterRepository.bulkDelete(ids);
  
  await FilterEngine.evaluateAll();
}
```

### Pro版制限チェック
```typescript
async canCreateFilter(): Promise<{ ok: boolean; message?: string }> {
  const count = await this.count();
  const isPro = await ProService.isPro();
  
  if (!isPro && count >= 100) {
    return {
      ok: false,
      message: '無料版では100個までフィルタを作成できます',
    };
  }
  
  return { ok: true };
}
```

---

## パフォーマンス

### 最適化ポイント
1. **Repository 層での SQL 最適化**
   - インデックス活用
   - 適切な ORDER BY 句

2. **タイムスタンプ計算**
   - Service 層で一度だけ計算
   - Repository 層には渡すだけ

3. **バッチ処理**
   - 複数削除はループで実行
   - トランザクション活用（将来）

### パフォーマンス指標
- `list()`: < 50ms（100件）
- `listWithSort()`: < 50ms（100件）
- `get()`: < 10ms
- `save()`: < 50ms
- `delete()`: < 30ms
- `count()`: < 10ms

---

## テストケース

### list()
- [ ] 空のDB → 空配列を返す
- [ ] 複数のフィルタ → 作成日時降順

### listWithSort()
- [ ] 全ソートタイプで正しくソート

### get()
- [ ] 存在する ID → Filter を返す
- [ ] 存在しない ID → エラーをスロー

### save() - 新規
- [ ] id なし → 新規作成
- [ ] created_at, updated_at が設定される

### save() - 更新
- [ ] id あり → 更新
- [ ] updated_at のみ更新される

### delete()
- [ ] 正常に削除
- [ ] 存在しない ID → エラーにならない

### count()
- [ ] 正しい件数を返す

---

## 依存関係

### インポート
```typescript
import { FilterRepository } from '@/repositories/FilterRepository';
import { FilterSortType } from '@/components/FilterSortModal';
```

### 使用されている場所
- Filters画面
- FilterEdit画面

---

## 備考

### Service 層の役割
- **ビジネスロジック**: タイムスタンプ管理、将来のフィルタ評価
- **エラーハンドリング**: Repository のエラーを UI に適した形に変換
- **データ変換**: 必要に応じて Repository のデータを変換
- **ブリッジ**: UI 層と Repository 層の橋渡し

### なぜ Service 層が必要か
1. UI 層が Repository の詳細を知る必要がない
2. ビジネスロジックを一箇所に集約
3. テストしやすい
4. 将来の拡張が容易（フィルタ評価、キャッシュなど）

### オブジェクトスタイル vs クラススタイル
- 現在: オブジェクトスタイル
- 将来的にキャッシュを実装する場合はクラススタイルに変更検討