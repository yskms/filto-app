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

// 記事数の多い RSS が多いので、基本は「既読数」で判定する（数件読めば「よく読む」）。
// ただし記事が少ないフィードは数が伸びないので、高い既読率でも拾う。
const OFTEN_COUNT = 3; // 既読数がこれ以上なら「よく読む」（記事数の多いフィード向け）
const OFTEN_RATIO = 0.5; // 記事が少ないフィードは既読率で拾う（例: 2件中2件）
const MIN_SAMPLE = 5; // 「全く読んでいない」判定に必要な最低記事数（少数で決めつけない）

// 「全く読んでいない」は全体の既読数がこれ未満のうちは出さない（呼び出し側で適用）。
// デフォルトが数十フィードあり、少し読んだだけでは大半が未読になるため。要調整。
export const MIN_TOTAL_READ_FOR_SIGNALS = 100;

export function feedReadSignal(total: number, read: number): FeedReadSignal {
  if (total <= 0) return null;
  const ratio = read / total;
  if (read >= OFTEN_COUNT || (read >= 2 && ratio >= OFTEN_RATIO)) return 'often';
  if (read === 0 && total >= MIN_SAMPLE) return 'never';
  return null;
}
