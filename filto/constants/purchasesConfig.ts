/**
 * RevenueCatの設定値。
 *
 * iOS/Androidとも、RevenueCatダッシュボードでApp Store Connect/Google Play
 * それぞれの「App」を追加して発行された実際の公開APIキー（`appl_`/`goog_`接頭辞）。
 * ストア側（App Store Connect / Play Console）の実際のサブスク商品との紐付けは
 * 別途必要（設計: docs/01_requirements/01_monetization_plan.md §8.1参照）。
 */
export const REVENUECAT_API_KEYS = {
  ios: 'appl_IOKDuodHERMMkAWKSFmafmiYXaH',
  android: 'goog_ThZrApdIvaFlZSBenYfoQggcxjW',
};

/** RevenueCatダッシュボードで作成したentitlement識別子 */
export const ENTITLEMENT_ID = 'pro';
