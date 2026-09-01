/**
 * 記事の保持期間（自動削除）に関する定数と正規化。
 *
 * 画面（data_management）とバックグラウンド同期（SyncService）の両方が
 * 同じ AsyncStorage の値を読むため、既定値と旧値の扱いをここに一本化する。
 * どちらか片方だけで正規化すると「画面では90日と表示されるのに、同期は
 * 7日で消す」というズレが生まれる。
 */

/** 保持期間の既定値（日）。未設定の端末はこの値で動く */
export const DEFAULT_ARTICLE_RETENTION_DAYS = 90;

/** ドロップダウンの選択肢（日）。0 は無制限（削除しない） */
export const ARTICLE_RETENTION_OPTIONS = [90, 180, 0];

/**
 * 保存済みの保持期間を、現在の選択肢に沿った値へ正規化する。
 *
 * v1.6.0 で 7日・30日 を選択肢から外した。articles は `UNIQUE(feed_id, link)` の
 * INSERT OR IGNORE で入るため、保持期間で消した記事もフィードのRSSに残っていれば
 * 次の同期で**未読として再挿入される**。しかも削除判定は published_at ではなく
 * fetched_at なので、更新の遅いフィード（RSSに古い記事がぶら下がったまま）ほど
 * 「まとめて消えて、まとめて未読で戻る」が周期的に起きる。短い保持期間ほど
 * これを踏みやすいため、既存端末に残っている 7 / 30 も 90 へ引き上げる。
 *
 * 引き上げる方向なので記事が余分に消えることはない。
 *
 * @param stored AsyncStorage から読んだ生の文字列（未設定なら null）
 * @returns 保持日数。0 は無制限
 */
export function normalizeArticleRetentionDays(stored: string | null): number {
  if (stored === null) return DEFAULT_ARTICLE_RETENTION_DAYS;

  const parsed = parseInt(stored, 10);
  if (Number.isNaN(parsed)) return DEFAULT_ARTICLE_RETENTION_DAYS;

  // 0 は「無制限」という明示的な選択なので、そのまま尊重する
  if (parsed === 0) return 0;

  // 廃止した短い保持期間（7 / 30）を含め、既定より短い設定はすべて引き上げる。
  // 値を個別に列挙しないので、将来さらに短い選択肢を廃止しても手当てが要らない
  if (parsed < DEFAULT_ARTICLE_RETENTION_DAYS) return DEFAULT_ARTICLE_RETENTION_DAYS;

  return parsed;
}
