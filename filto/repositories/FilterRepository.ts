import { Filter } from '@/services/FilterService';
import { openDatabase } from '@/database/init';

/**
 * FilterRepository
 * filtersテーブルへのアクセスを提供
 */
export const FilterRepository = {
  /**
   * フィルタ一覧を取得（作成日時の降順）
   */
  async list(): Promise<Filter[]> {
    const db = openDatabase();
    const rows = db.getAllSync<{
      id: number;
      block_keyword: string;
      allow_keyword: string | null;
      target_title: number;
      target_description: number;
      created_at: number;
      updated_at: number;
    }>(
      'SELECT * FROM filters ORDER BY created_at DESC',
      []
    );

    return rows.map((row) => ({
      id: row.id,
      block_keyword: row.block_keyword,
      allow_keyword: row.allow_keyword,
      target_title: row.target_title,
      target_description: row.target_description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  /**
   * 指定IDのフィルタを取得
   */
  async get(id: number): Promise<Filter | null> {
    const db = openDatabase();
    const row = db.getFirstSync<{
      id: number;
      block_keyword: string;
      allow_keyword: string | null;
      target_title: number;
      target_description: number;
      created_at: number;
      updated_at: number;
    }>(
      'SELECT * FROM filters WHERE id = ?',
      [id]
    );

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      block_keyword: row.block_keyword,
      allow_keyword: row.allow_keyword,
      target_title: row.target_title,
      target_description: row.target_description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },

  /**
   * フィルタを新規作成
   * @returns 作成されたフィルタのID
   */
  async create(filter: Omit<Filter, 'id'>): Promise<number> {
    const db = openDatabase();
    const result = db.runSync(
      `INSERT INTO filters (
        block_keyword,
        allow_keyword,
        target_title,
        target_description,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        filter.block_keyword,
        filter.allow_keyword,
        filter.target_title,
        filter.target_description,
        filter.created_at,
        filter.updated_at,
      ]
    );

    return result.lastInsertRowId;
  },

  /**
   * フィルタを更新
   */
  async update(filter: Filter): Promise<void> {
    if (filter.id === undefined) {
      throw new Error('Filter id is required for update');
    }

    const db = openDatabase();
    db.runSync(
      `UPDATE filters SET
        block_keyword = ?,
        allow_keyword = ?,
        target_title = ?,
        target_description = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        filter.block_keyword,
        filter.allow_keyword,
        filter.target_title,
        filter.target_description,
        filter.updated_at,
        filter.id,
      ]
    );
  },

  /**
   * フィルタを削除
   */
  async delete(id: number): Promise<void> {
    const db = openDatabase();
    db.runSync('DELETE FROM filters WHERE id = ?', [id]);
  },

  /**
   * フィルタ数を取得
   */
  async count(): Promise<number> {
    const db = openDatabase();
    const row = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM filters',
      []
    );

    return row?.count ?? 0;
  },
};

