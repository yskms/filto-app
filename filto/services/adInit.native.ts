import MobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

/**
 * 広告SDKの初期化。最大コンテンツレーティングをG（全年齢向け）に固定し、きわどい
 * 広告を除外する。センシティブカテゴリの個別ブロックはSDK側にAPIが無く、AdMob
 * コンソール側での設定が必要（設計: docs/01_requirements/01_monetization_plan.md §4.2）
 */
export async function initAds(): Promise<void> {
  await MobileAds().setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.G });
  await MobileAds().initialize();
}
