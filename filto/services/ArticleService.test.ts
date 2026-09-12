import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listPageMock } = vi.hoisted(() => ({ listPageMock: vi.fn() }));

vi.mock('@/repositories/ArticleRepository', () => ({
  ArticleRepository: { listPage: listPageMock },
}));

import { ArticleService } from './ArticleService';
import type { Article } from '@/types/Article';

function article(id: number, title: string, summary?: string): Article {
  return {
    id: String(id),
    feedId: 'feed-1',
    feedName: 'Feed',
    title,
    link: `https://example.com/${id}`,
    publishedAt: '2026-09-13T00:00:00.000Z',
    displayOrder: id,
    summary,
    isRead: false,
    isStarred: false,
  };
}

describe('ArticleService search pagination', () => {
  beforeEach(() => listPageMock.mockReset());

  it('scans source pages but returns only JavaScript-matched articles', async () => {
    listPageMock
      .mockResolvedValueOnce({
        articles: [article(5, 'other'), article(4, 'MATCH one')],
        nextCursor: { displayOrder: 4, id: 4 },
      })
      .mockResolvedValueOnce({
        articles: [article(3, 'other', 'summary match'), article(2, 'other')],
        nextCursor: null,
      });

    const page = await ArticleService.getSearchArticlePage(2, ' match ');

    expect(page.articles.map((item) => item.id)).toEqual(['4', '3']);
    expect(page.nextCursor).toBeNull();
    expect(listPageMock).toHaveBeenCalledTimes(2);
  });

  it('uses the last visible match as cursor after finding one extra result', async () => {
    listPageMock.mockResolvedValue({
      articles: [article(5, 'match 5'), article(4, 'match 4'), article(3, 'match 3')],
      nextCursor: { displayOrder: 3, id: 3 },
    });

    const page = await ArticleService.getSearchArticlePage(2, 'MATCH');

    expect(page.articles.map((item) => item.id)).toEqual(['5', '4']);
    expect(page.nextCursor).toEqual({ displayOrder: 4, id: 4 });
  });

  it('stops scanning before the next source page when the request is stale', async () => {
    listPageMock.mockResolvedValue({
      articles: [article(5, 'other')],
      nextCursor: { displayOrder: 5, id: 5 },
    });
    const shouldCancel = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    const page = await ArticleService.getSearchArticlePage(
      20,
      'match',
      undefined,
      undefined,
      shouldCancel
    );

    expect(page).toEqual({ articles: [], nextCursor: null });
    expect(listPageMock).toHaveBeenCalledOnce();
  });
});
