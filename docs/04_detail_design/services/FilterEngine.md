# FilterEngine

## 概要
記事がフィルタ条件に一致するかを評価する純粋ロジック。
UI層やデータ層に依存せず、入力された記事とフィルタに基づいて判定を行う。

---

## 責務

### フィルタ評価エンジン
- 記事に対するフィルタ条件の評価
- グローバル許可リストの優先評価
- 対象範囲（タイトル/概要）の考慮
- 複数フィルタの順次評価

---

## データ型

### 入力型

#### Article
```typescript
interface Article {
  id: string;
  feedId: string;
  feedName: string;
  title: string;              // 評価対象
  link: string;
  summary?: string;           // 評価対象
  publishedAt: string;
  isRead: boolean;
}
```

#### Filter
```typescript
interface Filter {
  id?: number;
  block_keyword: string;      // ブロックキーワード
  allow_keyword: string | null; // 許可キーワード（カンマ区切り）
  target_title: number;       // 1 = 対象、0 = 対象外
  target_description: number; // 1 = 対象、0 = 対象外
  created_at: number;
  updated_at: number;
}
```

### 戻り値
```typescript
boolean
  - true: ブロック（記事を非表示）
  - false: 表示（記事を表示）
```

---

## メソッド詳細

### evaluate()

#### シグネチャ
```typescript
evaluate(
  article: Article,
  filters: Filter[],
  globalAllowKeywords: string[] = []
): boolean
```

#### パラメータ
- `article`: 評価対象の記事
- `filters`: 適用するフィルタ一覧
- `globalAllowKeywords`: グローバル許可キーワード（オプション）

#### 戻り値
- `true`: ブロック（記事を非表示）
- `false`: 表示（記事を表示）

#### 評価フロー

```
1. グローバル許可リストチェック（最優先）
   ↓ 一致あり → false（表示）
   ↓ 一致なし
   
2. 各フィルタを順次評価
   ↓
   2-1. 対象テキストを取得（target_title/target_description）
   ↓
   2-2. ブロックキーワードチェック
       ↓ 含まれない → 次のフィルタへ
       ↓ 含まれる
       
   2-3. 許可キーワードチェック
       ↓ 許可キーワードあり & 含まれる → 次のフィルタへ（例外）
       ↓ 許可キーワードなし or 含まれない
       
   2-4. ブロック判定 → true（ブロック）
   
3. 全フィルタ評価完了 → false（表示）
```

---

## 評価ロジック詳細

### Step 1: グローバル許可リスト（最優先）

```typescript
if (globalAllowKeywords.length > 0) {
  const text = `${article.title} ${article.summary || ''}`.toLowerCase();
  for (const keyword of globalAllowKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      return false; // 無条件で許可
    }
  }
}
```

**特徴**:
- グローバル許可キーワードに一致 → **他の全フィルタを無視して表示**
- 最優先で評価される
- 大文字小文字を区別しない

**例**:
- グローバル許可: `['React', 'TypeScript']`
- 記事: `FXとReactの比較`
- フィルタ: `block_keyword = 'FX'`
- 結果: **表示**（グローバル許可リストのReactに一致）

---

### Step 2: 通常フィルタ評価

#### 2-1. 対象テキストの取得

```typescript
getTargetText(article: Article, filter: Filter): string {
  let text = '';
  
  if (filter.target_title === 1) {
    text += article.title;
  }
  
  if (filter.target_description === 1 && article.summary) {
    text += ' ' + article.summary;
  }
  
  return text.toLowerCase();
}
```

**特徴**:
- `target_title = 1`: タイトルを対象に含める
- `target_description = 1`: 概要を対象に含める
- 大文字小文字を区別しない

---

#### 2-2. ブロックキーワードチェック

```typescript
if (targetText.includes(filter.block_keyword.toLowerCase())) {
  // ブロックキーワードに一致
}
```

**特徴**:
- 部分一致で評価
- 大文字小文字を区別しない

