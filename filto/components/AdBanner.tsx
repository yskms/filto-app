import React from 'react';

/**
 * web版フォールバック（何も表示しない）。
 * react-native-google-mobile-adsはネイティブ専用で、webでは動かないどころか
 * トップレベルimportするだけでクラッシュする。プラットフォーム別ファイル解決
 * （AdBanner.native.tsx）で実体を分離する。
 */
export const AdBanner: React.FC = () => null;
