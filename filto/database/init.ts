import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEED_KEY = '@filto/defaultFeedsSeeded';
const FILTER_SEED_KEY = '@filto/defaultFiltersSeeded';

const DEFAULT_FILTERS = [
  { block_keyword: 'Trump', allow_keyword: null, target_title: 1, target_description: 1 },
  { block_keyword: 'Google', allow_keyword: null, target_title: 1, target_description: 1 },
  { block_keyword: 'AI', allow_keyword: null, target_title: 1, target_description: 1 },
];

const DEFAULT_FEEDS = [
  {
    id: 'default_feed_bbc',
    title: 'BBC News',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    orderNo: 1,
  },
  {
    id: 'default_feed_techcrunch',
    title: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    orderNo: 2,
  },
  {
    id: 'default_feed_verge',
    title: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    orderNo: 3,
  },
];

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
  return db;
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

/**
 * デフォルトフィードを初回起動時のみ登録する
 */
export async function seedDefaultFeeds(): Promise<void> {
  const seeded = await AsyncStorage.getItem(SEED_KEY);
  if (seeded) return;

  const database = openDatabase();
  const createdAt = Math.floor(Date.now() / 1000);

  database.withTransactionSync(() => {
    for (const feed of DEFAULT_FEEDS) {
      database.runSync(
        'INSERT OR IGNORE INTO feeds (id, title, url, icon_url, order_no, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [feed.id, feed.title, feed.url, null, feed.orderNo, createdAt]
      );
    }
  });

  await AsyncStorage.setItem(SEED_KEY, 'true');
}
