import { GlobalAllowKeywordRepository } from '@/repositories/GlobalAllowKeywordRepository';
import { GlobalAllowKeyword } from '@/types/GlobalAllowKeyword';
import { ProService } from '@/services/ProService';

// Pro版制限。設計: docs/01_requirements/01_monetization_plan.md §5.1
export const FREE_LIMIT = 2;

/**
 * GlobalAllowKeywordService
 * グローバル許可キーワードのビジネスロジック
 */
export const GlobalAllowKeywordService = {
  /**
   * 全キーワードを取得
   */
  async list(): Promise<GlobalAllowKeyword[]> {
    return await GlobalAllowKeywordRepository.list();
  },

  /**
   * キーワードを追加
   * @returns { success: boolean, message?: string, id?: number }
   */
  async create(keyword: string): Promise<{ success: boolean; message?: string; id?: number; requiresPro?: boolean }> {
    // 入力チェック
    const trimmed = keyword.trim();
    if (!trimmed) {
      return { success: false, message: 'キーワードを入力してください' };
    }

    // 重複チェック
    const exists = await GlobalAllowKeywordRepository.exists(trimmed);
    if (exists) {
      return { success: false, message: 'このキーワードは既に登録されています' };
    }

    // Pro版チェック
    const isPro = await this.isPro();
    if (!isPro) {
      const count = await GlobalAllowKeywordRepository.count();
      if (count >= FREE_LIMIT) {
        // message はここでは組み立てない。固定の日本語文字列を返すと呼び出し側の
        // `result.message || t(...)` が常にこちらを選び、多言語対応の文言が
        // 到達不能になるため（呼び出し側でi18nメッセージを組み立てさせる）。
        return { success: false, requiresPro: true };
      }
    }

    // 追加実行
    try {
      const id = await GlobalAllowKeywordRepository.create(trimmed);
      return { success: true, id };
    } catch (error) {
      return { success: false, message: '登録に失敗しました' };
    }
  },

  /**
   * キーワードを削除
   */
  async delete(id: number): Promise<void> {
    await GlobalAllowKeywordRepository.delete(id);
  },

  /**
   * キーワード数を取得
   */
  async count(): Promise<number> {
    return await GlobalAllowKeywordRepository.count();
  },

  /**
   * Pro版かどうか
   */
  async isPro(): Promise<boolean> {
    return ProService.isPro();
  },

  /**
   * 残り追加可能数を取得（無料版のみ）
   */
  async getRemainingCount(): Promise<number | null> {
    const isPro = await this.isPro();
    if (isPro) {
      return null; // Pro版は無制限
    }

    const count = await this.count();
    return Math.max(0, FREE_LIMIT - count);
  },
};
