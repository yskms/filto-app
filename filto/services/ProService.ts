import { getIsPro } from '@/services/purchases';

/**
 * Pro版の判定。RevenueCatのentitlement（§4.2で作成した`pro`）を参照する。
 * 設計: docs/01_requirements/01_monetization_plan.md
 */
export const ProService = {
  async isPro(): Promise<boolean> {
    return getIsPro();
  },

  /**
   * 無料版の件数上限を満たしているか（新規作成してよいか）を判定する共通ヘルパー。
   * Pro版なら常に許可。bypassLimit=trueなら上限判定自体をスキップする
   * （バックアップの安全ロールバックでユーザー自身の既存データを書き戻すときに使う。
   * 新たに増える内容ではないため、遡って制限しない方針の一部。
   * 設計: docs/01_requirements/01_monetization_plan.md §5.2）
   */
  async checkLimit(
    countFn: () => Promise<number>,
    limit: number,
    options?: { bypassLimit?: boolean }
  ): Promise<boolean> {
    if (options?.bypassLimit) return true;
    if (await this.isPro()) return true;
    const count = await countFn();
    return count < limit;
  },
};
