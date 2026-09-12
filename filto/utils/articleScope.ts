import type { Article } from '@/types/Article';
import type { Filter } from '@/services/FilterService';
import { FilterEngine } from '@/services/FilterEngine';

interface ArticleScopeOptions {
  hiddenFeedIds: ReadonlySet<string>;
  selectedFeedIds: readonly string[] | null;
  showStarredOnly: boolean;
  filters: Filter[];
  globalAllowKeywords: string[];
  hiddenArticleIds: ReadonlySet<string>;
}

export interface ArticleScopeResult {
  articles: Article[];
  blockedIds: Set<string>;
  hiddenCount: number;
}

/** ホーム一覧と全件カウントで共通利用する、表示スコープと除外判定の純粋ロジック。 */
export function evaluateArticleScope(
  source: Article[],
  options: ArticleScopeOptions
): ArticleScopeResult {
  const selectedIds = options.selectedFeedIds === null
    ? null
    : new Set(options.selectedFeedIds);
  const articles = source.filter((article) =>
    !options.hiddenFeedIds.has(article.feedId) &&
    (selectedIds === null || selectedIds.has(article.feedId)) &&
    (!options.showStarredOnly || article.isStarred)
  );

  const blockedIds = new Set<string>();
  let hiddenCount = 0;
  for (const article of articles) {
    if (FilterEngine.evaluate(article, options.filters, options.globalAllowKeywords)) {
      blockedIds.add(article.id);
    }
    if (options.hiddenArticleIds.has(article.id)) {
      hiddenCount++;
    }
  }

  return { articles, blockedIds, hiddenCount };
}
