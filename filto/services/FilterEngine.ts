import { Filter } from './FilterService';
import { Article } from '@/types/Article';

/**
 * FilterEngine
 * 記事がフィルタ条件に一致するかを評価する純粋ロジック
 */
export const FilterEngine = {
  /**
   * 記事がブロックされるべきかを判定
   * @param article - 評価対象の記事
   * @param filters - 適用するフィルタ一覧
   * @param globalAllowKeywords - グローバル許可キーワード（最優先）
   * @returns true = ブロック、false = 表示
   */
  evaluate(
    article: Article,
    filters: Filter[],
    globalAllowKeywords: string[] = []
  ): boolean {
    // Step 1: グローバル許可リスト（最優先）
    if (globalAllowKeywords.length > 0) {
      const text = `${article.title} ${article.summary || ''}`.toLowerCase();
      for (const keyword of globalAllowKeywords) {
        if (text.includes(keyword.toLowerCase())) {
          return false; // 無条件で許可
        }
      }
    }

    // Step 2: 通常フィルタ評価
    for (const filter of filters) {
      // 対象テキストを取得
      const targetText = this.getTargetText(article, filter);
      
      // ブロックキーワードチェック
      if (targetText.includes(filter.block_keyword.toLowerCase())) {
        // 許可キーワードチェック
        if (filter.allow_keyword) {
          const allowKeywords = filter.allow_keyword
            .split(',')
            .map(k => k.trim().toLowerCase())
            .filter(k => k.length > 0);
          
          const hasAllowKeyword = allowKeywords.some(kw => 
            targetText.includes(kw)
          );
          
          if (hasAllowKeyword) {
            continue; // 例外として許可
          }
        }
        
        return true; // ブロック
      }
    }

    return false; // どのフィルタにも一致しない → 表示
  },

  /**
   * フィルタの対象範囲に応じてテキストを取得
   * @param article - 記事
   * @param filter - フィルタ
   * @returns 対象テキスト（小文字）
   */
  getTargetText(article: Article, filter: Filter): string {
    let text = '';
    
    if (filter.target_title === 1) {
      text += article.title;
    }
    
    if (filter.target_description === 1 && article.summary) {
      text += ' ' + article.summary;
    }
    
    return text.toLowerCase();
  },
};

