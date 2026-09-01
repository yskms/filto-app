import MobileAds, { MaxAdContentRating, AdsConsent } from 'react-native-google-mobile-ads';

/**
 * 広告SDKの初期化。
 *
 * 1. UMP（User Messaging Platform）で同意情報を取得し、必要なら同意フォームを出す
 * 2. 広告をリクエストしてよい状態（canRequestAds）なら初期化する
 *
 * **なぜ同意取得が必須か**: Googleの「EU ユーザーの同意ポリシー」により、EEA/UK/
 * スイスのユーザーには、Cookie・ローカルストレージ・個人データの広告利用について
 * 開示と同意取得が求められる（2024-01-16以降、認定CMPの利用が必須化）。
 * `requestNonPersonalizedAdsOnly: true` だけでは要件を満たさない。非パーソナライズ
 * 広告でも、行動ターゲティングには使わないものの、不正防止・頻度制御の目的で識別子を
 * 使うことがあるため（設計 §10.1 に既述）。Filtoは英語圏が主軸でEU/UKユーザーを
 * 含むため、実際に影響する。
 *
 * `gatherConsent()` はEEA/UK圏外のユーザーには何も表示せず、そのまま
 * canRequestAds=true を返すので、日本など他地域のUXには影響しない。
 *
 * AdMobコンソールの「プライバシーとメッセージ」でGDPRメッセージを作成・公開済み
 * （Android/iOS両アプリを対象に含む）。未公開だと同意フォームが表示されず、
 * EEA/UKユーザーには広告が出ない（canRequestAds=false のまま）。
 *
 * 設計: docs/01_requirements/01_monetization_plan.md §4
 */

/** 初期化は一度だけ行い、結果（広告を表示してよいか）を共有する */
let adsReadyPromise: Promise<boolean> | null = null;
// 同意設定の再表示（撤回・変更）導線が必要か（EEA/UK/スイス等、対象地域のユーザーのみtrue）
let privacyOptionsRequired = false;

async function setupAds(): Promise<boolean> {
  // 同意情報の更新＋必要なら同意フォーム表示（圏外なら何も出ない）
  const consentInfo = await AdsConsent.gatherConsent();
  privacyOptionsRequired = consentInfo.privacyOptionsRequirementStatus === 'REQUIRED';

  // 同意が得られていない場合は広告をリクエストしない
  if (!consentInfo.canRequestAds) return false;

  // 最大コンテンツレーティングをG（全年齢向け）に固定し、きわどい広告を除外する。
  // センシティブカテゴリの個別ブロックはSDK側にAPIが無く、AdMobコンソール側での
  // 設定が必要（設計 §4.2）
  await MobileAds().setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.G });
  await MobileAds().initialize();
  return true;
}

export function initAds(): Promise<boolean> {
  if (!adsReadyPromise) {
    // 同意取得やSDK初期化が失敗したら広告を出さない（安全側に倒す）。
    // 収益より「同意なしに広告を出さない」ことを優先する
    adsReadyPromise = setupAds().catch(() => false);
  }
  return adsReadyPromise;
}

/** 広告を表示してよいか（初期化がまだなら開始して待つ） */
export function canShowAds(): Promise<boolean> {
  return initAds();
}

/**
 * 設定画面に「同意設定」の導線を出すべきか（EEA/UK/スイス等の対象地域のユーザーのみ）。
 * AdMobの「広告ユニットの導入」機能を有効にする場合、ユーザーがいつでも同意を
 * 撤回・変更できる導線（取り消しリンク）の設置がGoogle側の要件になっている。
 */
export async function isAdPrivacyOptionsRequired(): Promise<boolean> {
  await initAds().catch(() => false);
  return privacyOptionsRequired;
}

/** 同意設定（撤回・変更）フォームを表示する */
export async function showAdPrivacyOptions(): Promise<void> {
  await AdsConsent.showPrivacyOptionsForm();
}
