import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '@/constants/storageKeys';

/**
 * 「このサイトを非表示にしませんか？」の提案ロジック（しつこさ防止つき）。
 *
 * トリガー（呼び出し側で判定）:
 * - 同一サイトの記事を SITE_SUGGEST_CONSECUTIVE 件連続で非表示にした
 * - または、そのサイトの累計非表示数が SITE_SUGGEST_CUMULATIVE 件に達した
 *
 * 「あとで」で断られたサイトは COOLDOWN_MS の間は再提案しない（勝手に消さない・押し付けない）。
 */
export const SITE_SUGGEST_CONSECUTIVE = 3;
export const SITE_SUGGEST_CUMULATIVE = 5;
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 断られたら7日は出さない

type DismissedMap = Record<string, number>;

async function readMap(): Promise<DismissedMap> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.siteSuggestDismissed);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as DismissedMap) : {};
  } catch {
    return {};
  }
}

/** そのサイトの提案を最近断ったか（クールダウン中か）。 */
export async function isSiteSuggestSuppressed(feedId: string): Promise<boolean> {
  const map = await readMap();
  const ts = map[feedId];
  return typeof ts === 'number' && Date.now() - ts < COOLDOWN_MS;
}

/** 「あとで」を記録し、しばらく再提案しないようにする。 */
export async function dismissSiteSuggest(feedId: string): Promise<void> {
  try {
    const map = await readMap();
    map[feedId] = Date.now();
    await AsyncStorage.setItem(StorageKeys.siteSuggestDismissed, JSON.stringify(map));
  } catch {
    // 保存失敗は無視（次回また提案されるだけで実害はない）
  }
}
