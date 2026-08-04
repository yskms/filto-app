/**
 * フィードの既読状況から「整理の判断材料」となるシグナルを算出する。
 * 保持期間内の記事に対する既読率で判定する（記事は保持期間で消えるため、
 * 直近の読む/読まないの傾向を表す）。閾値は実データを見て調整可能。
 */
export type FeedReadSignal = 'often' | 'rarely' | 'never' | null;

const OFTEN_RATIO = 0.5; // これ以上読んでいれば「よく読む」
const RARELY_RATIO = 0.2; // これ未満なら「あまり読まない」

export function feedReadSignal(total: number, read: number): FeedReadSignal {
  if (total <= 0) return null; // 記事がまだ無い（判断材料なし）
  if (read <= 0) return 'never'; // 1件も読んでいない
  const ratio = read / total;
  if (ratio >= OFTEN_RATIO) return 'often';
  if (ratio < RARELY_RATIO) return 'rarely';
  return null; // 中間はバッジを出さない
}
