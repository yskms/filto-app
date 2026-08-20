/**
 * web版フォールバック（no-op）。
 * react-native-google-mobile-adsはネイティブ専用で、webでは動かないどころか
 * トップレベルimportするだけでクラッシュする。プラットフォーム別ファイル解決
 * （adInit.native.ts）で実体を分離し、_layout.tsx自身がネイティブ専用パッケージを
 * 直接importしなくて済むようにする。
 */
export function initAds(): Promise<boolean> {
  return Promise.resolve(false);
}

export function canShowAds(): Promise<boolean> {
  return Promise.resolve(false);
}
