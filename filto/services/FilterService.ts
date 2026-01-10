import { FilterRepository } from '@/repositories/FilterRepository';
import { FilterSortType } from '@/components/FilterSortModal';

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

// FilterService
export const FilterService = {
  /**
   * フィルタ一覧を取得
   */
  async list(): Promise<Filter[]> {
    return await FilterRepository.list();
  },

  /**
   * ソート付きでフィルタ一覧を取得
   */
  async listWithSort(sortType: FilterSortType): Promise<Filter[]> {
    return await FilterRepository.listWithSort(sortType);
  },

  /**
   * 指定IDのフィルタを取得
   */
  async get(id: number): Promise<Filter> {
    const filter = await FilterRepository.get(id);
    if (!filter) {
      throw new Error(`Filter with id ${id} not found`);
    }
    return filter;
  },

  /**
   * フィルタを保存（新規作成 or 更新）
   */
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
  },

  /**
   * フィルタを削除
   */
  async delete(id: number): Promise<void> {
    await FilterRepository.delete(id);

    // TODO: 将来的に evaluateAll() を呼び出す
    // await FilterEngine.evaluateAll();
  },

  /**
   * フィルタ数を取得
   */
  async count(): Promise<number> {
    return await FilterRepository.count();
  },
};

