import { FeedRepository } from '@/repositories/FeedRepository';
import { Feed } from '@/types/Feed';

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
   * IDでフィードを取得
   */
  async get(id: string): Promise<Feed | null> {
    return await FeedRepository.get(id);
  },

  /**
   * フィードを作成
   */
  async create(input: {
    url: string;
    title?: string;
    iconUrl?: string;
  }): Promise<string> {
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

    await FeedRepository.create(feed);

    return id;
  },

  /**
   * フィードを更新
   */
  async update(feed: Feed): Promise<void> {
    await FeedRepository.update(feed);
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
};

