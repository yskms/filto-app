import { openDatabase } from '@/database/init';
import { Article } from '@/types/Article';
import { diversifyByFeed } from '@/utils/diversifyByFeed';

/**
 * 一度に採番する未採番記事の上限。
 *
 * これは「これ以上は正しく扱えない」という上限ではなく、未採番プールが異常に
 * 膨張したときの非常用の歯止め。正常運用では到達しない（既定フィード77件を
 * 初回同期しても約3,850件）。
 *
 * 超過分は次回に持ち越さず削除する。持ち越すと次回は MAX(display_order) が
 * 上がっているため、古い記事に大きい番号が付いて新しい記事より上に来てしまう。
 *
 * 値の根拠（Node での実測 / {id, feedId} のみ・記事本体は含まない）:
 *   3,850件 … 分散2ms / 1フィードが8割を占める最悪ケース61ms
 *   6,000件 … 5ms / 147ms
 *  10,000件 … 12ms / 410ms
 * 5000件なら最悪でも100ms前後で、Hermes が数倍遅いとしても、既に数十秒かかる
 * 同期処理の一部としては許容できる。しかも同期完了時に1回走るだけで、
 * ホーム表示のたびには走らない。
 */
const MAX_UNNUMBERED_ARTICLES = 5000;

/** 一覧クエリが共通で使う SELECT 対象。display_order を落とすとバックアップに載らない */
const ARTICLE_COLUMNS = `
  id,
  feed_id,
  feed_name,
  title,
  link,
  description,
  thumbnail_url,
  published_at,
  fetched_at,
  display_order,
  is_read,
  is_starred
`;

interface ArticleRow {
  id: number;
  feed_id: string;
  feed_name: string;
  title: string;
  link: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: number | null;
  fetched_at: number;
  display_order: number | null;
  is_read: number;
  is_starred: number;
}

