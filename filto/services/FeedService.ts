import { FeedRepository } from '@/repositories/FeedRepository';
import { Feed } from '@/types/Feed';
import { RssService } from '@/services/RssService';

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

    console.log(`[FeedService] Starting RSS auto-detection for: ${baseUrl}`);

    for (const path of commonPaths) {
      try {
        const testUrl = new URL(path, baseUrl).href;
        console.log(`[FeedService] Trying: ${testUrl}`);
        
        // RSSメタデータが取得できるか確認
        await RssService.fetchMeta(testUrl);
        
        console.log(`[FeedService] ✅ Found RSS at: ${testUrl}`);
        return testUrl;
      } catch (error) {
        // 失敗したら次を試す
        console.log(`[FeedService] ❌ Failed: ${path}`);
        continue;
      }
    }

    console.log(`[FeedService] RSS auto-detection failed for: ${baseUrl}`);
    return null;
  },
};