**例**:
- `block_keyword = 'FX'`
- `title = 'FXで稼ぐ'` → 一致 ✅
- `title = 'fxで稼ぐ'` → 一致 ✅
- `title = 'forex'` → **一致しない** ❌

---

#### 2-3. 許可キーワードチェック（例外処理）

```typescript
if (filter.allow_keyword) {
  const allowKeywords = filter.allow_keyword
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);
  
  const hasAllowKeyword = allowKeywords.some(kw => 
    targetText.includes(kw)
  );
  
  if (hasAllowKeyword) {
    continue; // 例外として許可
  }
}
```

**特徴**:
- 許可キーワードはカンマ区切り
- trim()で前後の空白を除去
- いずれか1つでも一致すれば例外として許可

**例**:
- `block_keyword = 'FX'`
- `allow_keyword = '仮想通貨,web3,crypto'`
- `title = 'FXと仮想通貨'` → **表示**（許可キーワードに一致）
- `title = 'FXトレード'` → **ブロック**（許可キーワードに不一致）

---

## 実装例

### 基本的な使用

```typescript
import { FilterEngine } from '@/services/FilterEngine';

const article = {
  id: '1',
  feedId: 'feed1',
  feedName: 'テックニュース',
  title: 'FXで稼ぐ方法',
  link: 'https://example.com/article',
  publishedAt: '2025-01-11T00:00:00Z',
  isRead: false,
};

const filters = [
  {
    id: 1,
    block_keyword: 'FX',
    allow_keyword: null,
    target_title: 1,
    target_description: 1,
    created_at: 1704067200,
    updated_at: 1704067200,
  }
];

const shouldBlock = FilterEngine.evaluate(article, filters);
// → true（ブロック）
```

---

### 許可キーワードの使用

```typescript
const article = {
  title: 'FXと仮想通貨の違い',
  summary: '投資の基礎知識',
  // ...
};

const filters = [
  {
    block_keyword: 'FX',
    allow_keyword: '仮想通貨,web3',
    // ...
  }
];

const shouldBlock = FilterEngine.evaluate(article, filters);
// → false（表示 - 許可キーワードに一致）
```

---

### グローバル許可リストの使用

```typescript
const article = {
  title: 'FXでReact開発',
  // ...
};

const filters = [
  {
    block_keyword: 'FX',
    allow_keyword: null,
    // ...
  }
];

const globalAllowKeywords = ['React', 'TypeScript'];

const shouldBlock = FilterEngine.evaluate(article, filters, globalAllowKeywords);
// → false（表示 - グローバル許可リストに一致）
```

---

### 対象範囲の指定

```typescript
const article = {
  title: '健全な投資記事',
  summary: 'FXについて解説',
  // ...
};

// タイトルのみ対象
const filter1 = {
  block_keyword: 'FX',
  target_title: 1,
  target_description: 0,
  // ...
};

const result1 = FilterEngine.evaluate(article, [filter1]);
// → false（表示 - タイトルにFXなし）

// 概要のみ対象
const filter2 = {
  block_keyword: 'FX',
  target_title: 0,
  target_description: 1,
  // ...
};

const result2 = FilterEngine.evaluate(article, [filter2]);
// → true（ブロック - 概要にFXあり）
```

---

## テストケース

### 実装済みテスト（8パターン）

実機で動作確認済み（`app/test_filter_engine.tsx`）

1. ✅ **ブロックキーワードに一致** → ブロック
2. ✅ **許可キーワードに一致（例外）** → 表示
3. ✅ **複数の許可キーワード** → 表示
4. ✅ **タイトルのみ対象** → 表示
5. ✅ **概要のみ対象** → ブロック
6. ✅ **グローバル許可リスト（最優先）** → 表示
7. ✅ **複数フィルタ** → ブロック
8. ✅ **どのフィルタにも一致しない** → 表示

---

## パフォーマンス

### 計算量
- **O(n × m)**
  - n: フィルタ数
  - m: キーワード数（平均）

