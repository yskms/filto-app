import { openDatabase } from '@/database/init';
import { GlobalAllowKeyword } from '@/types/GlobalAllowKeyword';

/**
 * GlobalAllowKeywordRepository
 * global_allow_keywords テーブルへのデータアクセスを担当
 */
export const GlobalAllowKeywordRepository = {
  /**
   * 全キーワードを取得（created_at 降順）
   */
  async list(): Promise<GlobalAllowKeyword[]> {
    const db = openDatabase();
    
    const rows = db.getAllSync<{
      id: number;
      keyword: string;
      created_at: number;
    }>('SELECT * FROM global_allow_keywords ORDER BY created_at DESC');

    return rows.map(row => ({
      id: row.id,
      keyword: row.keyword,
      createdAt: new Date(row.created_at * 1000).toISOString(),
    }));
  },

  /**
   * キーワードを追加
   */
  async create(keyword: string): Promise<number> {
    const db = openDatabase();
    const createdAt = Math.floor(Date.now() / 1000);

    const result = db.runSync(
      'INSERT INTO global_allow_keywords (keyword, created_at) VALUES (?, ?)',
      [keyword.trim(), createdAt]
    );

    return result.lastInsertRowId;
  },

  /**
   * キーワードを削除
   */
  async delete(id: number): Promise<void> {
    const db = openDatabase();
    db.runSync('DELETE FROM global_allow_keywords WHERE id = ?', [id]);
  },

  /**
   * キーワード数を取得
   */
  async count(): Promise<number> {
    const db = openDatabase();
    const row = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM global_allow_keywords'
    );
    return row?.count || 0;
  },

  /**
   * キーワードが存在するか確認
   */
  async exists(keyword: string): Promise<boolean> {
    const db = openDatabase();
    const row = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM global_allow_keywords WHERE keyword = ?',
      [keyword.trim()]
    );
    return (row?.count || 0) > 0;
  },
};
