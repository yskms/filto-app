import { XMLParser } from 'fast-xml-parser';

import { Article } from '@/types/Article';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_ARTICLES = 50;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function getText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const candidates = [obj['#text'], obj['text'], obj['__cdata']];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().length > 0) return c;
      if (typeof c === 'number') return String(c);
    }
  }

  return undefined;
}

function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function toIsoDateOrNow(dateLike: unknown): string {
  const text = getText(dateLike);
  if (!text) return new Date().toISOString();
  const ms = new Date(text).getTime();
  if (Number.isNaN(ms)) return new Date().toISOString();
  return new Date(ms).toISOString();
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('aborted') || message.toLowerCase().includes('abort')) {
      throw new Error('Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function extractAtomLink(linkNode: unknown): string | undefined {
  // entry.link can be: { "@_href": "..." } | [{ "@_href": "..." }, ...] | "..."
  if (typeof linkNode === 'string') return linkNode;

  const links = ensureArray(linkNode as unknown);
  for (const link of links) {
    if (typeof link === 'string') return link;
    if (typeof link === 'object' && link !== null) {
      const href = getText((link as Record<string, unknown>)['@_href']);
      if (href) return href;
    }
  }

  // fallback for odd shapes
  if (typeof linkNode === 'object' && linkNode !== null) {
    const href = getText((linkNode as Record<string, unknown>)['@_href']);
    if (href) return href;
    return getText(linkNode);
  }

  return undefined;
}

function extractAtomIconUrl(feedNode: Record<string, unknown>): string | undefined {
  const icon = getText(feedNode['icon']);
  if (icon) return icon;

  const logo = getText(feedNode['logo']);
  if (logo) return logo;

  const links = ensureArray(feedNode['link'] as unknown);
  for (const link of links) {
    if (typeof link !== 'object' || link === null) continue;
    const rel = getText((link as Record<string, unknown>)['@_rel'])?.toLowerCase();
    if (rel === 'icon' || rel === 'shortcut icon') {
      const href = getText((link as Record<string, unknown>)['@_href']);
      if (href) return href;
    }
  }

  return undefined;
}

function extractImageUrl(html: string | undefined): string | undefined {
  if (!html) return undefined;
  
  // <img src="..." /> を抽出
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
  const match = html.match(imgRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return undefined;
}

export const RssService = {
  /**
   * フィードURLからタイトルとアイコンURLを取得
   * - RSS 2.0 / Atom 対応
   * - タイムアウト: 10秒
   * - エラーはthrow（呼び出し側でcatch）
   */
  async fetchMeta(url: string): Promise<{ title: string; iconUrl?: string }> {
    const xml = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    const parsed = parser.parse(xml) as Record<string, unknown>;

    const rss = parsed['rss'] as Record<string, unknown> | undefined;
    if (rss?.['channel']) {
      const channel = rss['channel'] as Record<string, unknown>;
      const title = getText(channel['title']);
      const image = channel['image'] as Record<string, unknown> | undefined;
      const iconUrl = image ? getText(image['url']) : undefined;
      if (!title) throw new Error('Failed to parse feed title (RSS)');
      return { title, iconUrl: iconUrl || undefined };
    }

    const feed = parsed['feed'] as Record<string, unknown> | undefined;
    if (feed) {
      const title = getText(feed['title']);
      const iconUrl = extractAtomIconUrl(feed);
      if (!title) throw new Error('Failed to parse feed title (Atom)');
      return { title, iconUrl: iconUrl || undefined };
    }

    throw new Error('Unsupported feed format (not RSS 2.0 nor Atom)');
  },

  /**
   * フィードURLから記事一覧を取得
   * - RSS 2.0 / Atom 対応
   * - 最大50件
   * - published_atがない場合は現在時刻
   * - エラーはthrow（呼び出し側でcatch）
   */
  async fetchArticles(url: string): Promise<Article[]> {
    const xml = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    const parsed = parser.parse(xml) as Record<string, unknown>;

    const now = Date.now();
    let counter = 0;

    const makeId = (): string => {
      counter += 1;
      return `article_${now}_${Math.random()}_${counter}`;
    };

    const rss = parsed['rss'] as Record<string, unknown> | undefined;
    if (rss?.['channel']) {
      const channel = rss['channel'] as Record<string, unknown>;
      const items = ensureArray(channel['item'] as unknown).slice(0, MAX_ARTICLES);

      const result: Article[] = [];
      for (const item of items) {
        if (typeof item !== 'object' || item === null) continue;
        const obj = item as Record<string, unknown>;

        const link = getText(obj['link']);
        if (!link) continue;

        const title = getText(obj['title']) ?? link;
        const summary = getText(obj['description']);
        const publishedAt = toIsoDateOrNow(obj['pubDate']);

        // サムネイル取得
        let thumbnailUrl: string | undefined;
        
        // 1. media:thumbnail
        const mediaThumbnail = obj['media:thumbnail'] as Record<string, unknown> | undefined;
        if (mediaThumbnail) {
          thumbnailUrl = getText(mediaThumbnail['@_url']);
        }
        
        // 2. media:content
        if (!thumbnailUrl) {
          const mediaContent = obj['media:content'] as Record<string, unknown> | undefined;
          if (mediaContent) {
            thumbnailUrl = getText(mediaContent['@_url']);
          }
        }
        
        // 3. enclosure (type が image/* の場合のみ)
        if (!thumbnailUrl) {
          const enclosure = obj['enclosure'] as Record<string, unknown> | undefined;
          if (enclosure) {
            const type = getText(enclosure['@_type']);
            if (type && type.startsWith('image/')) {
              thumbnailUrl = getText(enclosure['@_url']);
            }
          }
        }
        
        // 4. description から img タグを抽出
        if (!thumbnailUrl && summary) {
          thumbnailUrl = extractImageUrl(summary);
        }

        result.push({
          id: makeId(),
          feedId: '',
          feedName: '',
          title,
          link,
          summary: summary || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          publishedAt,
          isRead: false,
        });
      }

      return result;
    }

    const feed = parsed['feed'] as Record<string, unknown> | undefined;
    if (feed) {
      const entries = ensureArray(feed['entry'] as unknown).slice(0, MAX_ARTICLES);

      const result: Article[] = [];
      for (const entry of entries) {
        if (typeof entry !== 'object' || entry === null) continue;
        const obj = entry as Record<string, unknown>;

        const link = extractAtomLink(obj['link']);
        if (!link) continue;

        const title = getText(obj['title']) ?? link;
        const summary = getText(obj['summary']) ?? getText(obj['content']);
        const publishedAt = toIsoDateOrNow(obj['published'] ?? obj['updated']);

        // サムネイル取得
        let thumbnailUrl: string | undefined;
        
        // 1. link で rel="enclosure" かつ type が image/*
        const links = ensureArray(obj['link'] as unknown);
        for (const linkNode of links) {
          if (typeof linkNode !== 'object' || linkNode === null) continue;
          const linkObj = linkNode as Record<string, unknown>;
          
          const rel = getText(linkObj['@_rel'])?.toLowerCase();
          const type = getText(linkObj['@_type']);
          
          if (rel === 'enclosure' && type && type.startsWith('image/')) {
            thumbnailUrl = getText(linkObj['@_href']);
            break;
          }
        }
        
        // 2. content/summary から img タグを抽出
        if (!thumbnailUrl && summary) {
          thumbnailUrl = extractImageUrl(summary);
        }

        result.push({
          id: makeId(),
          feedId: '',
          feedName: '',
          title,
          link,
          summary: summary || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          publishedAt,
          isRead: false,
        });
      }

      return result;
    }

    throw new Error('Unsupported feed format (not RSS 2.0 nor Atom)');
  },
};

