import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * データベースを開く
 */
export function openDatabase(): SQLite.SQLiteDatabase {
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
  const database = openDatabase();

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
}

