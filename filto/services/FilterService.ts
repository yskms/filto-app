// Filter型定義
export interface Filter {
  id?: number;
  block_keyword: string;
  allow_keyword: string | null;
  target_title: number;
  target_description: number;
  created_at: number;
  updated_at: number;
}

// メモリ内のフィルタストア（ダミー実装）
let filtersStore: Filter[] = [];
let nextId = 1;

// 初期ダミーデータ
const initializeDummyData = () => {
  if (filtersStore.length === 0) {
    const now = Math.floor(Date.now() / 1000);
    filtersStore = [
      {
        id: 1,
        block_keyword: 'FX',
        allow_keyword: '仮想通貨,web3',
        target_title: 1,
        target_description: 1,
        created_at: now - 86400,
        updated_at: now - 86400,
      },
      {
        id: 2,
        block_keyword: '炎上',
        allow_keyword: null,
        target_title: 1,
        target_description: 1,
        created_at: now - 172800,
        updated_at: now - 172800,
      },
      {
        id: 3,
        block_keyword: 'ゴシップ',
        allow_keyword: null,
        target_title: 1,
        target_description: 1,
        created_at: now - 259200,
        updated_at: now - 259200,
      },
      {
        id: 4,
        block_keyword: '新卒',
        allow_keyword: 'react,typescript',
        target_title: 1,
        target_description: 1,
        created_at: now - 345600,
        updated_at: now - 345600,
      },
    ];
    nextId = 5;
  }
};

// FilterService
export const FilterService = {
  /**
   * フィルタ一覧を取得
   */
  async list(): Promise<Filter[]> {
    initializeDummyData();
    // 作成日時の降順で返す（新しい順）
    return [...filtersStore].sort((a, b) => b.created_at - a.created_at);
  },

  /**
   * 指定IDのフィルタを取得
   */
  async get(id: number): Promise<Filter> {
    initializeDummyData();
    const filter = filtersStore.find((f) => f.id === id);
    if (!filter) {
      throw new Error(`Filter with id ${id} not found`);
    }
    return { ...filter };
  },

  /**
   * フィルタを保存（新規作成 or 更新）
   */
  async save(filter: Filter): Promise<void> {
    initializeDummyData();
    const now = Math.floor(Date.now() / 1000);

    if (filter.id === undefined) {
      // 新規作成
      const newFilter: Filter = {
        ...filter,
        id: nextId++,
        created_at: filter.created_at || now,
        updated_at: now,
      };
      filtersStore.push(newFilter);
    } else {
      // 更新
      const index = filtersStore.findIndex((f) => f.id === filter.id);
      if (index === -1) {
        throw new Error(`Filter with id ${filter.id} not found`);
      }
      filtersStore[index] = {
        ...filter,
        updated_at: now,
      };
    }

    // TODO: 将来的に evaluateAll() を呼び出す
    // await FilterEngine.evaluateAll();
  },

  /**
   * フィルタを削除
   */
  async delete(id: number): Promise<void> {
    initializeDummyData();
    const index = filtersStore.findIndex((f) => f.id === id);
    if (index === -1) {
      throw new Error(`Filter with id ${id} not found`);
    }
    filtersStore.splice(index, 1);

    // TODO: 将来的に evaluateAll() を呼び出す
    // await FilterEngine.evaluateAll();
  },

  /**
   * フィルタ数を取得
   */
  async count(): Promise<number> {
    initializeDummyData();
    return filtersStore.length;
  },
};

