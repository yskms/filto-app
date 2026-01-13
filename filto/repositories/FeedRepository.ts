import { openDatabase } from '@/database/init';
import { Feed } from '@/types/Feed';

/**
 * FeedRepository
 * feeds テーブルへのデータアクセスを担当
 */
export const FeedRepository = {
  /**
   * 全フィードを取得（order_no 昇順）
   */
  async list(): Promise<Feed[]> {
    const db = openDatabase();
    const rows = db.getAllSync<{
      id: string;
      title: string;
      url: string;
      icon_url: string | null;
      order_no: number;
      created_at: number;
    }>('SELECT * FROM feeds ORDER BY order_no ASC');

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      url: row.url,
      iconUrl: row.icon_url || undefined,
      orderNo: row.order_no,
      createdAt: new Date(row.created_at * 1000).toISOString(),
    }));
  },

  /**
   * IDでフィードを取得
   */
  async get(id: string): Promise<Feed | null> {
    const db = openDatabase();
    const row = db.getFirstSync<{
      id: string;
      title: string;
      url: string;
      icon_url: string | null;
      order_no: number;
      created_at: number;
    }>('SELECT * FROM feeds WHERE id = ?', [id]);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      title: row.title,
      url: row.url,
      iconUrl: row.icon_url || undefined,
      orderNo: row.order_no,
      createdAt: new Date(row.created_at * 1000).toISOString(),
    };
  },

  /**
   * フィードを作成
   */
  async create(feed: Omit<Feed, 'createdAt'>): Promise<void> {
    const db = openDatabase();
    const createdAt = Math.floor(Date.now() / 1000);

    db.runSync(
      'INSERT INTO feeds (id, title, url, icon_url, order_no, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [feed.id, feed.title, feed.url, feed.iconUrl || null, feed.orderNo, createdAt]
    );
  },

  /**
   * フィードを更新
   */
  async update(feed: Feed): Promise<void> {
    const db = openDatabase();

    db.runSync(
      'UPDATE feeds SET title = ?, url = ?, icon_url = ?, order_no = ? WHERE id = ?',
      [feed.title, feed.url, feed.iconUrl || null, feed.orderNo, feed.id]
    );
  },

  /**
   * フィードを削除
   */
  async delete(id: string): Promise<void> {
    const db = openDatabase();
    db.runSync('DELETE FROM feeds WHERE id = ?', [id]);
  },

  /**
   * 並び順を一括更新
   */
  async bulkUpdateOrder(feeds: Feed[]): Promise<void> {
    const db = openDatabase();

    // トランザクション
    db.withTransactionSync(() => {
      feeds.forEach((feed, index) => {
        db.runSync('UPDATE feeds SET order_no = ? WHERE id = ?', [index + 1, feed.id]);
      });
    });
  },

  /**
   * フィード数を取得
   */
  async count(): Promise<number> {
    const db = openDatabase();
    const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM feeds');
    return row?.count || 0;
  },
};

