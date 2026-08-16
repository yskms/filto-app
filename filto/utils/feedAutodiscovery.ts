/**
 * RSS Autodiscovery: HTMLの<head>からフィードURL候補を抽出する。
 *
 * スクレイピングではない: 本文・記事コンテンツは一切読まず、サイトが自ら
 * 「フィードはここにある」と公開している <link rel="alternate"> の href のみを拾う。
 * ユーザーがURLを入力して実行したときだけ動く（巡回・定期クロールはしない）。
 *
 * 設計: docs/04_detail_design/services/FeedAutodiscovery.md
 */
import { isValidFeedUrl } from '@/utils/feedUrl';

export type FeedCandidate = {
  url: string;
  title?: string;
  type: 'rss' | 'atom';
  /** WordPress等のコメントフィード。除外はしないが選択UIで区別できるよう立てる */
  isComment?: boolean;
};

const MAX_CANDIDATES = 10;
const MAX_SCAN_BYTES = 100_000;

/** 属性値に現れる代表的なHTMLエンティティを復元する（href の &amp; → & が主目的）。 */
function decodeAttrEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/g, '&')
    .replace(/&#x26;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'");
}

/** 単一タグ文字列から属性を回収する（属性順・引用符種別は任意、名前は小文字化）。 */
function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag)) !== null) {
    const name = m[1].toLowerCase();
    const raw = m[3] ?? m[4] ?? m[5] ?? '';
    // 最初に現れた属性を採用（重複属性はHTML仕様でも先勝ち）
    if (!(name in attrs)) attrs[name] = decodeAttrEntities(raw);
  }
  return attrs;
}

/**
 * WordPress等が本体フィードと一緒に出す「コメントフィード」かどうか。
 * タイトル/rel/hrefパスの3点で判定する（テーマが日本語だとタイトル/relで漏れるため
 * href のパス判定が最も確実 — 設計§7）。
 */
function isCommentFeed(url: string, title: string | undefined, rel: string): boolean {
  const t = (title || '').toLowerCase();
  if (t.includes('comment') || t.includes('コメント')) return true;
  if (rel.split(/\s+/).includes('comments')) return true;
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (path.includes('/comments/feed') || path.includes('/comments/default')) return true;
  } catch {
    // 絶対化済みのはずだが念のため
  }
  return false;
}

/**
 * HTMLから <link rel="alternate" type="application/(rss|atom|rdf)+xml"> を抽出する。
 *
 * @param html   取得したHTML本文（呼び出し側で先頭200KB等に切り詰め済みでよい）
 * @param baseUrl 相対href解決の基準。**リダイレクト後のfinalUrl**を渡すこと
 *                （入力URLだと example.com → www.example.com/ja/ 後に相対が壊れる）
 * @returns フィード候補（コメントフィードは末尾に回す・最大10件）
 */
export function extractFeedLinks(html: string, baseUrl: string): FeedCandidate[] {
  // 走査範囲は </head> まで。無ければ先頭100KBで打ち切る（巨大ページ対策）。
  const headEnd = html.toLowerCase().indexOf('</head>');
  const region = html.slice(0, headEnd >= 0 ? headEnd : Math.min(html.length, MAX_SCAN_BYTES));

  // 相対URLの基準: <base href> があればそれを優先（HTML仕様）。無ければ finalUrl。
  let resolveBase = baseUrl;
  const baseTag = region.match(/<base\s+[^>]*>/i);
  if (baseTag) {
    const bhref = parseAttrs(baseTag[0]).href;
    if (bhref) {
      try {
        resolveBase = new URL(bhref, baseUrl).href;
      } catch {
        // 壊れた<base>は無視して finalUrl を使う
      }
    }
  }

  const main: FeedCandidate[] = [];
  const comments: FeedCandidate[] = [];
  const seen = new Set<string>();

  const linkRe = /<link\s+[^>]*>/gi;
  let tag: RegExpExecArray | null;
  while ((tag = linkRe.exec(region)) !== null) {
    if (main.length + comments.length >= MAX_CANDIDATES) break;

    const attrs = parseAttrs(tag[0]);
    const rel = (attrs.rel || '').toLowerCase();
    // rel="alternate stylesheet" のような複合値に注意（空白区切りトークンで判定）
    if (!rel.split(/\s+/).includes('alternate')) continue;

    const type = (attrs.type || '').toLowerCase().trim();
    let feedType: 'rss' | 'atom' | null = null;
    if (type === 'application/rss+xml' || type === 'application/rdf+xml') feedType = 'rss';
    else if (type === 'application/atom+xml') feedType = 'atom';
    else continue;

    const href = attrs.href;
    if (!href) continue;

    let abs: string;
    try {
      abs = new URL(href, resolveBase).href;
    } catch {
      continue;
    }
    if (!isValidFeedUrl(abs)) continue; // http/https以外を弾く
    if (seen.has(abs)) continue;
    seen.add(abs);

    const title = attrs.title?.trim() || undefined;
    if (isCommentFeed(abs, title, rel)) {
      comments.push({ url: abs, title, type: feedType, isComment: true });
    } else {
      main.push({ url: abs, title, type: feedType });
    }
  }

  // コメントフィードは除外せず末尾へ（購読したい人もいるため選択UIには残す）
  return [...main, ...comments];
}
