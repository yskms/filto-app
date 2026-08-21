import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo } from 'react-native-purchases';
import { REVENUECAT_API_KEYS, ENTITLEMENT_ID } from '@/constants/purchasesConfig';

let configured = false;
// 直近に判明しているPro状態。configure前・失敗時・初回問い合わせ完了前はfalse
// （安全側＝無料版として扱う。上限チェックや広告表示の判定はこれをそのまま使う）
let cachedIsPro = false;
const listeners = new Set<(isPro: boolean) => void>();

function hasEntitlement(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

function updateCache(info: CustomerInfo): void {
  cachedIsPro = hasEntitlement(info);
  listeners.forEach((cb) => cb(cachedIsPro));
}

/**
 * SDK初期化は一度だけ行う（複数箇所から呼ばれても安全なように）。
 * Purchases.configure() はネイティブモジュール未リンク時（依存追加直後で
 * dev client を作り直していない・Expo Go 等）に同期的にthrowするため、
 * ここで必ず捕まえる。失敗時は configured を立てないため、次回呼び出し時に
 * 再試行される（アプリを落とさず、無料版のまま動き続けられる）。
 */
function ensureConfigured(): void {
  if (configured) return;
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEYS.ios : REVENUECAT_API_KEYS.android;
    Purchases.configure({ apiKey });
    configured = true;
    Purchases.addCustomerInfoUpdateListener(updateCache);
    Purchases.getCustomerInfo().then(updateCache).catch(() => {});
  } catch {
    // ネイティブモジュール未リンク等。configured を立てないので次回再試行する
  }
}

export async function initPurchases(): Promise<void> {
  ensureConfigured();
}

/**
 * 現在Pro版かどうか。直近にリスナー/初回問い合わせで判明している状態を返す
 * （呼び出しのたびにネイティブブリッジへ問い合わせない。フィルタ作成のような
 * 頻繁な呼び出しでも遅延を持ち込まないため）
 */
export async function getIsPro(): Promise<boolean> {
  ensureConfigured();
  return cachedIsPro;
}

/**
 * Pro状態が変化するたびに呼ばれる（購入・復元・失効など、双方向）。
 * 戻り値の関数を呼ぶと購読解除する。
 */
export function onProStatusChange(cb: (isPro: boolean) => void): () => void {
  ensureConfigured();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