### 最適化ポイント
1. **早期リターン**
   - グローバル許可リスト一致で即座に終了
   - 最初のブロック一致で即座に終了

2. **文字列の小文字化**
   - 1回のみ実行（記事ごと）
   - フィルタごとに繰り返さない

3. **短絡評価**
   - `some()` で最初の一致で停止

### 実測値（参考）
- 記事1件 × フィルタ10個: < 1ms
- 記事100件 × フィルタ10個: < 10ms

---

## エラーハンドリング

### 入力チェック
FilterEngine は純粋関数のため、エラーはスローせず `false`（表示）を返す：

- `article` が null → false
- `filters` が空配列 → false
- `summary` が undefined → タイトルのみ評価

### 呼び出し側での対応
```typescript
try {
  const shouldBlock = FilterEngine.evaluate(article, filters);
  if (shouldBlock) {
    // ブロック処理
  }
} catch (error) {
  // FilterEngine はエラーをスローしないが、念のため
  console.error('Filter evaluation error:', error);
}
```

---

## 将来の拡張

### 正規表現サポート
```typescript
// フィルタに正規表現フラグ追加
interface Filter {
  // ...
  is_regex: boolean;
}

// 評価ロジック
if (filter.is_regex) {
  const regex = new RegExp(filter.block_keyword, 'i');
  if (regex.test(targetText)) {
    // ブロック
  }
}
```

---

### AND/OR ロジック
```typescript
// 複数ブロックキーワードのAND条件
interface Filter {
  // ...
  block_keywords: string[]; // 全て含む必要がある
  operator: 'AND' | 'OR';
}
```

---

### スコアベース評価
```typescript
// ブロック強度を計算
function calculateScore(article: Article, filter: Filter): number {
  let score = 0;
  if (containsBlockKeyword) score += 10;
  if (containsAllowKeyword) score -= 5;
  return score;
}

// 閾値以上でブロック
const totalScore = filters.reduce((sum, f) => sum + calculateScore(article, f), 0);
return totalScore >= BLOCK_THRESHOLD;
```

---

## 使用箇所

### 現在
- **Home画面**（`app/(tabs)/index.tsx`）
  - 記事一覧表示時にフィルタ適用
  - グローバル許可キーワードと連携
- **テスト画面**（`app/test_filter_engine.tsx`）

### Home画面での使用例
```typescript
// Home画面でのフィルタ適用
useEffect(() => {
  // グローバル許可キーワードを文字列配列に変換
  const allowKeywords = globalAllowKeywords.map(k => k.keyword);
  
  // フィルタエンジンで評価
  const displayed = articles.filter(article => {
    const shouldBlock = FilterEngine.evaluate(article, filters, allowKeywords);
    return !shouldBlock; // ブロックされない記事のみ表示
  });

  setFilteredArticles(displayed);
}, [articles, filters, globalAllowKeywords]);
```

### グローバル許可キーワードとの連携フロー
```
1. Home画面読み込み
   ↓
2. GlobalAllowKeywordService.list() でキーワード取得
   ↓
3. State: globalAllowKeywords に保存
   ↓
4. useEffect（フィルタ適用）
   ↓
5. キーワード配列を文字列配列に変換
   allowKeywords = globalAllowKeywords.map(k => k.keyword)
   ↓
6. FilterEngine.evaluate(article, filters, allowKeywords)
   ↓
7. 結果に基づいて記事を表示/非表示
```

---

## 依存関係

### インポート
```typescript
import { Filter } from './FilterService';
import { Article } from '@/types/Article';
```

### 使用される場所
- ArticleService（将来）
- テスト画面

---

## 備考

### 純粋関数
- 副作用なし
- 同じ入力 → 同じ出力
- テストしやすい
- 並列処理可能

### パフォーマンス重視
- DB アクセスなし
- メモリ内で完結
- 高速評価

### 拡張性
- グローバル許可リスト対応済み
- 将来の機能追加が容易