import { XMLParser } from 'fast-xml-parser';
import * as Encoding from 'encoding-japanese';

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

/**
 * エンコーディングを自動検出してテキストを取得
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    // バイナリとして取得
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // エンコーディングを検出
    const encoding = detectEncoding(bytes, url);
    console.log(`[RssService] URL: ${url}`);
    console.log(`[RssService] Detected encoding: ${encoding}`);

    // encoding-japaneseでデコード
    let text: string;
    if (encoding === 'shift_jis') {
      // Shift_JIS → Unicodeの配列に変換
      const unicodeArray = Encoding.convert(Array.from(bytes), {
        to: 'UNICODE',
        from: 'SJIS',
      });
      // Unicodeの配列 → 文字列
      text = Encoding.codeToString(unicodeArray);
      console.log(`[RssService] Decoded with Shift_JIS (encoding-japanese)`);
    } else {
      // UTF-8
      const decoder = new TextDecoder('utf-8');
      text = decoder.decode(bytes);
      console.log(`[RssService] Decoded with UTF-8`);
    }

    return text;
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

/**
 * エンコーディングを検出（シンプル版）
 */
function detectEncoding(bytes: Uint8Array, url: string): 'utf-8' | 'shift_jis' {
  // 1. ドメインベースの判定
  try {
    const domain = new URL(url).hostname;
    if (domain.endsWith('.go.jp')) {
      console.log(`[RssService] .go.jp domain detected, using Shift_JIS`);
      return 'shift_jis';
    }
  } catch (e) {
    // URL パースエラーは無視
  }

  // 2. UTF-8 BOMチェック
  if (bytes.length >= 3) {
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      console.log(`[RssService] UTF-8 BOM detected`);
      return 'utf-8';
    }
  }

  // 3. XML宣言をチェック
  try {
    const header = new TextDecoder('utf-8').decode(bytes.slice(0, 200));
    if (header.includes('encoding="Shift_JIS"') || header.includes("encoding='Shift_JIS'")) {
      return 'shift_jis';
    }
  } catch (e) {
    // デコードエラーは無視
  }

  // 4. デフォルト: UTF-8
  return 'utf-8';
}

function extractAtomLink(linkNode: unknown): string | undefined {
  if (typeof linkNode === 'string') return linkNode;

  const links = ensureArray(linkNode as unknown);
  for (const link of links) {
    if (typeof link === 'string') return link;
    if (typeof link === 'object' && link !== null) {
      const href = getText((link as Record<string, unknown>)['@_href']);
      if (href) return href;
    }
  }

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
  
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
  const match = html.match(imgRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return undefined;
}

export const RssService = {
  async fetchMeta(url: string): Promise<{ title: string; iconUrl?: string }> {
    const xml = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    const parsed = parser.parse(xml) as Record<string, unknown>;

    // RSS 1.0 (RDF) チェック
    const rdf = parsed['rdf:RDF'] as Record<string, unknown> | undefined;
    if (rdf) {
      const channel = rdf['channel'] as Record<string, unknown> | undefined;
      if (channel) {
        const title = getText(channel['title']);
        const image = channel['image'] as Record<string, unknown> | undefined;
        const iconUrl = image ? getText(image['url']) : undefined;
        if (!title) throw new Error('Failed to parse feed title (RSS 1.0)');
        return { title, iconUrl: iconUrl || undefined };
      }
    }

    // RSS 2.0 チェック
    const rss = parsed['rss'] as Record<string, unknown> | undefined;
    if (rss?.['channel']) {
      const channel = rss['channel'] as Record<string, unknown>;
      const title = getText(channel['title']);
      const image = channel['image'] as Record<string, unknown> | undefined;
      const iconUrl = image ? getText(image['url']) : undefined;
      if (!title) throw new Error('Failed to parse feed title (RSS 2.0)');
      return { title, iconUrl: iconUrl || undefined };
    }

    // Atom チェック
    const feed = parsed['feed'] as Record<string, unknown> | undefined;
    if (feed) {
      const title = getText(feed['title']);
      const iconUrl = extractAtomIconUrl(feed);
      if (!title) throw new Error('Failed to parse feed title (Atom)');
      return { title, iconUrl: iconUrl || undefined };
    }

    throw new Error('Unsupported feed format (not RSS 1.0, RSS 2.0 nor Atom)');
  },

  async fetchArticles(url: string): Promise<Article[]> {
    const xml = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    const parsed = parser.parse(xml) as Record<string, unknown>;

    const now = Date.now();
    let counter = 0;

    const makeId = (): string => {
      counter += 1;
      return `article_${now}_${Math.random()}_${counter}`;
    };

    // RSS 1.0 (RDF) チェック
    const rdf = parsed['rdf:RDF'] as Record<string, unknown> | undefined;
    if (rdf) {
      const items = ensureArray(rdf['item'] as unknown).slice(0, MAX_ARTICLES);

      const result: Article[] = [];
      for (const item of items) {
        if (typeof item !== 'object' || item === null) continue;
        const obj = item as Record<string, unknown>;

        const link = getText(obj['link']);
        if (!link) continue;

        const title = getText(obj['title']) ?? link;
        const summary = getText(obj['description']);
        
        const dcDate = getText(obj['dc:date']);
        const publishedAt = toIsoDateOrNow(dcDate);

        let thumbnailUrl: string | undefined;
        
        const enclosure = obj['enclosure'] as Record<string, unknown> | undefined;
        if (enclosure) {
          const type = getText(enclosure['@_type']);
          if (type && type.startsWith('image/')) {
            thumbnailUrl = getText(enclosure['@_url']);
          }
        }
        
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

    // RSS 2.0 チェック
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

        let thumbnailUrl: string | undefined;
        
        const mediaThumbnail = obj['media:thumbnail'] as Record<string, unknown> | undefined;
        if (mediaThumbnail) {
          thumbnailUrl = getText(mediaThumbnail['@_url']);
        }
        
        if (!thumbnailUrl) {
          const mediaContent = obj['media:content'] as Record<string, unknown> | undefined;
          if (mediaContent) {
            thumbnailUrl = getText(mediaContent['@_url']);
          }
        }
        
        if (!thumbnailUrl) {
          const enclosure = obj['enclosure'] as Record<string, unknown> | undefined;
          if (enclosure) {
            const type = getText(enclosure['@_type']);
            if (type && type.startsWith('image/')) {
              thumbnailUrl = getText(enclosure['@_url']);
            }
          }
        }
        
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

    // Atom チェック
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

        let thumbnailUrl: string | undefined;
        
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

    throw new Error('Unsupported feed format (not RSS 1.0, RSS 2.0 nor Atom)');
  },
};