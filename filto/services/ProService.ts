/**
 * Pro版の判定。
 * 課金基盤（RevenueCat想定）未導入のため、現在は常に無料版として扱う。
 * 導入後はここをentitlement参照に差し替える（呼び出し元の変更は不要）。
 * 設計: docs/01_requirements/01_monetization_plan.md
 */
export const ProService = {
  async isPro(): Promise<boolean> {
    return false;
  },
};
