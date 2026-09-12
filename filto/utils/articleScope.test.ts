import { describe, expect, it } from 'vitest';

import type { Article } from '@/types/Article';
import type { Filter } from '@/services/FilterService';
import { evaluateArticleScope } from './articleScope';

const articles: Article[] = [
  { id: '1', feedId: 'a', feedName: 'A', title: 'sports', link: '1', publishedAt: '', isRead: false, isStarred: true },
  { id: '2', feedId: 'b', feedName: 'B', title: 'news', link: '2', publishedAt: '', isRead: false, isStarred: false },
];
const filters: Filter[] = [
  { block_keyword: 'sports', allow_keyword: null, target_title: 1, target_description: 0, created_at: 0, updated_at: 0 },
];

describe('evaluateArticleScope', () => {
  it('uses the same feed, favorite, block, and hidden scope in one pass', () => {
    const result = evaluateArticleScope(articles, {
      hiddenFeedIds: new Set(),
      selectedFeedIds: ['a'],
      showStarredOnly: true,
      filters,
      globalAllowKeywords: [],
      hiddenArticleIds: new Set(['1']),
    });

    expect(result.articles.map((article) => article.id)).toEqual(['1']);
    expect([...result.blockedIds]).toEqual(['1']);
    expect(result.hiddenCount).toBe(1);
  });

  it('removes feeds hidden from Home before counting', () => {
    const result = evaluateArticleScope(articles, {
      hiddenFeedIds: new Set(['a']),
      selectedFeedIds: null,
      showStarredOnly: false,
      filters,
      globalAllowKeywords: [],
      hiddenArticleIds: new Set(['1', '2']),
    });

    expect(result.articles.map((article) => article.id)).toEqual(['2']);
    expect(result.blockedIds.size).toBe(0);
    expect(result.hiddenCount).toBe(1);
  });
});
