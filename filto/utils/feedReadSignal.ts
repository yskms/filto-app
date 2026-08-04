/**
 * フィードの既読状況から「整理の判断材料」となるシグナルを算出する。
 * 保持期間内の記事に対する既読率で判定する（記事は保持期間で消えるため、
 * 直近の読む/読まないの傾向を表す）。閾値は実データを見て調整可能。
 */
export type FeedReadSignal = 'often' | 'rarely' | 'never' | null;

const OFTEN_RATIO = 0.5; // これ以上読んでいれば「よく読む」
const RARELY_RATIO = 0.2; // これ未満なら「あまり読まない」
const MIN_SAMPLE = 5; // フィード単位で判定するのに必要な最低記事数（少数で赤にしない）

// 全体の既読数がこれ未満のうちは、まだ傾向が出ないのでシグナルを一切出さない。
// デフォルトフィード数（数十）に対して少なすぎると大半が未読判定になるため、
// ある程度読んで傾向が出てから出す。閾値は調整可能。
export const MIN_TOTAL_READ_FOR_SIGNALS = 25;

export function feedReadSignal(total: number, read: number): FeedReadSignal {
  if (total < MIN_SAMPLE) return null; // 記事が少なすぎて判断材料にならない
  if (read <= 0) return 'never'; // 1件も読んでいない
  const ratio = read / total;
  if (ratio >= OFTEN_RATIO) return 'often';
  if (ratio < RARELY_RATIO) return 'rarely';
  return null; // 中間はバッジを出さない
}
