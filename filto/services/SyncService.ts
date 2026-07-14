import { FeedService } from '@/services/FeedService';
import { RssService } from '@/services/RssService';
import { ArticleService } from '@/services/ArticleService';
import { ArticleRepository } from '@/repositories/ArticleRepository';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '@/constants/storageKeys';
import * as Network from 'expo-network';

/**
 * WiFi以外の接続（モバイル回線など）かどうか。
 * type が判定不能（UNKNOWN/undefined）のときは制限しない方向に倒すため false を返す。
 */
function isNonWifiConnection(networkState: Network.NetworkState): boolean {
  return (
    networkState.type !== undefined &&
    networkState.type !== Network.NetworkStateType.WIFI &&
    networkState.type !== Network.NetworkStateType.UNKNOWN
  );
}

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
   * 「WiFi接続時のみ取得」設定が有効かどうかを取得
   */
  async isWifiOnlyFetchEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(StorageKeys.wifiOnlyFetch);
      return value === 'true'; // デフォルト: false（無効）
    } catch (_) {
      return false;
    }
  },

  /**
   * 現在オフラインかどうか。判定不能（null）はオンライン扱い（refresh と同基準）。
   */
  async isOffline(): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return networkState.isConnected === false || networkState.isInternetReachable === false;
    } catch (_) {
      return false;
    }
  },

  /**
   * 手動更新の前に「モバイル回線で取得しますか？」の確認を出すべきか。
   * 「WiFi接続時のみ取得」がオンで、かつ現在WiFi以外で接続しているときだけ true。
   * オフライン時は refresh 側でオフラインエラーを出すため false を返す。
   */
  async shouldConfirmMobileFetch(): Promise<boolean> {
    if (!(await this.isWifiOnlyFetchEnabled())) return false;
    const networkState = await Network.getNetworkStateAsync();
    if (networkState.isConnected === false || networkState.isInternetReachable === false) {
      return false;
    }
    return isNonWifiConnection(networkState);
  },

  /**
   * 全フィードを同期
   * @param options.ignoreWifiOnly 「WiFi接続時のみ取得」設定を無視する（手動更新など明示操作で使う）
   * @returns 取得成功フィード数と新規記事数。オフライン時は offline: true、
   *          WiFi限定設定でモバイル回線のためスキップした場合は skippedNotWifi: true
   */
  async refresh(options?: { ignoreWifiOnly?: boolean }): Promise<{
    fetched: number;
    newArticles: number;
    deleted?: number;
    offline?: boolean;
    skippedNotWifi?: boolean;
  }> {
    // ネットワーク接続チェック
    // isConnected / isInternetReachable は boolean | null のため、
    // null（判定不能）はオンラインとして扱い、明示的に false のときのみオフライン扱いにする
    const networkState = await Network.getNetworkStateAsync();
    if (networkState.isConnected === false || networkState.isInternetReachable === false) {
      return { fetched: 0, newArticles: 0, offline: true };
    }

    // 「WiFi接続時のみ取得」設定のチェック（自動同期で使用、手動更新は ignoreWifiOnly で無視）
    if (!options?.ignoreWifiOnly && (await this.isWifiOnlyFetchEnabled())) {
      // WiFi以外（モバイル回線など）の場合は取得をスキップ
      if (isNonWifiConnection(networkState)) {
        return { fetched: 0, newArticles: 0, skippedNotWifi: true };
      }
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
        await AsyncStorage.setItem(StorageKeys.lastSyncTime, Date.now().toString());
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
      const retentionDaysStr = await AsyncStorage.getItem(StorageKeys.articleRetentionDays);
      const parsed = retentionDaysStr ? parseInt(retentionDaysStr, 10) : NaN;
      const retentionDays = Number.isNaN(parsed) ? 30 : parsed; // デフォルト: 30日

      // お気に入りも削除するかの設定を取得
      const deleteStarredStr = await AsyncStorage.getItem(StorageKeys.deleteStarredInAutoDelete);
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
      const lastSyncTime = await AsyncStorage.getItem(StorageKeys.lastSyncTime);

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
   * 「連打防止の最低更新間隔」設定（分）を取得
   * @returns 最低更新間隔（分）。0 は制限なし。デフォルト: 0
   */
  async getMinRefreshIntervalMinutes(): Promise<number> {
    try {
      const value = await AsyncStorage.getItem(StorageKeys.minRefreshIntervalMinutes);
      const parsed = value ? parseInt(value, 10) : NaN;
      return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
    } catch (_) {
      return 0;
    }
  },

  /**
   * 手動更新が最低更新間隔の制限にかかっているかを判定する。
   * @returns 制限中なら次に更新できるまでの残り秒数、許可なら null
   */
  async getManualRefreshCooldown(): Promise<number | null> {
    const minutes = await this.getMinRefreshIntervalMinutes();
    if (minutes <= 0) return null; // 制限なし
    const lastSync = await this.getLastSyncTime();
    if (lastSync === null) return null; // 同期履歴なし
    const intervalMs = minutes * 60 * 1000;
    const elapsed = Date.now() - lastSync;
    if (elapsed >= intervalMs) return null; // 制限を過ぎている
    return Math.ceil((intervalMs - elapsed) / 1000); // 残り秒数
  },

  /**
   * 最終同期時刻を取得
   * @returns 最終同期時刻（UnixTime）またはnull
   */
  async getLastSyncTime(): Promise<number | null> {
    try {
      const lastSyncTime = await AsyncStorage.getItem(StorageKeys.lastSyncTime);
      if (!lastSyncTime) return null;
      const parsed = parseInt(lastSyncTime, 10);
      return Number.isNaN(parsed) ? null : parsed;
    } catch (_) {
      return null;
    }
  },
};
