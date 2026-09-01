import { Platform } from 'react-native';

/**
 * 広告ユニットID。
 * AdMob（pub-7366086915275961, Home Banner）で作成済みの実際の広告ユニット。
 * iOS/Androidともに確認・審査完了済み。app.jsonの`androidAppId`/`iosAppId`も
 * 実際の値に差し替え済み。
 *
 * 設計: docs/01_requirements/01_monetization_plan.md §4
 */
export const AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-7366086915275961/7333775042',
  android: 'ca-app-pub-7366086915275961/5223368050',
})!;
