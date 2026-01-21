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
};


