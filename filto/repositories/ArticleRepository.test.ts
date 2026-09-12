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
});
