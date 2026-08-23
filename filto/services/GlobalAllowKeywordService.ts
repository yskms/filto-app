import { GlobalAllowKeywordRepository } from '@/repositories/GlobalAllowKeywordRepository';
import { GlobalAllowKeyword } from '@/types/GlobalAllowKeyword';
import { ProService } from '@/services/ProService';

// Pro版制限（無料版の上限）
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
   * メッセージ文言はここでは組み立てない（固定文字列だと呼び出し側の多言語対応が
   * 到達不能になるため）。reason/requiresProを見て呼び出し側でt()を選ばせる。
   * @param options.bypassLimit 無料版上限チェックをスキップする（バックアップの安全
   *   ロールバックで、ユーザー自身の既存データを書き戻すときにのみ使う）
   * @returns { success: boolean, id?: number, requiresPro?: boolean, reason?: 'empty' | 'duplicate' | 'dbError' }
   */
  async create(
    keyword: string,
    options?: { bypassLimit?: boolean }
  ): Promise<{
    success: boolean;
    id?: number;
    requiresPro?: boolean;
    reason?: 'empty' | 'duplicate' | 'dbError';
  }> {
    // 入力チェック
    const trimmed = keyword.trim();
    if (!trimmed) {
      return { success: false, reason: 'empty' };
    }

    // 重複チェック
    const exists = await GlobalAllowKeywordRepository.exists(trimmed);
    if (exists) {
      return { success: false, reason: 'duplicate' };
    }

    // Pro版チェック
    const allowed = await ProService.checkLimit(() => GlobalAllowKeywordRepository.count(), FREE_LIMIT, options);
    if (!allowed) {
      return { success: false, requiresPro: true };
    }

    // 追加実行
    try {
      const id = await GlobalAllowKeywordRepository.create(trimmed);
      return { success: true, id };
    } catch (error) {
      return { success: false, reason: 'dbError' };
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
