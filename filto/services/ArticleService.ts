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
   */
  async saveArticles(
    feedId: string,
    feedName: string,
    articles: Article[]
  ): Promise<void> {
    if (articles.length === 0) return;

    // feedId と feedName を設定
    const articlesWithFeed = articles.map((article) => ({
      ...article,
      feedId,
      feedName,
    }));

    // 既存記事を取得（重複チェック用）
    const existingArticles = await ArticleRepository.listByFeed(feedId);
    const existingLinks = new Set(existingArticles.map((a) => a.link));

    // 重複を除外
    const newArticles = articlesWithFeed.filter(
      (article) => !existingLinks.has(article.link)
    );

    if (newArticles.length === 0) {
      return;
    }

    // 保存
    await ArticleRepository.insertMany(newArticles);
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
