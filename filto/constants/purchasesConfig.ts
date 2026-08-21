/**
 * RevenueCatの設定値。
 *
 * TODO: 本番リリース前に、実際のApp Store Connect/Play Console商品と紐付けた
 * プラットフォーム別の公開APIキーに差し替える。現在はRevenueCatが自動生成した
 * テスト用キー（`test_`接頭辞）を両OS共通で使っている。
 *
 * 設計: docs/01_requirements/01_monetization_plan.md
 */
export const REVENUECAT_API_KEYS = {
  ios: 'test_kCHgxZNVCPBjlFaOITqgTDtTVpg',
  android: 'test_kCHgxZNVCPBjlFaOITqgTDtTVpg',
};

/** RevenueCatダッシュボードで作成したentitlement識別子 */
export const ENTITLEMENT_ID = 'pro';
