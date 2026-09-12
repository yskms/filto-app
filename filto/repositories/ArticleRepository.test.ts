import { beforeEach, describe, expect, it, vi } from 'vitest';

const { openDatabaseMock } = vi.hoisted(() => ({
  openDatabaseMock: vi.fn(),
}));

vi.mock('@/database/init', () => ({
  openDatabase: openDatabaseMock,
}));

import { ArticleRepository } from './ArticleRepository';

const row = {
  id: 42,
  feed_id: 'feed-1',
  feed_name: 'Example Feed',
  title: 'Example article',
  link: 'https://example.com/article',
  description: 'Summary',
  thumbnail_url: null,
  published_at: 1_700_000_000,
  fetched_at: 1_700_000_100,
  display_order: 10,
  is_read: 1,
  is_starred: 0,
};

describe('ArticleRepository article reads', () => {
  const getAllAsync = vi.fn();

  beforeEach(() => {
    getAllAsync.mockReset();
    getAllAsync.mockResolvedValue([row]);
    openDatabaseMock.mockReturnValue({ getAllAsync });
  });

  it('loads the home article list through the asynchronous SQLite API', async () => {
    const articles = await ArticleRepository.listAll();

    expect(getAllAsync).toHaveBeenCalledOnce();
    expect(getAllAsync.mock.calls[0][0]).toContain('ORDER BY display_order DESC, id DESC');
    expect(articles).toEqual([
      expect.objectContaining({
        id: '42',
        feedId: 'feed-1',
        summary: 'Summary',
        displayOrder: 10,
        isRead: true,
        isStarred: false,
      }),
    ]);
  });

  it('keeps the feed constraint when loading one feed asynchronously', async () => {
    await ArticleRepository.listByFeed('feed-1');

    expect(getAllAsync).toHaveBeenCalledWith(expect.stringContaining('WHERE feed_id = ?'), ['feed-1']);
  });

  it('loads one extra row to produce a stable keyset cursor', async () => {
    getAllAsync.mockResolvedValue([
      row,
      { ...row, id: 41, display_order: 9 },
      { ...row, id: 40, display_order: 8 },
    ]);

    const page = await ArticleRepository.listPage(2);

    expect(getAllAsync).toHaveBeenCalledWith(expect.stringContaining('LIMIT ?'), [3]);
    expect(page.articles.map((item) => item.id)).toEqual(['42', '41']);
    expect(page.nextCursor).toEqual({ displayOrder: 9, id: 41 });
  });

  it('uses display order and id as the next-page boundary', async () => {
    getAllAsync.mockResolvedValue([{ ...row, id: 40, display_order: 8 }]);

    const page = await ArticleRepository.listPage(20, { displayOrder: 9, id: 41 });

    expect(getAllAsync.mock.calls[0][0]).toContain(
      'display_order < ? OR (display_order = ? AND id < ?)'
    );
    expect(getAllAsync.mock.calls[0][1]).toEqual([9, 9, 41, 21]);
    expect(page.nextCursor).toBeNull();
  });

  it('normalizes a non-finite page size before binding it to SQLite', async () => {
    await ArticleRepository.listPage(Number.NaN);

    expect(getAllAsync.mock.calls[0][1]).toEqual([2]);
  });
});