function rowToArticle(row: ArticleRow): Article {
  return {
    id: String(row.id),
    feedId: row.feed_id,
    feedName: row.feed_name,
    title: row.title,
    link: row.link,
    summary: row.description ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    publishedAt: unixSecondsToIsoString(row.published_at, row.fetched_at),
    displayOrder: row.display_order ?? undefined,
    isRead: row.is_read === 1,
    isStarred: row.is_starred === 1,
  };
}

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
   * 全記事を表示順で取得する。
   *
   * 並びは保存時に確定した display_order だけで決まる（表示時の並べ替えはしない）。
   * 過去に fetched_at（端末時計）や published_at を表示順の主キーにして、
   * 「時計がずれると記事が永久に最上位に固定される」「更新頻度の低いサイトの記事が
   * 永久に埋もれる」といった不具合をそれぞれ出している。
   *
   * WHERE display_order IS NOT NULL: 未採番（同期中に挿入されただけで、まだ順番が
   * 決まっていない）記事を隠す。採番前に見せると、採番完了後に記事が下から上へ飛ぶ。
   *
   * id DESC は万一 display_order が重複した場合にSQLの結果を決定的にするための
   * フォールバックで、通常の順序付けはこれに依存しない。
   */
  async listAll(): Promise<Article[]> {
    const db = openDatabase();

    const rows = db.getAllSync<ArticleRow>(
      `
        SELECT ${ARTICLE_COLUMNS}
        FROM articles
        WHERE display_order IS NOT NULL
        ORDER BY display_order DESC, id DESC
      `
    );

    return rows.map(rowToArticle);
  },

  /**
   * 指定フィードの記事を表示順で取得する（listAll と同じ並び）。
   * ※ 現在どこからも呼ばれていない（ArticleService.getArticles は引数なしでしか
   *    呼ばれない）が、並びが食い違わないよう listAll に揃えておく。
   */
  async listByFeed(feedId: string): Promise<Article[]> {
    const db = openDatabase();

    const rows = db.getAllSync<ArticleRow>(
      `
        SELECT ${ARTICLE_COLUMNS}
        FROM articles
        WHERE feed_id = ? AND display_order IS NOT NULL
        ORDER BY display_order DESC, id DESC
      `,
      [feedId]
    );

    return rows.map(rowToArticle);
  },

  /**
   * 記事を一括挿入（トランザクション）
   * NOTE: INSERT OR IGNOREで重複を自動的にスキップ
   * @param fetchedAt 挿入時刻（未指定なら呼び出し時点の現在時刻）。
   *   同期処理からは、同期開始時点の共通の時刻を渡すこと。フィードごとに
   *   Date.now() を取ると、たまたま取得が遅く終わったフィード（内容の新しさとは
   *   無関係、ネットワーク応答タイミング次第）が丸ごと新着順の最上位を占有して
   *   しまう不具合になるため（実機で発覚）
   * @param options.assignDisplayOrder その場で display_order を採番する
   *   （バックアップ復元用）。同期からは指定しない ―― 同期は未採番で入れておき、
   *   全フィードの保存が終わってから assignDisplayOrders() でまとめて採番する。
   *
   *   採番する場合、**articles は既に最終的な表示順に並んでいること**。
   *   この関数は配列の添字だけを見て番号を振り、挿入順そのものには意味を持たせない。
   * @returns 実際に挿入された件数（重複でスキップされた分は含まない）
   */
  async insertMany(
    articles: Article[],
    fetchedAt: number = Math.floor(Date.now() / 1000),
    options?: { assignDisplayOrder?: boolean }
  ): Promise<number> {
    if (articles.length === 0) return 0;

    const db = openDatabase();
    const assign = options?.assignDisplayOrder === true;
    const total = articles.length;
    let inserted = 0;

    db.withTransactionSync(() => {
      // 基点は「このトランザクション内で読んだ現在の最大値」。COALESCE を怠ると
      // 空テーブルで NULL になり、全 INSERT が失敗する（過去にこれで
      // 「初回起動で記事0件のまま復旧不能」というP0を出している）。
      // ここは採番の正しさそのものなので catch で握り潰さない。
      const base = assign
        ? db.getFirstSync<{ m: number }>(
            'SELECT COALESCE(MAX(display_order), 0) AS m FROM articles'
          )?.m ?? 0
        : 0;

      for (let i = 0; i < total; i++) {
        const article = articles[i];
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
                display_order,
                is_read,
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
              // 先頭ほど大きい番号。base + i にすると display_order DESC で
              // 配列内が逆順に表示される。重複でスキップされた行の分は
              // 歯抜けになるだけで、順序も一意性も崩れない
              assign ? base + (total - i) : null,
              article.isRead ? 1 : 0,
              article.isStarred ? 1 : 0,
            ]
          );
          // INSERT OR IGNORE は重複時に 0 行。実際に入った件数だけを数える
          inserted += result.changes;
        } catch (_) {
          // 1件の挿入失敗は無視して残りを継続（フィード単位のエラー分離と同じ方針）
        }
      }
    });

    return inserted;
  },

  /**
   * 未採番（display_order IS NULL）の記事に表示順を振る。同期の最後に1回だけ呼ぶ。
   *
   * 「超過分の削除・採番対象の選定・基点の取得・採番」をすべて**単一の
   * withTransactionSync**で行う。JS側の await を挟まないため、SQLite が書き込み
   * トランザクションを直列化することで、別ランタイム（バックグラウンド同期）からの
   * 同時実行があっても MAX の二重読み取りによる採番衝突は起きない。
   *
   * ただしロック競合時は SQLITE_BUSY 等でトランザクション自体が失敗しうる。
   * その場合は expo-sqlite が ROLLBACK して再スローするため、記事は未採番のまま残り、
   * 次回の採番処理の対象になる（同じ記事が必ず復活するとは限らない ―― 超過削除の
   * 対象になる可能性はある）。呼び出し側は失敗を握り潰して「同期完了」に
   * 進めてはならない。
   *
   * @returns numbered: 採番した件数 / discarded: 上限超過で削除した件数
   */
  async assignDisplayOrders(): Promise<{ numbered: number; discarded: number }> {
    const db = openDatabase();
    let numbered = 0;
    let discarded = 0;

    db.withTransactionSync(() => {
      // 上限を超えた未採番を先に捨てる。採番対象の選定とまったく同じ ORDER BY の
      // 「5000件目より後ろ」を指すので、選定基準と削除基準がずれる余地が構造的に無い。
      // ※ OFFSET の値はこのモジュールの定数（外部入力ではない）。PRAGMA と同様に
      //   パラメータ束縛せず埋め込む。
      const overflow = db.runSync(
        `
          DELETE FROM articles WHERE id IN (
            SELECT id FROM articles
            WHERE display_order IS NULL
            ORDER BY published_at DESC, id DESC
            LIMIT -1 OFFSET ${MAX_UNNUMBERED_ARTICLES}
          )
        `
      );
      discarded = overflow.changes;

      // 射影は必須。SELECT * にすると本文込みで数千件をメモリに載せることになり、
      // 「表示時ではなく保存時に並べる」というこの方式を選んだ理由そのものを潰す。
      // ORDER BY も必須。省略すると挿入順＝ワーカーの完了順になり、ネットワークが
      // 遅かったフィードが最上位を占有する既知バグを再現する。
      const rows = db.getAllSync<{ id: number; feed_id: string }>(
        `
          SELECT id, feed_id FROM articles
          WHERE display_order IS NULL
          ORDER BY published_at DESC, id DESC
          LIMIT ${MAX_UNNUMBERED_ARTICLES}
        `
      );
      if (rows.length === 0) return;

      // 基点は削除がすべて終わったあとのDBから読む
      const base =
        db.getFirstSync<{ m: number }>('SELECT COALESCE(MAX(display_order), 0) AS m FROM articles')
          ?.m ?? 0;

      // 同じサイトが連続して上位を占有しないよう、ここで一度だけ並べ替える。
      // 表示のたびに並べ替えると、記事をタップするたびに固まり、読んでいる最中に
      // 並びが変わる（過去に実機で発生）。
      const ordered = diversifyByFeed(rows.map((r) => ({ id: r.id, feedId: r.feed_id })));
      const total = ordered.length;

      // 5000件を db.runSync で回すと毎回SQLを解析し直すため、文を1つ用意して使い回す
      const statement = db.prepareSync('UPDATE articles SET display_order = ? WHERE id = ?');
      try {
        for (let i = 0; i < total; i++) {
          // 先頭ほど大きい番号（base + i にすると display_order DESC でバッチ内が逆順になる）
          statement.executeSync([base + (total - i), ordered[i].id]);
        }
      } finally {
        statement.finalizeSync();
      }
      numbered = total;
    });

    return { numbered, discarded };
  },

  /**
   * 未採番の記事をすべて削除する。バックアップ復元の開始時に呼ぶ。
   *
   * 「キャンセルした同期が残したものだけ」を選んで消すのではない。どの同期が
   * 作った行かを追跡する情報を持たせるのは、この設計が避けたい複雑化そのもの。
   * 未採番はまだ一度もホームに出ていないため、一律に捨ててよい。
   */
  async deleteUnnumbered(): Promise<number> {
    const db = openDatabase();
    const result = db.runSync('DELETE FROM articles WHERE display_order IS NULL');
    return result.changes;
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
   *
   * 並びは公開日時順のまま据え置く。この関数はバックアップ出力専用で
   * （ホームの★絞り込みは JS 側で処理している）、ユーザーに見える並びには
   * 影響しない。エクスポートの並びとしては公開日時順が自然。
   *
   * ※ 将来この関数をユーザー向けの一覧に使うなら、
   *    ORDER BY display_order DESC, id DESC に変更すること。
   *    そうしないとそこだけ旧仕様の並びになる。
   *
   * 未採番（display_order IS NULL）でも除外しない。エクスポートから記事が
   * 黙って落ちる方が害が大きいため。display_order は復元時の相対順の
   * 手掛かりとしてそのまま持ち出す。
   */
  async listStarred(): Promise<Article[]> {
    const db = openDatabase();

    const rows = db.getAllSync<ArticleRow>(
      `
        SELECT ${ARTICLE_COLUMNS}
        FROM articles
        WHERE is_starred = 1
        ORDER BY published_at DESC
      `
    );

    return rows.map(rowToArticle);
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