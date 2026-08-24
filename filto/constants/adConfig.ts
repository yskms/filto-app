import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/**
 * 広告ユニットID。
 *
 * Android: AdMob（pub-7366086915275961, Home Banner）で作成済みの実際の広告ユニット。
 * iOS: AdMob側にiOS用アプリ・広告ユニットをまだ作成していないため、引き続きテストID。
 *   作成後はここをAndroidと同様に実際のIDへ差し替える。
 * app.json の `androidAppId` は実際の値に差し替え済み。`iosAppId` は同じ理由でテストIDのまま。
 *
 * 設計: docs/01_requirements/01_monetization_plan.md §4
 */
export const AD_UNIT_ID = Platform.select({
  android: 'ca-app-pub-7366086915275961/5223368050',
  default: TestIds.ADAPTIVE_BANNER,
});
