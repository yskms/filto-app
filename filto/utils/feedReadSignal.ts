/**
 * フィードの既読状況から「整理の判断材料」となるシグナルを算出する。
 * 保持期間内の記事に対する既読率で判定する（記事は保持期間で消えるため、
 * 直近の読む/読まないの傾向を表す）。閾値は実データを見て調整可能。
 *
 * 方針:
 * - 'often'（よく読む）は読めばすぐ出す（少数記事のフィードでも既読数で判定）。
 * - 'never'（全く読んでいない）はサンプル数と「全体の既読量」が溜まってからのみ出す
 *   （初回や少読では大半が未読になり無意味なため。全体ゲートは呼び出し側で適用）。
 */
export type FeedReadSignal = 'often' | 'never' | null;

const OFTEN_RATIO = 0.5; // これ以上の既読率かつ既読数が MIN_OFTEN_READ 以上なら「よく読む」
const MIN_OFTEN_READ = 2; // 「よく読む」に必要な最低既読数（1件だけの偶然を除く）
const MIN_SAMPLE = 5; // 「全く読んでいない」判定に必要な最低記事数（少数で決めつけない）

// 「全く読んでいない」は全体の既読数がこれ未満のうちは出さない（呼び出し側で適用）。
// デフォルトが数十フィードあり、少し読んだだけでは大半が未読になるため。要調整。
export const MIN_TOTAL_READ_FOR_SIGNALS = 100;

export function feedReadSignal(total: number, read: number): FeedReadSignal {
  if (total <= 0) return null;
  const ratio = read / total;
  if (read >= MIN_OFTEN_READ && ratio >= OFTEN_RATIO) return 'often';
  if (read === 0 && total >= MIN_SAMPLE) return 'never';
  return null;
}
