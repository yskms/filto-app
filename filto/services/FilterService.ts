import { FilterRepository } from '@/repositories/FilterRepository';
import { FilterSortType } from '@/components/FilterSortModal';
import { ProService } from '@/services/ProService';

// Pro版制限。設計: docs/01_requirements/01_monetization_plan.md §5.1
export const FREE_LIMIT = 10;

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
   * @returns { success: boolean, message?: string, requiresPro?: boolean }
   */
  async save(filter: Filter): Promise<{ success: boolean; message?: string; requiresPro?: boolean }> {
    const now = Math.floor(Date.now() / 1000);

    if (filter.id === undefined) {
      // 新規作成: 上限は新規作成時のみチェックする。既存フィルタの編集は対象外
      // （遡って何かを制限しない方針。docs/01_requirements/01_monetization_plan.md §5.2）
      const isPro = await ProService.isPro();
      if (!isPro) {
        const count = await FilterRepository.count();
        if (count >= FREE_LIMIT) {
          // message はここでは組み立てない。固定の日本語文字列を返すと呼び出し側の
          // `result.message || t(...)` が常にこちらを選び、多言語対応の文言が
          // 到達不能になるため（呼び出し側でi18nメッセージを組み立てさせる）。
          return { success: false, requiresPro: true };
        }
      }

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

    return { success: true };
  },

  /**
   * フィルタを削除
   */
  async delete(id: number): Promise<void> {
    await FilterRepository.delete(id);
  },

  /**
   * フィルタ数を取得
   */
  async count(): Promise<number> {
    return await FilterRepository.count();
  },
};

