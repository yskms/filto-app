import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '@/constants/storageKeys';
import { SyncService } from '@/services/SyncService';

/**
 * BackgroundSync
 * アプリを開いていない間も定期的にRSSを取得し、開いた時に更新済みにしておく。
 *
 * expo-background-task を使う（Android=WorkManager / iOS=BGTaskScheduler）。
 * 実行タイミングはOSが決めるため間隔はあくまで目安。特に iOS は保証されない。
 *
 * 中身は既存の SyncService.refresh() を呼ぶだけ。UI 非依存で headless で動く。
 * refresh() は lastSyncTime を更新するため、バックグラウンド更新も手動更新の
 * クールダウン（最低更新間隔）にカウントされる（＝仕様どおり）。WiFiのみ設定も尊重する。
 */

const BACKGROUND_FETCH_TASK = 'filto-background-fetch';

/**
 * 実行間隔（分）の目安。Android WorkManager / iOS BGTaskScheduler の最短は15分。
 * 頻繁すぎると電池を消費するため約1時間にしている。
 */
const MINIMUM_INTERVAL_MINUTES = 60;

// タスク定義はモジュール読み込み時（グローバルスコープ）で行う必要がある。
// アプリ起動時にこのモジュールが import されることで登録される。
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    await SyncService.refresh();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (_) {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export const BackgroundSync = {
  /** バックグラウンド更新が有効か。未設定・読み取り失敗のときは既定でオン */
  async isEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(StorageKeys.backgroundFetchEnabled);
      return value === null ? true : value === 'true';
    } catch (_) {
      return true;
    }
  },

  /** 設定を保存し、登録状態を合わせる */
  async setEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(StorageKeys.backgroundFetchEnabled, enabled ? 'true' : 'false');
    if (enabled) {
      await this.register();
    } else {
      await this.unregister();
    }
  },

  async register(): Promise<void> {
    try {
      // すでに登録済みなら再登録しない。毎起動で登録し直すと WorkManager /
      // BGTaskScheduler の待機タイマーがリセットされ、アプリを頻繁に開くと
      // いつまでも発火しなくなるため
      if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK)) return;
      const status = await BackgroundTask.getStatusAsync();
      // OS 側でバックグラウンド更新が制限されている（設定でオフ等）ときは何もしない
      if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return;
      await BackgroundTask.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: MINIMUM_INTERVAL_MINUTES,
      });
    } catch (_) {}
  },

  async unregister(): Promise<void> {
    try {
      const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      if (registered) {
        await BackgroundTask.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      }
    } catch (_) {}
  },

  /** アプリ起動時に、保存された設定と実際のタスク登録状態を一致させる */
  async syncRegistration(): Promise<void> {
    if (await this.isEnabled()) {
      await this.register();
    } else {
      await this.unregister();
    }
  },
};
