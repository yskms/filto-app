import * as SQLite from 'expo-sqlite';

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
    } catch (error) {
      console.log('Failed to close existing database:', error);
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
      is_blocked    INTEGER NOT NULL DEFAULT 0,

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
}
