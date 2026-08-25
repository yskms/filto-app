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

  /**
   * 既存件数が無料版の上限を超えているか（編集してよいかの判定に使う）。
   * 上限を超えた状態は削除しない限り残るが、編集まで無制限に許すと上限が
   * 実質無意味になるため、超過中は編集をブロックする。削除は常に許可する
   * （このメソッドは呼ばない）。上限ちょうど・以下なら編集は許可する。
   */
  async isOverLimit(countFn: () => Promise<number>, limit: number): Promise<boolean> {
    if (await this.isPro()) return false;
    const count = await countFn();
    return count > limit;
  },
};
