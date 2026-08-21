/**
 * RevenueCatの設定値。
 *
 * iOS: RevenueCatダッシュボードで「iOS App」を追加して発行された実際の公開APIキー
 *      （`appl_`接頭辞）。App Store Connect側の商品作成後、紐付けを確認すること。
 * Android: TODO: 「Android App」をRevenueCatダッシュボードに追加して発行された
 *      実際のキー（`goog_`接頭辞）に差し替える。それまではプロジェクト共通の
 *      テスト用キー（`test_`接頭辞）を暫定使用（Play Console側で課金権限を
 *      検出させるためのビルド用途のみ、実際の購入テストはこのキーでは通らない）。
 *
 * 設計: docs/01_requirements/01_monetization_plan.md
 */
export const REVENUECAT_API_KEYS = {
  ios: 'appl_IOKDuodHERMMkAWKSFmafmiYXaH',
  android: 'test_kCHgxZNVCPBjlFaOITqgTDtTVpg',
};

/** RevenueCatダッシュボードで作成したentitlement識別子 */
export const ENTITLEMENT_ID = 'pro';
