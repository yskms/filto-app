import type { PurchaseResult } from '@/services/purchasesTypes';

/**
 * web版フォールバック（no-op）。
 * react-native-purchasesはネイティブ専用で、webでは動かないどころか
 * トップレベルimportするだけでクラッシュしうる。プラットフォーム別ファイル解決
 * （purchases.native.ts）で実体を分離する。
 */
export async function initPurchases(): Promise<void> {}

export async function getIsPro(): Promise<boolean> {
  return false;
}

export function onProStatusChange(_cb: (isPro: boolean) => void): () => void {
  return () => {};
}

export async function getMonthlyPriceString(): Promise<string | null> {
  return null;
}

export function getLastPriceFetchDebugInfo(): string | null {
  return null;
}

export async function purchaseMonthly(): Promise<PurchaseResult> {
  return { success: false, cancelled: false, errorMessage: 'Not supported on this platform' };
}

export async function restorePurchases(): Promise<PurchaseResult> {
  return { success: false, cancelled: false, errorMessage: 'Not supported on this platform' };
}
