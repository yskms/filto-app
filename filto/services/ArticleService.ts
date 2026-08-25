import { ArticleRepository } from '@/repositories/ArticleRepository';
import { Article } from '@/types/Article';

/**
 * ArticleService
 * 記事データ取得・保存のビジネスロジック
 */
export const ArticleService = {
  /**
   * 記事一覧を取得
   * @param feedId フィードID（省略時は全件）
   */
  async getArticles(feedId?: string): Promise<Article[]> {
    if (feedId) {
      return await ArticleRepository.listByFeed(feedId);
    } else {
      return await ArticleRepository.listAll();
    }
  },

  /**
   * 記事を保存（重複チェック付き）
   * @param feedId フィードID
   * @param feedName フィード名
   * @param articles 保存する記事リスト
   * @param fetchedAt 挿入時刻（未指定なら現在時刻）。複数フィードを同期する側は、
   *   フィードごとにバラバラの時刻にならないよう、同期開始時点の共通の時刻を渡すこと
   */
  async saveArticles(
    feedId: string,
    feedName: string,
    articles: Article[],
    fetchedAt?: number
  ): Promise<number> {
    if (articles.length === 0) return 0;

    // feedId と feedName を設定
    const articlesWithFeed = articles.map((article) => ({
      ...article,
      feedId,
      feedName,
    }));

    // 重複は UNIQUE(feed_id, link) により INSERT OR IGNORE が弾く。
    // insertMany は実際に挿入された件数を返すため、事前の重複チェック
    //（全記事のロード）は不要。新規挿入件数をそのまま返す。
    return ArticleRepository.insertMany(articlesWithFeed, fetchedAt);
  },

  /**
   * 記事を既読にする
   * @param id 記事ID
   */
  async markRead(id: string): Promise<void> {
    await ArticleRepository.markRead(id);
  },

  /**
   * 記事の手動非表示フラグを設定する（スワイプで非表示 / 復元）
   */
  async setHidden(id: string, hidden: boolean): Promise<void> {
    await ArticleRepository.setHidden(id, hidden);
  },

  /**
   * 非表示中の記事IDを取得する
   */
  async getHiddenIds(): Promise<string[]> {
    return await ArticleRepository.getHiddenIds();
  },

  /**
   * フィード毎の既読統計を取得する（整理のシグナル用）
   */
  async getReadStatsByFeed(): Promise<Map<string, { total: number; read: number }>> {
    return await ArticleRepository.getReadStatsByFeed();
  },
};
