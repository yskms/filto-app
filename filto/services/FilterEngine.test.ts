import { describe, expect, it } from 'vitest';

import type { Article } from '@/types/Article';
import type { Filter } from './FilterService';
import { FilterEngine } from './FilterEngine';

const article = (overrides: Partial<Article> = {}): Article => ({
  id: 'article-1',
  feedId: 'feed-1',
  feedName: 'Example Feed',
  title: 'Formula 1 transfer news',
  summary: 'Latest sports and technology stories',
  link: 'https://example.com/article-1',
  publishedAt: '2026-09-13T00:00:00.000Z',
  isRead: false,
  isStarred: false,
  ...overrides,
});

const filter = (overrides: Partial<Filter> = {}): Filter => ({
  block_keyword: 'sports',
  allow_keyword: null,
  target_title: 1,
  target_description: 1,
  created_at: 0,
  updated_at: 0,
  ...overrides,
});

describe('FilterEngine.evaluate', () => {
  it('blocks an article when a keyword matches case-insensitively', () => {
    expect(FilterEngine.evaluate(article(), [filter({ block_keyword: 'SPORTS' })])).toBe(true);
  });

  it('keeps an article when no block keyword matches', () => {
    expect(FilterEngine.evaluate(article(), [filter({ block_keyword: 'politics' })])).toBe(false);
  });

  it('keeps an article when a comma-separated allow keyword matches', () => {
    const filters = [filter({ allow_keyword: 'football, TECHNOLOGY' })];

    expect(FilterEngine.evaluate(article(), filters)).toBe(false);
  });

  it('gives a global allow keyword priority over every block filter', () => {
    const filters = [filter({ block_keyword: 'sports' }), filter({ block_keyword: 'transfer' })];

    expect(FilterEngine.evaluate(article(), filters, ['FORMULA 1'])).toBe(false);
  });

  it('ignores empty global allow keywords instead of allowing every article', () => {
    expect(FilterEngine.evaluate(article(), [filter()], ['', '   '])).toBe(true);
  });

  it('ignores empty block keywords instead of blocking every article', () => {
    expect(FilterEngine.evaluate(article(), [filter({ block_keyword: '   ' })])).toBe(false);
  });

  it('respects title-only targeting', () => {
    const titleOnly = filter({ block_keyword: 'technology', target_description: 0 });

    expect(FilterEngine.evaluate(article(), [titleOnly])).toBe(false);
  });

  it('respects description-only targeting', () => {
    const descriptionOnly = filter({ block_keyword: 'technology', target_title: 0 });

    expect(FilterEngine.evaluate(article(), [descriptionOnly])).toBe(true);
  });
});
