import { FeedRepository } from '@/repositories/FeedRepository';
import { Feed } from '@/types/Feed';
import { RssService } from '@/services/RssService';
import { FeedSortType } from '@/components/FeedSortModal';

/**
 * 同じURLのフィードが既に登録されている場合に投げられる
 */
export class DuplicateFeedUrlError extends Error {
  constructor(public readonly existingTitle?: string) {
    super('Feed with the same URL already exists');
    this.name = 'DuplicateFeedUrlError';
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toUpperCase().includes('UNIQUE CONSTRAINT FAILED');
}

/**
 * FeedService
 * フィード管理のビジネスロジック
 */
export const FeedService = {
  /**
   * 全フィードを取得
   */
  async list(): Promise<Feed[]> {
    return await FeedRepository.list();
  },

  /**
   * ソート順を指定してフィードを取得
   */
  async listWithSort(sortType: FeedSortType): Promise<Feed[]> {
    return await FeedRepository.listWithSort(sortType);
  },

  /**
   * IDでフィードを取得
   */
  async get(id: string): Promise<Feed | null> {
    return await FeedRepository.get(id);
  },

  /**
   * URLでフィードを取得（未登録なら null）
   */
  async findByUrl(url: string): Promise<Feed | null> {
    return await FeedRepository.findByUrl(url);
  },

  /**
   * フィードを作成
   * @throws {DuplicateFeedUrlError} 同じURLのフィードが既に存在する場合
   */
  async create(input: {
    url: string;
    title?: string;
    iconUrl?: string;
  }): Promise<string> {
    const existing = await FeedRepository.findByUrl(input.url);
    if (existing) {
      throw new DuplicateFeedUrlError(existing.title);
    }

    // IDを生成（UUID的なもの）
    const id = `feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 現在のフィード数を取得（order_noを決定）
    const count = await FeedRepository.count();
    const orderNo = count + 1;

    // タイトルが指定されていない場合はURLをタイトルにする（仮）
    const title = input.title || input.url;

    const feed: Omit<Feed, 'createdAt'> = {
      id,
      title,
      url: input.url,
      iconUrl: input.iconUrl,
      orderNo,
    };

    try {
      await FeedRepository.create(feed);
    } catch (error) {
      // 事前チェックと INSERT の間に別経路で登録された場合の保険
      if (isUniqueConstraintError(error)) {
        throw new DuplicateFeedUrlError();
      }
      throw error;
    }

    return id;
  },

  /**
   * フィードを更新
   * @throws {DuplicateFeedUrlError} 他のフィードが同じURLを使用している場合
   */
  async update(feed: Feed): Promise<void> {
    const existing = await FeedRepository.findByUrl(feed.url);
    if (existing && existing.id !== feed.id) {
      throw new DuplicateFeedUrlError(existing.title);
    }

    try {
      await FeedRepository.update(feed);
    } catch (error) {
      // 事前チェックと UPDATE の間に別経路で登録された場合の保険
      if (isUniqueConstraintError(error)) {
        throw new DuplicateFeedUrlError();
      }
      throw error;
    }
  },

  /**
   * フィードを削除
   */
  async delete(id: string): Promise<void> {
    await FeedRepository.delete(id);
  },

  /**
   * 並び順を更新
   */
  async reorder(feeds: Feed[]): Promise<void> {
    await FeedRepository.bulkUpdateOrder(feeds);
  },

  /**
   * フィード数を取得
   */
  async count(): Promise<number> {
    return await FeedRepository.count();
  },

  /**
   * RSS URLを自動検出
   * @param baseUrl ベースURL（例: https://example.com）
   * @returns 検出されたRSS URL、見つからない場合はnull
   */
  async detectRssUrl(baseUrl: string): Promise<string | null> {
    // 一般的なRSSパス（優先度順）
    const commonPaths = [
      '/feed',
      '/feed.xml',
      '/rss',
      '/rss.xml',
      '/atom.xml',
      '/index.xml',
      '/feeds',
      '/feeds/posts/default',
    ];

    for (const path of commonPaths) {
      try {
        const testUrl = new URL(path, baseUrl).href;
        // RSSメタデータが取得できるか確認
        await RssService.fetchMeta(testUrl);
        return testUrl;
      } catch (_) {
        // 失敗したら次を試す
        continue;
      }
    }

    return null;
  },
};

