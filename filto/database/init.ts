import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import { getDefaultFeedsFlat } from '@/constants/defaultFeeds';
import { StorageKeys, STORAGE_KEY_PREFIX } from '@/constants/storageKeys';
import { getFaviconUrl } from '@/utils/feedUrl';

const SEED_KEY = StorageKeys.defaultFeedsSeeded;
const FILTER_SEED_KEY = StorageKeys.defaultFiltersSeeded;

const DEFAULT_FILTERS = [
  { block_keyword: 'Trump', allow_keyword: null, target_title: 1, target_description: 1 },
  { block_keyword: 'Google', allow_keyword: null, target_title: 1, target_description: 1 },
  { block_keyword: 'Apple', allow_keyword: null, target_title: 1, target_description: 1 },
];

function isJapaneseLocale(): boolean {
  const locales = Localization.getLocales();
  return locales.some((locale) => locale.languageCode === 'ja');
}

let db: SQLite.SQLiteDatabase | null = null;

/**
 * データベースを開く
 * @param forceNew true の場合、既存のインスタンスを破棄して新規作成
 */
export function openDatabase(forceNew: boolean = false): SQLite.SQLiteDatabase {
  if (forceNew && db) {
    // 既存の接続をクローズ（可能であれば）
    try {
      db.closeSync();
    } catch (_) {
      // クローズ失敗は無視して新規接続を続行
    }
    db = null;
  }
  
  if (db) {
    return db;
  }

  db = SQLite.openDatabaseSync('filto.db');
  // 外部キー制約はSQLiteでは接続ごとに既定で無効。有効にしないと articles の
  // ON DELETE CASCADE が働かず、フィード削除で記事が孤児として残る。
  // トランザクション外でのみ設定できるため、接続を開いた直後にここで張る。
  db.execSync('PRAGMA foreign_keys = ON');
  return db;
}

/**
 * 既存テーブルに列が無ければ追加する（冪等）。
 *
 * このアプリはスキーマのバージョン管理を持たず initDatabase で
 * CREATE TABLE IF NOT EXISTS しているだけなので、既存ユーザーのテーブルには
 * 後から増やした列が存在しない。PRAGMA table_info で有無を確認し、
 * 無いときだけ ALTER TABLE ADD COLUMN する。
 * @param columnDef 例: 'etag TEXT'（列名＋型。DEFAULT を付けても良い）
 */
