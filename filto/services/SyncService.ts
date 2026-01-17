import { FeedService } from '@/services/FeedService';
import { RssService } from '@/services/RssService';
import { ArticleService } from '@/services/ArticleService';

/**
 * SyncService
 * RSSフィードの同期処理を担当
 */
export const SyncService = {
  /** 同期実行中フラグ（多重実行防止） */
  isRefreshing: false,

  /**
   * 全フィードを同期
   * @returns 取得成功フィード数と新規記事数
   */
  async refresh(): Promise<{ fetched: number; newArticles: number }> {
    // 多重実行防止
    if (this.isRefreshing) {
      console.log('[SyncService] Already refreshing, skipping...');
      return { fetched: 0, newArticles: 0 };
    }

    this.isRefreshing = true;
    let fetched = 0;
    let newArticles = 0;

    try {
      // 全フィード取得
      const feeds = await FeedService.list();

      console.log(`[SyncService] Start syncing ${feeds.length} feeds...`);

      // 各フィードを順次処理
      for (const feed of feeds) {
        try {
          // 保存前の記事数を取得
          const beforeCount = (await ArticleService.getArticles(feed.id)).length;

          // RSS取得
          const articles = await RssService.fetchArticles(feed.url);
          console.log(`[SyncService] Fetched ${articles.length} articles from ${feed.title}`);

          // 保存（重複チェックは ArticleService 内で実施）
          await ArticleService.saveArticles(feed.id, feed.title, articles);

          // 保存後の記事数を取得
          const afterCount = (await ArticleService.getArticles(feed.id)).length;

          // 新規記事数を計算
          const newCount = afterCount - beforeCount;
          newArticles += newCount;

          console.log(`[SyncService] Saved ${newCount} new articles for ${feed.title}`);

          fetched++;
        } catch (error) {
          // フィード単位のエラーは握りつぶして継続
          console.error(`[SyncService] Failed to fetch feed ${feed.id} (${feed.title}):`, error);
        }
      }

      console.log(`[SyncService] Sync completed: ${fetched}/${feeds.length} feeds, ${newArticles} new articles`);

      return { fetched, newArticles };
    } finally {
      this.isRefreshing = false;
    }
  },
};
