import { GlobalAllowKeywordRepository } from '@/repositories/GlobalAllowKeywordRepository';
import { GlobalAllowKeyword } from '@/types/GlobalAllowKeyword';

// Pro版制限
const FREE_LIMIT = 3;

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
  async create(keyword: string): Promise<{ success: boolean; message?: string; id?: number }> {
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
        return { 
          success: false, 
          message: `無料版は${FREE_LIMIT}件までです。Pro版にアップグレードしてください。`,
          requiresPro: true 
        };
      }
    }

    // 追加実行
    try {
      const id = await GlobalAllowKeywordRepository.create(trimmed);
      return { success: true, id };
    } catch (error) {
      console.error('Failed to create keyword:', error);
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
   * TODO: 実際のPro版判定ロジックを実装
   */
  async isPro(): Promise<boolean> {
    // 将来的にsettingsテーブルから取得
    return false; // 現在は無料版として扱う
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
