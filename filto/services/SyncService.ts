import { FeedService } from '@/services/FeedService';
import { RssService } from '@/services/RssService';
import { ArticleService } from '@/services/ArticleService';
import { ArticleRepository } from '@/repositories/ArticleRepository';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

// ストレージキー
const STORAGE_KEY_LAST_SYNC_TIME = '@filto/lastSyncTime';
const STORAGE_KEY_ARTICLE_RETENTION_DAYS = '@filto/data_management/articleRetentionDays';
const STORAGE_KEY_DELETE_STARRED_IN_AUTO = '@filto/data_management/deleteStarredInAutoDelete';

/**
 * SyncService
 * RSSフィードの同期処理を担当
 */
export const SyncService = {
  /** 同期実行中フラグ（多重実行防止） */
  isRefreshing: false,

  /** 同期の世代カウンタ。データリセット等で増やすと実行中の refresh が中断される */
  generation: 0,

  /**
   * 実行中の同期をキャンセルする（データリセット時などに呼ぶ）。
   * 世代を進めることで、ループ中の refresh が次の保存前に中断する。
   */
  cancelOngoing(): void {
    this.generation++;
    this.isRefreshing = false;
  },

  /**
   * 全フィードを同期
   * @returns 取得成功フィード数と新規記事数、オフライン時は offline: true
   */
  async refresh(): Promise<{ fetched: number; newArticles: number; deleted?: number; offline?: boolean }> {
    // ネットワーク接続チェック
    // isConnected / isInternetReachable は boolean | null のため、
    // null（判定不能）はオンラインとして扱い、明示的に false のときのみオフライン扱いにする
    const networkState = await Network.getNetworkStateAsync();
    if (networkState.isConnected === false || networkState.isInternetReachable === false) {
      return { fetched: 0, newArticles: 0, offline: true };
    }

    // 多重実行防止
    if (this.isRefreshing) {
      return { fetched: 0, newArticles: 0 };
    }

    this.isRefreshing = true;
    const gen = this.generation; // この同期の世代を記録（リセットで変わったら中断）
    let fetched = 0;
    let newArticles = 0;

    try {
      // 全フィード取得
      const feeds = await FeedService.list();

      // 各フィードを順次処理
      for (const feed of feeds) {
        // リセット等でキャンセルされたら、それ以上の保存はしない（孤立記事を防ぐ）
        if (this.generation !== gen) break;
        try {
          // 保存前の記事数を取得
          const beforeCount = (await ArticleService.getArticles(feed.id)).length;

          // RSS取得（フィードアイコンをサムネイルのフォールバックとして渡す）
          const articles = await RssService.fetchArticles(feed.url, feed.iconUrl);

          // 取得中にキャンセルされていたら保存しない
          if (this.generation !== gen) break;

          // 保存（重複チェックは ArticleService 内で実施）
          await ArticleService.saveArticles(feed.id, feed.title, articles);

          // 保存後の記事数を取得
          const afterCount = (await ArticleService.getArticles(feed.id)).length;

          newArticles += afterCount - beforeCount;
          fetched++;
        } catch (_) {
          // フィード単位のエラーは握りつぶして継続
        }
      }

      if (this.generation === gen) {
        // 最終同期時刻を保存
        await AsyncStorage.setItem(STORAGE_KEY_LAST_SYNC_TIME, Date.now().toString());
        // 古い記事を自動削除
        const deletedCount = await this.deleteOldArticlesAuto();
        return { fetched, newArticles, deleted: deletedCount };
      }
      return { fetched, newArticles };
    } finally {
      // 自分が現在の世代のときだけフラグを下ろす（キャンセル後に始まった新しい同期を壊さない）
      if (this.generation === gen) this.isRefreshing = false;
    }
  },

  /**
   * 古い記事を自動削除（設定に基づく）
   * @returns 削除された記事数
   */
  async deleteOldArticlesAuto(): Promise<number> {
    try {
      // 設定から保持期間を取得
      const retentionDaysStr = await AsyncStorage.getItem(STORAGE_KEY_ARTICLE_RETENTION_DAYS);
      const parsed = retentionDaysStr ? parseInt(retentionDaysStr, 10) : NaN;
      const retentionDays = Number.isNaN(parsed) ? 30 : parsed; // デフォルト: 30日

      // お気に入りも削除するかの設定を取得
      const deleteStarredStr = await AsyncStorage.getItem(STORAGE_KEY_DELETE_STARRED_IN_AUTO);
      const deleteStarred = deleteStarredStr === 'true'; // デフォルト: false

      return await ArticleRepository.deleteOldArticles(retentionDays, deleteStarred);
    } catch (_) {
      return 0;
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
        return true;
      }

      // 不正な値は再同期扱い
      const parsedTime = parseInt(lastSyncTime, 10);
      if (Number.isNaN(parsedTime)) {
        return true;
      }

      return Date.now() - parsedTime >= minIntervalMs;
    } catch (_) {
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
      if (!lastSyncTime) return null;
      const parsed = parseInt(lastSyncTime, 10);
      return Number.isNaN(parsed) ? null : parsed;
    } catch (_) {
      return null;
    }
  },
};
