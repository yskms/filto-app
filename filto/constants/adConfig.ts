import { TestIds } from 'react-native-google-mobile-ads';

/**
 * 広告ユニットID。
 *
 * TODO: 本番リリース前に、開発者自身のAdMobアカウントで作成した実際の広告ユニットID
 * （iOS/Androidそれぞれ）に差し替えること。それまではGoogle公式のテスト用ID
 * （実際のAdMobアカウントが無くても動作確認でき、収益は発生せず、誤ってアカウントが
 * 不正トラフィック扱いになる心配もない）を使う。
 * app.json の `androidAppId`/`iosAppId` も同様にテスト用のまま。
 *
 * 設計: docs/01_requirements/01_monetization_plan.md §4
 */
export const AD_UNIT_ID = TestIds.ADAPTIVE_BANNER;
