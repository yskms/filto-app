import { FeedService } from '@/services/FeedService';
import { RssService } from '@/services/RssService';
import { ArticleService } from '@/services/ArticleService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ストレージキー
const STORAGE_KEY_LAST_SYNC_TIME = '@filto/lastSyncTime';

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

          // RSS取得（フィードアイコンをサムネイルのフォールバックとして渡す）
          console.log(`[SyncService] Fetching articles from ${feed.title}`);
          console.log(`[SyncService] Feed URL: ${feed.url}`);
          console.log(`[SyncService] Feed icon URL: ${feed.iconUrl || 'none'}`);
          
          const articles = await RssService.fetchArticles(feed.url, feed.iconUrl);
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

      // 最終同期時刻を保存
      await AsyncStorage.setItem(STORAGE_KEY_LAST_SYNC_TIME, Date.now().toString());

      return { fetched, newArticles };
    } finally {
      this.isRefreshing = false;
    }
  },

  /**
   * 同期が必要かどうかをチェック
   * @param minIntervalMs 最小同期間隔（ミリ秒）デフォルト: 30分
   * @returns true = 同期が必要, false = 最近同期済み
   */
  async shouldSync(minIntervalMs: number = 30 * 60 * 1000): Promise<boolean> {
    try {
      const lastSyncTime = await AsyncStorage.getItem(STORAGE_KEY_LAST_SYNC_TIME);
      
      // 初回（同期履歴なし）
      if (!lastSyncTime) {
        console.log('[SyncService] No sync history, should sync');
        return true;
      }

      // 経過時間をチェック
      const elapsed = Date.now() - parseInt(lastSyncTime, 10);
      const shouldSync = elapsed >= minIntervalMs;

      if (shouldSync) {
        console.log(`[SyncService] ${Math.floor(elapsed / 60000)} minutes since last sync, should sync`);
      } else {
        console.log(`[SyncService] Only ${Math.floor(elapsed / 60000)} minutes since last sync, skipping`);
      }

      return shouldSync;
    } catch (error) {
      console.error('[SyncService] Failed to check shouldSync:', error);
      return true; // エラー時は同期する
    }
  },

  /**
   * 最終同期時刻を取得
   * @returns 最終同期時刻（UnixTime）またはnull
   */
  async getLastSyncTime(): Promise<number | null> {
    try {
      const lastSyncTime = await AsyncStorage.getItem(STORAGE_KEY_LAST_SYNC_TIME);
      return lastSyncTime ? parseInt(lastSyncTime, 10) : null;
    } catch (error) {
      console.error('[SyncService] Failed to get last sync time:', error);
      return null;
    }
  },
};
