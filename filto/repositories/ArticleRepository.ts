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
   * 全記事を取得（fetched_at DESC。同時刻内はpublished_at DESCで補助）
   *
   * published_at単独だと、更新頻度の低いフィードの記事はFiltoが今取得した
   * ばかりでも公開時刻が古いために埋もれてしまう（実機で発覚）。
   * fetched_atを主軸にすることで「今回のフィードで新しく取得したか」を
   * 優先し、どのフィードの新着も公平にホーム上位へ出す。
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
        ORDER BY fetched_at DESC, published_at DESC
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
   * 指定フィードの記事を取得（fetched_at DESC。同時刻内はpublished_at DESCで補助）
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
        ORDER BY fetched_at DESC, published_at DESC
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
   * @param fetchedAt 挿入時刻（未指定なら呼び出し時点の現在時刻）。
   *   同期処理からは、同期開始時点の共通の時刻を渡すこと。フィードごとに
   *   Date.now() を取ると、たまたま取得が遅く終わったフィード（内容の新しさとは
   *   無関係、ネットワーク応答タイミング次第）が丸ごと新着順の最上位を占有して
   *   しまう不具合になるため（実機で発覚）
   * @returns 実際に挿入された件数（重複でスキップされた分は含まない）
   */
  async insertMany(articles: Article[], fetchedAt: number = Math.floor(Date.now() / 1000)): Promise<number> {
    if (articles.length === 0) return 0;

    const db = openDatabase();
    let inserted = 0;

    db.withTransactionSync(() => {
      for (const article of articles) {
        try {
          const result = db.runSync(
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
                is_starred
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
              article.isStarred ? 1 : 0,
            ]
          );
          // INSERT OR IGNORE は重複時に 0 行。実際に入った件数だけを数える
          inserted += result.changes;
        } catch (_) {
          // 1件の挿入失敗は無視して残りを継続
        }
      }
    });

    return inserted;
  },

  /**
   * 記事を既読にする
   */
  async markRead(id: string): Promise<void> {
    const db = openDatabase();
    db.runSync('UPDATE articles SET is_read = 1 WHERE id = ?', [id]);
  },

  /**
   * 記事の手動非表示フラグを設定する（スワイプで非表示 / 復元）。
   */
  async setHidden(id: string, hidden: boolean): Promise<void> {
    const db = openDatabase();
    db.runSync('UPDATE articles SET is_hidden = ? WHERE id = ?', [hidden ? 1 : 0, id]);
  },

  /** 指定フィードで手動非表示にした記事の累計件数（サイト非表示の提案トリガー用）。 */
  async countHiddenByFeed(feedId: string): Promise<number> {
    const db = openDatabase();
    const row = db.getFirstSync<{ c: number }>(
      'SELECT COUNT(*) as c FROM articles WHERE feed_id = ? AND is_hidden = 1',
      [feedId]
    );
    return row?.c ?? 0;
  },

  /**
   * 非表示中の記事IDを取得する（ホームでの除外・復元判定に使う）。
   */
  async getHiddenIds(): Promise<string[]> {
    const db = openDatabase();
    const rows = db.getAllSync<{ id: number }>('SELECT id FROM articles WHERE is_hidden = 1');
    return rows.map((r) => String(r.id));
  },

  /**
   * フィード毎の既読統計（保持期間内の記事に対する総数・既読数）を取得する。
   * 「よく読む / あまり読まない / 全く読んでいない」の判定に使う。
   */
  async getReadStatsByFeed(): Promise<Map<string, { total: number; read: number }>> {
    const db = openDatabase();
    const rows = db.getAllSync<{ feed_id: string; total: number; read: number }>(
      'SELECT feed_id, COUNT(*) as total, SUM(is_read) as read FROM articles GROUP BY feed_id'
    );
    const map = new Map<string, { total: number; read: number }>();
    for (const r of rows) {
      map.set(r.feed_id, { total: r.total, read: r.read ?? 0 });
    }
    return map;
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
   * 指定した記事にお気に入りを立てる（外すことはしない）。
   *
   * バックアップ復元用。insertMany は INSERT OR IGNORE なので、すでに端末にある記事は
   * 行ごとスキップされ is_starred が反映されない。そこで挿入後に立て直す。
   * 既読状態は端末側を正とするため触らない（古いバックアップで既読が巻き戻るのを避ける）。
   *
   * @returns 実際にお気に入りが立った件数
   */
  async starManyByLink(targets: { feedId: string; link: string }[]): Promise<number> {
    if (targets.length === 0) return 0;

    const db = openDatabase();
    let starred = 0;

    db.withTransactionSync(() => {
      for (const target of targets) {
        try {
          const result = db.runSync(
            'UPDATE articles SET is_starred = 1 WHERE feed_id = ? AND link = ? AND is_starred = 0',
            [target.feedId, target.link]
          );
          starred += result.changes;
        } catch (_) {
          // 1件の失敗は無視して残りを継続
        }
      }
    });

    return starred;
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
   * 古い記事を削除
   * @param days 保持日数（-1: 全削除, 0: 削除しない, 1以上: 指定日数より古い記事を削除）
   * @param includeStarred お気に入り記事も削除するか（デフォルト: false）
   * @returns 削除された記事数
   */
  async deleteOldArticles(days: number, includeStarred: boolean = false): Promise<number> {
    const db = openDatabase();

    // -1: 全て削除
    if (days === -1) {
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

      return beforeCount - afterCount;
    }

    // 0: 無制限（削除しない）
    if (days === 0) {
      return 0;
    }

    // 1以上: 指定日数より古い記事を削除
    const cutoffTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);

    let deleteQuery = 'DELETE FROM articles WHERE fetched_at < ?';
    if (!includeStarred) {
      deleteQuery += ' AND is_starred = 0';
    }

    const result = db.runSync(deleteQuery, [cutoffTime]);
    return result.changes;
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

      // includeStarred=false の場合でも、存在するお気に入り件数を返す（チェックボックスの活性判定用）
      if (!includeStarred) {
        const starredCount = db.getFirstSync<{ count: number }>(
          'SELECT COUNT(*) as count FROM articles WHERE is_starred = 1'
        )?.count || 0;
        return { ...(stats || { total: 0, unread: 0, read: 0, starred: 0 }), starred: starredCount };
      }

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

    // includeStarred=false の場合でも、対象期間に存在するお気に入り件数を返す（チェックボックスの活性判定用）
    if (!includeStarred) {
      const starredCount = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM articles WHERE fetched_at < ? AND is_starred = 1',
        [cutoffTime]
      )?.count || 0;
      return { ...(stats || { total: 0, unread: 0, read: 0, starred: 0 }), starred: starredCount };
    }

    return stats || { total: 0, unread: 0, read: 0, starred: 0 };
  },
};