function ensureColumn(
  database: SQLite.SQLiteDatabase,
  table: string,
  columnName: string,
  columnDef: string
): void {
  const columns = database.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  const exists = columns.some((c) => c.name === columnName);
  if (!exists) {
    database.execSync(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
  }
}

/**
 * データベースを初期化（テーブル作成・インデックス作成）
 */
export async function initDatabase(): Promise<void> {
  // 新しいDBインスタンスを強制的に作成
  const database = openDatabase(true);

  // filters テーブル作成
  database.execSync(`
    CREATE TABLE IF NOT EXISTS filters (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      block_keyword       TEXT NOT NULL,
      allow_keyword       TEXT,
      target_title        INTEGER NOT NULL DEFAULT 1,
      target_description  INTEGER NOT NULL DEFAULT 1,
      created_at          INTEGER NOT NULL,
      updated_at          INTEGER NOT NULL
    );
  `);

  // インデックス作成
  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_filters_created_at ON filters(created_at);
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_filters_updated_at ON filters(updated_at);
  `);

  // feeds テーブル作成
  database.execSync(`
    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      icon_url TEXT,
      order_no INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_feeds_order_no ON feeds(order_no);
  `);

  // 条件付きGET（ETag / Last-Modified）用の列。既存ユーザーのテーブルにも後付けする。
  // 変化が無ければ 304 で本文DL・パースを省けるため通信量を大きく削減できる。
  ensureColumn(database, 'feeds', 'etag', 'etag TEXT');
  ensureColumn(database, 'feeds', 'last_modified', 'last_modified TEXT');

  // ホームで非表示（ミュート）用の列。削除せずにホーム一覧から外すための非破壊フラグ。
  ensureColumn(database, 'feeds', 'hidden_from_home', 'hidden_from_home INTEGER NOT NULL DEFAULT 0');

  // 記事の手動非表示（スワイプで非表示）。ホーム一覧からは除外するが is_hidden で残し、
  // 「表示」トグルで淡色表示→スワイプで復元できる（完全に消さない）。
  ensureColumn(database, 'articles', 'is_hidden', 'is_hidden INTEGER NOT NULL DEFAULT 0');
  database.execSync('CREATE INDEX IF NOT EXISTS idx_articles_is_hidden ON articles(is_hidden)');

  // articles テーブル作成
  database.execSync(`
    CREATE TABLE IF NOT EXISTS articles (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      feed_id       TEXT NOT NULL,
      feed_name     TEXT NOT NULL,
      title         TEXT NOT NULL,
      link          TEXT NOT NULL,
      description   TEXT,
      thumbnail_url TEXT,
      published_at  INTEGER,
      fetched_at    INTEGER NOT NULL,
      is_read       INTEGER NOT NULL DEFAULT 0,
      is_starred    INTEGER NOT NULL DEFAULT 0,

      UNIQUE(feed_id, link),
      FOREIGN KEY(feed_id) REFERENCES feeds(id) ON DELETE CASCADE
    );
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_articles_is_starred ON articles(is_starred);
  `);

  // global_allow_keywords テーブル作成
  database.execSync(`
    CREATE TABLE IF NOT EXISTS global_allow_keywords (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword     TEXT NOT NULL UNIQUE,
      created_at  INTEGER NOT NULL
    );
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_global_allow_keyword ON global_allow_keywords(keyword);
  `);

  // 外部キーを有効化する前のバージョンでフィードを削除した端末には、
  // 親フィードを失った記事が残っている（CASCADE が働かなかったため）。
  // PRAGMA foreign_keys=ON は既存行を検証しないので、ここで一度だけ掃除する。
  // 有効化後は孤児が新たに生まれないため、以降このDELETEは0件で終わる。
  database.execSync('DELETE FROM articles WHERE feed_id NOT IN (SELECT id FROM feeds)');
}

/**
 * デフォルトフィルタを初回起動時のみ登録する
 */
export async function seedDefaultFilters(): Promise<void> {
  const seeded = await AsyncStorage.getItem(FILTER_SEED_KEY);
  if (seeded) return;

  const database = openDatabase();
  const now = Math.floor(Date.now() / 1000);

  database.withTransactionSync(() => {
    for (const filter of DEFAULT_FILTERS) {
      database.runSync(
        'INSERT OR IGNORE INTO filters (block_keyword, allow_keyword, target_title, target_description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [filter.block_keyword, filter.allow_keyword, filter.target_title, filter.target_description, now, now]
      );
    }
  });

  await AsyncStorage.setItem(FILTER_SEED_KEY, 'true');
}

export const ONBOARDING_KEY = StorageKeys.onboardingCompleted;

/**
 * 指定したテーブルの全行を1トランザクションで削除する。
 * テーブル名は呼び出し側のリテラル定数のみを想定（外部入力を渡さないこと）。
 */
function deleteAllFromTables(tables: string[]): void {
  const database = openDatabase();
  database.withTransactionSync(() => {
    for (const table of tables) {
      database.execSync(`DELETE FROM ${table}`);
    }
  });
}

/**
 * DB上のユーザーデータ（フィード・フィルタ・許可キーワード・記事）を1トランザクションで全削除する。
 * AsyncStorage の設定には触れない。
 *
 * feeds を消せば記事は CASCADE で連動削除されるが、意図を明示するため articles も直接消す。
 */
export function clearUserDataTables(): void {
  deleteAllFromTables(['articles', 'feeds', 'filters', 'global_allow_keywords']);
}

/**
 * すべてのデータをリセットする（DB全テーブル削除 + AsyncStorage全クリア）
 *
 * AsyncStorage は個別列挙ではなくプレフィックス走査で消す。
 * 設定キーを増やすたびに列挙し忘れて「リセットしても残る」事故を防ぐため。
 */
export async function resetAllData(): Promise<void> {
  clearUserDataTables();
  const keys = await AsyncStorage.getAllKeys();
  const filtoKeys = keys.filter((key) => key.startsWith(STORAGE_KEY_PREFIX));
  if (filtoKeys.length > 0) {
    await AsyncStorage.multiRemove(filtoKeys);
  }
}

/**
 * 「初回設定をやり直す」用のスコープ付きリセット。
 * 初回設定で作られるフィード・フィルタと、それに紐づく記事を削除して選び直せる状態にする。
 * 表示設定などの AsyncStorage とグローバル許可キーワードは保持する（初回設定の対象外のため）。
 *
 * feeds を消せば記事は CASCADE で連動削除されるが、意図を明示するため articles も直接消す。
 * グローバル許可キーワードは残すため clearUserDataTables は使わない。
 */
export async function resetFeedsAndFilters(): Promise<void> {
  deleteAllFromTables(['articles', 'feeds', 'filters']);
  // 次回（初回設定やり直し＝FirstRunScreen）でデフォルトフィードを再投入できるよう、
  // seed 済み・オンボ完了フラグを消す。これが無いと seedDefaultFeeds がスキップして
  // フィードが空のままになる。
  await AsyncStorage.multiRemove([SEED_KEY, FILTER_SEED_KEY, ONBOARDING_KEY]);
}

/**
 * オンボーディング完了済みかどうかを判定する（既存ユーザーも含む）
 */
export async function isOnboardingComplete(): Promise<boolean> {
  const [onboardingDone, feedsSeeded] = await Promise.all([
    AsyncStorage.getItem(ONBOARDING_KEY),
    AsyncStorage.getItem(SEED_KEY),
  ]);
  return !!(onboardingDone || feedsSeeded);
}

/**
 * オンボーディングで選択されたフィードを登録する
 */
export async function seedFeedsFromSelection(
  feeds: { id: string; title: string; url: string; iconUrl?: string }[]
): Promise<void> {
  const database = openDatabase();
  const createdAt = Math.floor(Date.now() / 1000);

  database.withTransactionSync(() => {
    feeds.forEach((feed, index) => {
      database.runSync(
        'INSERT OR IGNORE INTO feeds (id, title, url, icon_url, order_no, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [feed.id, feed.title, feed.url, feed.iconUrl ?? null, index + 1, createdAt]
      );
    });
  });

  await AsyncStorage.setItem(SEED_KEY, 'true');
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

/**
 * オンボーディングで選択されたトピックのブロックキーワードを登録する
 */
export async function seedFiltersFromTopics(keywords: string[]): Promise<void> {
  if (keywords.length > 0) {
    const database = openDatabase();
    const now = Math.floor(Date.now() / 1000);

    database.withTransactionSync(() => {
      for (const keyword of keywords) {
        database.runSync(
          'INSERT OR IGNORE INTO filters (block_keyword, allow_keyword, target_title, target_description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [keyword, null, 1, 1, now, now]
        );
      }
    });
  }

  await AsyncStorage.setItem(FILTER_SEED_KEY, 'true');
}

/**
 * デフォルトフィードを初回起動時のみ登録する。
 * @param lang 投入する言語。未指定ならデバイスのロケールから判定（アプリの言語設定を
 *   反映させたい場合は呼び出し側から渡すこと）。
 */
export async function seedDefaultFeeds(lang?: 'ja' | 'en'): Promise<void> {
  const seeded = await AsyncStorage.getItem(SEED_KEY);
  if (seeded) return;

  const resolvedLang = lang ?? (isJapaneseLocale() ? 'ja' : 'en');
  const feeds = getDefaultFeedsFlat(resolvedLang);
  const database = openDatabase();
  const createdAt = Math.floor(Date.now() / 1000);

  database.withTransactionSync(() => {
    feeds.forEach((feed, index) => {
      // 旧オンボードと同様に Google ファビコンURLを付与する（null だと新聞プレースホルダになる）
      database.runSync(
        'INSERT OR IGNORE INTO feeds (id, title, url, icon_url, order_no, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [feed.id, feed.title, feed.url, getFaviconUrl(feed.url) || null, index + 1, createdAt]
      );
    });
  });

  await AsyncStorage.setItem(SEED_KEY, 'true');
}
