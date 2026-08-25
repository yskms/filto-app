/**
 * 記事一覧の多様性を上げる並び替え。
 *
 * 記事は呼び出し時点で新着順（fetched_at DESC）に並んでいるが、同じ配信元が
 * 新着を連発すると一覧の上位をその媒体だけで占有してしまう。この関数は
 * 「直近window件と同じ媒体を避ける」ことを制約に、新着順をできるだけ保ったまま
 * 並べ替える貪欲法。
 *
 * アルゴリズム:
 *   直近window件（デフォルト2件）のいずれとも別の媒体のうち、元の並びで
 *   最も先頭に近いものを選ぶ。候補が尽きたら、避ける件数を1件ずつ減らして
 *   条件を緩め、それでも無ければ先頭をそのまま置く。
 *
 * 「直前の1件だけを避ける」という単純な制約だと、2媒体だけが交互に並ぶ
 * A→B→A→B→...のようなパターンを完全に満たしてしまい、3媒体目以降が
 * 離れた位置にあっても延々と2媒体だけが続いてしまう問題があった（実機で発覚）。
 * window件を避けるようにすることで、直近に使っていない別媒体があれば
 * そちらを優先的に拾い上げる。
 *
 * 性質:
 *   - 入力と同じ要素を過不足なく含む（並びだけが変わる）。
 *   - 新着記事が多くの媒体にまたがっていれば自然と分散し、window+1未満の
 *     媒体しか候補が無ければ制約を段階的に緩めて対応する（新着が少ない時に
 *     多少偏るのは許容する、という設計意図に合う）。
 *   - feedId が 1 種類しかない場合や 1 件以下の場合は入力の並びをそのまま返す。
 *
 * 計算量は最悪 O(n^2 * window)。記事数は多くても数百件・windowは小さい定数のため
 * 実用上問題ない。
 */
export function diversifyByFeed<T extends { feedId: string }>(articles: T[], window = 2): T[] {
  if (articles.length <= 1) return articles.slice();

  const remaining = articles.slice(); // 元の新着順を保持したまま消費する
  const result: T[] = [];
  const recentFeedIds: string[] = []; // 直近に置いたfeedId（古い→新しいの順）

  while (remaining.length > 0) {
    let pickIndex = -1;

    // 直近window件を避ける候補を探す。見つからなければ避ける件数を1件ずつ減らす
    for (let avoidCount = Math.min(window, recentFeedIds.length); avoidCount >= 0; avoidCount--) {
      const avoidSet = new Set(recentFeedIds.slice(recentFeedIds.length - avoidCount));
      pickIndex = remaining.findIndex((a) => !avoidSet.has(a.feedId));
      if (pickIndex !== -1) break;
    }
    // 全件が直前と同じ媒体（=avoidCount=0でも見つからない）なら先頭をそのまま採用する
    if (pickIndex === -1) pickIndex = 0;

    const [picked] = remaining.splice(pickIndex, 1);
    result.push(picked);

    recentFeedIds.push(picked.feedId);
    if (recentFeedIds.length > window) recentFeedIds.shift();
  }

  return result;
}
