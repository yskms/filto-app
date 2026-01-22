import { openDatabase } from '@/database/init';
import { Article } from '@/types/Article';

function unixSecondsToIsoString(unixSeconds: number | null, fallbackUnixSeconds?: number): string {
  const seconds = unixSeconds ?? fallbackUnixSeconds ?? 0;
  return new Date(seconds * 1000).toISOString();
}

function isoStringToUnixSecondsOrNull(isoString: string): number | null {
  const ms = new Date(isoString).getTime();
  if (Number.isNaN(ms)) {
    return null;
  }
  return Math.floor(ms / 1000);
}

/**
 * ArticleRepository
 * articles テーブルへのデータアクセスを担当
 */
export const ArticleRepository = {
  /**
   * 全記事を取得（published_at DESC）
   */
  async listAll(): Promise<Article[]> {
    const db = openDatabase();

    const rows = db.getAllSync<{
      id: number;
      feed_id: string;
      feed_name: string;
      title: string;
      link: string;
      description: string | null;
      thumbnail_url: string | null;
      published_at: number | null;
      fetched_at: number;
      is_read: number;
      is_starred: number;
    }>(
      `
        SELECT
          id,
          feed_id,
          feed_name,
          title,
          link,
          description,
          thumbnail_url,
          published_at,
          fetched_at,
          is_read,
          is_starred
        FROM articles
        ORDER BY published_at DESC
      `
    );

    return rows.map((row) => ({
      id: String(row.id),
      feedId: row.feed_id,
      feedName: row.feed_name,
      title: row.title,
      link: row.link,
      summary: row.description ?? undefined,
      thumbnailUrl: row.thumbnail_url ?? undefined,
      publishedAt: unixSecondsToIsoString(row.published_at, row.fetched_at),
      isRead: row.is_read === 1,
      isStarred: row.is_starred === 1,
    }));
  },

  /**
   * 指定フィードの記事を取得（published_at DESC）
   */
  async listByFeed(feedId: string): Promise<Article[]> {
    const db = openDatabase();

    const rows = db.getAllSync<{
      id: number;
      feed_id: string;
      feed_name: string;
      title: string;
      link: string;
      description: string | null;
      thumbnail_url: string | null;
      published_at: number | null;
      fetched_at: number;
      is_read: number;
      is_starred: number;
    }>(
      `
        SELECT
          id,
          feed_id,
          feed_name,
          title,
          link,
          description,
          thumbnail_url,
          published_at,
          fetched_at,
          is_read,
          is_starred
        FROM articles
        WHERE feed_id = ?
        ORDER BY published_at DESC
      `,
      [feedId]
    );

    return rows.map((row) => ({
      id: String(row.id),
      feedId: row.feed_id,
      feedName: row.feed_name,
      title: row.title,
      link: row.link,
      summary: row.description ?? undefined,
      thumbnailUrl: row.thumbnail_url ?? undefined,
      publishedAt: unixSecondsToIsoString(row.published_at, row.fetched_at),
      isRead: row.is_read === 1,
      isStarred: row.is_starred === 1,
    }));
  },

  /**
   * 記事を一括挿入（トランザクション）
   * NOTE: INSERT OR IGNOREで重複を自動的にスキップ
   */
  async insertMany(articles: Article[]): Promise<void> {
    if (articles.length === 0) return;

    const db = openDatabase();
    const fetchedAt = Math.floor(Date.now() / 1000);

    db.withTransactionSync(() => {
      for (const article of articles) {
        try {
          db.runSync(
            `
              INSERT OR IGNORE INTO articles (
                feed_id,
                feed_name,
                title,
                link,
                description,
                thumbnail_url,
                published_at,
                fetched_at,
                is_read,
                is_blocked,
                is_starred
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              article.feedId,
              article.feedName,
              article.title,
              article.link,
              article.summary ?? null,
              article.thumbnailUrl ?? null,
              isoStringToUnixSecondsOrNull(article.publishedAt),
              fetchedAt,
              article.isRead ? 1 : 0,
              0,
              article.isStarred ? 1 : 0,
            ]
          );
        } catch (error) {
          console.warn(`Failed to insert article ${article.id}:`, error);
        }
      }
    });
  },

  /**
   * 記事を既読にする
   */
  async markRead(id: string): Promise<void> {
    const db = openDatabase();
    db.runSync('UPDATE articles SET is_read = 1 WHERE id = ?', [id]);
  },

  /**
   * お気に入りを切り替える
   */
  async toggleStarred(id: string): Promise<void> {
    const db = openDatabase();
    db.runSync(
      'UPDATE articles SET is_starred = CASE WHEN is_starred = 1 THEN 0 ELSE 1 END WHERE id = ?',
      [id]
    );
  },

  /**
   * お気に入り記事のみを取得
   */
  async listStarred(): Promise<Article[]> {
    const db = openDatabase();

    const rows = db.getAllSync<{
      id: number;
      feed_id: string;
      feed_name: string;
      title: string;
      link: string;
      description: string | null;
      thumbnail_url: string | null;
      published_at: number | null;
      fetched_at: number;
      is_read: number;
      is_starred: number;
    }>(
      `
        SELECT
          id,
          feed_id,
          feed_name,
          title,
          link,
          description,
          thumbnail_url,
          published_at,
          fetched_at,
          is_read,
          is_starred
        FROM articles
        WHERE is_starred = 1
        ORDER BY published_at DESC
      `
    );

    return rows.map((row) => ({
      id: String(row.id),
      feedId: row.feed_id,
      feedName: row.feed_name,
      title: row.title,
      link: row.link,
      summary: row.description ?? undefined,
      thumbnailUrl: row.thumbnail_url ?? undefined,
      publishedAt: unixSecondsToIsoString(row.published_at, row.fetched_at),
      isRead: row.is_read === 1,
      isStarred: row.is_starred === 1,
    }));
  },

  /**
   * フィードIDに紐づく記事を削除
   */
  async deleteByFeedId(feedId: string): Promise<void> {
    const db = openDatabase();
    db.runSync('DELETE FROM articles WHERE feed_id = ?', [feedId]);
  },

  /**
   * 古い記事を削除
   * @param days 保持日数（-1: 全削除, 0: 削除しない, 1以上: 指定日数より古い記事を削除）
   * @param includeStarred お気に入り記事も削除するか（デフォルト: false）
   * @returns 削除された記事数
   */
  async deleteOldArticles(days: number, includeStarred: boolean = false): Promise<number> {
    const db = openDatabase();

    // -1: 全て削除
    if (days === -1) {
      console.log('[ArticleRepository] Deleting all articles...');
      
      const beforeCount = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM articles'
      )?.count || 0;

      if (includeStarred) {
        db.runSync('DELETE FROM articles');
      } else {
        db.runSync('DELETE FROM articles WHERE is_starred = 0');
      }

      const afterCount = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM articles'
      )?.count || 0;

      const deletedCount = beforeCount - afterCount;
      console.log(`[ArticleRepository] Deleted ${deletedCount} articles (all)`);
      return deletedCount;
    }

    // 0: 無制限（削除しない）
    if (days === 0) {
      console.log('[ArticleRepository] Retention is unlimited, skipping deletion');
      return 0;
    }

    // 1以上: 指定日数より古い記事を削除
    const cutoffTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
    console.log(`[ArticleRepository] Deleting articles older than ${days} days (cutoff: ${new Date(cutoffTime * 1000).toISOString()})`);

    // 削除前に件数を確認
    let countQuery = `
      SELECT COUNT(*) as count 
      FROM articles 
      WHERE fetched_at < ?
    `;
    
    if (!includeStarred) {
      countQuery += ' AND is_starred = 0';
    }

    const beforeCount = db.getFirstSync<{ count: number }>(countQuery, [cutoffTime]);
    console.log(`[ArticleRepository] Found ${beforeCount?.count || 0} old articles to delete`);

    // 削除実行
    let deleteQuery = 'DELETE FROM articles WHERE fetched_at < ?';
    
    if (!includeStarred) {
      deleteQuery += ' AND is_starred = 0';
    }

    const result = db.runSync(deleteQuery, [cutoffTime]);
    const deletedCount = result.changes;

    console.log(`[ArticleRepository] Deleted ${deletedCount} old articles`);
    return deletedCount;
  },

  /**
   * 削除対象の記事を取得（プレビュー用）
   * @param days 保持日数（-1: 全削除, 0: 削除しない, 1以上: 指定日数より古い記事）
   * @param includeStarred お気に入り記事も含むか
   * @returns 削除対象の記事統計
   */
  async getOldArticlesStats(days: number, includeStarred: boolean = false): Promise<{
    total: number;
    unread: number;
    read: number;
    starred: number;
  }> {
    const db = openDatabase();

    // -1: 全削除の場合、全記事の統計を返す
    if (days === -1) {
      let whereClause = '';
      if (!includeStarred) {
        whereClause = 'WHERE is_starred = 0';
      }

      const stats = db.getFirstSync<{
        total: number;
        unread: number;
        read: number;
        starred: number;
      }>(
        `
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
            SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read,
            SUM(CASE WHEN is_starred = 1 THEN 1 ELSE 0 END) as starred
          FROM articles
          ${whereClause}
        `
      );

      return stats || { total: 0, unread: 0, read: 0, starred: 0 };
    }

    // 0: 無制限の場合、削除対象なし
    if (days === 0) {
      return { total: 0, unread: 0, read: 0, starred: 0 };
    }

    // 1以上: 指定日数より古い記事の統計
    const cutoffTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);

    let whereClause = 'WHERE fetched_at < ?';
    if (!includeStarred) {
      whereClause += ' AND is_starred = 0';
    }

    const stats = db.getFirstSync<{
      total: number;
      unread: number;
      read: number;
      starred: number;
    }>(
      `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
          SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read,
          SUM(CASE WHEN is_starred = 1 THEN 1 ELSE 0 END) as starred
        FROM articles
        ${whereClause}
      `,
      [cutoffTime]
    );

    return stats || { total: 0, unread: 0, read: 0, starred: 0 };
  },
};