/**
 * フィードURLに関するユーティリティ
 */

/**
 * フィードとして受け付けられるURLかどうか。
 * http / https 以外（javascript: や相対パスなど）を弾く。
 *
 * OPMLインポートのように外部ファイル由来のURLを登録する経路では、
 * 手動追加（feed_add）と同じ基準で検証しないと、同期のたびに失敗し続ける
 * 壊れたフィードが永続化されてしまう。
 */
export function isValidFeedUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * ファビコンAPIでフォールバック画像のURLを生成する。
 * 解析できないURLの場合は空文字を返す。
 */
export function getFaviconUrl(feedUrl: string): string {
  try {
    let domain = new URL(feedUrl).hostname;
    // feeds./feed. はRSS配信専用サブドメインでGoogleのファビコンDBに未登録のケースがあるため除去する
    if (domain.startsWith('feeds.')) domain = domain.slice('feeds.'.length);
    else if (domain.startsWith('feed.')) domain = domain.slice('feed.'.length);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
  } catch {
    return '';
  }
}
