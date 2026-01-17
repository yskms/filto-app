import { XMLParser } from 'fast-xml-parser';
import * as Encoding from 'encoding-japanese';

import { Article } from '@/types/Article';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_ARTICLES = 50;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,  // 数値文字参照（&#x306F;など）を自動デコード
  htmlEntities: true,     // HTMLエンティティ（&lt;など）も自動デコード
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
    console.log(`[RssService] Fetching URL: ${url}`);
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://journal.meti.go.jp/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });
    
    console.log(`[RssService] Response status: ${response.status} ${response.statusText}`);
    console.log(`[RssService] Response URL: ${response.url}`);
    console.log(`[RssService] Response headers:`, {
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length'),
      'location': response.headers.get('location'),
    });
    
    // 202 Accepted の場合は再試行
    if (response.status === 202) {
      console.log(`[RssService] Got 202 Accepted, waiting 2 seconds and retrying...`);
      clearTimeout(timer);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 再試行
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), timeoutMs);
      
      try {
        const response2 = await fetch(url, {
          signal: controller2.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://journal.meti.go.jp/',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
        
        console.log(`[RssService] Retry response status: ${response2.status}`);
        
        if (!response2.ok) {
          throw new Error(`HTTP error on retry: ${response2.status} ${response2.statusText}`);
        }
        
        const arrayBuffer2 = await response2.arrayBuffer();
        console.log(`[RssService] Retry ArrayBuffer size: ${arrayBuffer2.byteLength}`);
        
        if (arrayBuffer2.byteLength === 0) {
          throw new Error('Empty response even after retry');
        }
        
        const bytes2 = new Uint8Array(arrayBuffer2);
        const encoding2 = detectEncoding(bytes2, url);
        
        let text2: string;
        if (encoding2 === 'shift_jis') {
          const unicodeArray = Encoding.convert(Array.from(bytes2), {
            to: 'UNICODE',
            from: 'SJIS',
          });
          text2 = Encoding.codeToString(unicodeArray);
        } else if (encoding2 === 'euc-jp') {
          const unicodeArray = Encoding.convert(Array.from(bytes2), {
            to: 'UNICODE',
            from: 'EUCJP',
          });
          text2 = Encoding.codeToString(unicodeArray);
        } else {
          const decoder = new TextDecoder('utf-8');
          text2 = decoder.decode(bytes2);
        }
        
        console.log(`[RssService] Retry text length: ${text2.length}`);
        return text2;
      } finally {
        clearTimeout(timer2);
      }
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    // バイナリとして取得
    const arrayBuffer = await response.arrayBuffer();
    console.log(`[RssService] ArrayBuffer size: ${arrayBuffer.byteLength}`);
    
    // ArrayBufferが空の場合、text()メソッドで再試行
    if (arrayBuffer.byteLength === 0) {
      console.log(`[RssService] ArrayBuffer is empty, trying text() method`);
      
      // 再度fetchを実行
      const response2 = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
      });
      
      const text = await response2.text();
      console.log(`[RssService] Text length from text() method: ${text.length}`);
      console.log(`[RssService] First 200 chars:`, text.substring(0, 200));
      return text;
    }
    
    const bytes = new Uint8Array(arrayBuffer);
    console.log(`[RssService] Bytes length: ${bytes.length}`);
    console.log(`[RssService] First 100 bytes:`, Array.from(bytes.slice(0, 100)));

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
      console.log(`[RssService] Unicode array length: ${unicodeArray.length}`);
      // Unicodeの配列 → 文字列
      text = Encoding.codeToString(unicodeArray);
      console.log(`[RssService] Decoded with Shift_JIS, text length: ${text.length}`);
    } else if (encoding === 'euc-jp') {
      // EUC-JP → Unicodeの配列に変換
      const unicodeArray = Encoding.convert(Array.from(bytes), {
        to: 'UNICODE',
        from: 'EUCJP',
      });
      console.log(`[RssService] Unicode array length: ${unicodeArray.length}`);
      // Unicodeの配列 → 文字列
      text = Encoding.codeToString(unicodeArray);
      console.log(`[RssService] Decoded with EUC-JP, text length: ${text.length}`);
    } else {
      // UTF-8
      const decoder = new TextDecoder('utf-8');
      text = decoder.decode(bytes);
      console.log(`[RssService] Decoded with UTF-8, text length: ${text.length}`);
    }
    
    console.log(`[RssService] Final text first 200 chars:`, text.substring(0, 200));

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
 * エンコーディングを検出（改善版）
 * 優先順位: BOM > XML宣言 > ドメインベース > デフォルト(UTF-8)
 */
function detectEncoding(bytes: Uint8Array, url: string): 'utf-8' | 'shift_jis' | 'euc-jp' {
  console.log(`[RssService] detectEncoding called for URL: ${url}`);
  
  // 1. UTF-8 BOMチェック（最優先）
  if (bytes.length >= 3) {
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      console.log(`[RssService] UTF-8 BOM detected`);
      return 'utf-8';
    }
  }

  // 2. XML宣言をチェック（BOMの次に優先）
  // 複数のエンコーディングで試す
  const encodingsToTry: Array<'utf-8' | 'shift_jis' | 'euc-jp'> = ['utf-8', 'shift_jis', 'euc-jp'];
  
  for (const encoding of encodingsToTry) {
    try {
      let header: string;
      
      if (encoding === 'utf-8') {
        const decoder = new TextDecoder('utf-8');
        header = decoder.decode(bytes.slice(0, 500));
      } else if (encoding === 'shift_jis') {
        const unicodeArray = Encoding.convert(Array.from(bytes.slice(0, 500)), {
          to: 'UNICODE',
          from: 'SJIS',
        });
        header = Encoding.codeToString(unicodeArray);
      } else {
        const unicodeArray = Encoding.convert(Array.from(bytes.slice(0, 500)), {
          to: 'UNICODE',
          from: 'EUCJP',
        });
        header = Encoding.codeToString(unicodeArray);
      }
      
      // XML宣言が含まれているかチェック
      if (!header || !header.includes('<?xml')) {
        continue;
      }
      
      console.log(`[RssService] XML header (first 100 chars, tried ${encoding}):`, header.substring(0, 100));
      
      // encoding属性を大文字小文字を区別せずチェック
      const encodingMatch = header.match(/encoding=["']([^"']+)["']/i);
      if (encodingMatch) {
        const declaredEncoding = encodingMatch[1].toLowerCase();
        console.log(`[RssService] XML declaration encoding: ${declaredEncoding}`);
        
        if (declaredEncoding.includes('shift') || declaredEncoding.includes('sjis')) {
          console.log(`[RssService] Using Shift_JIS (from XML declaration)`);
          return 'shift_jis';
        }
        
        if (declaredEncoding.includes('euc')) {
          console.log(`[RssService] Using EUC-JP (from XML declaration)`);
          return 'euc-jp';
        }
        
        if (declaredEncoding.includes('utf-8') || declaredEncoding.includes('utf8')) {
          console.log(`[RssService] Using UTF-8 (from XML declaration)`);
          return 'utf-8';
        }
      }
      
      // XML宣言が読めた場合、そのエンコーディングを使用
      // （encoding属性がない場合）
      if (header.includes('<?xml')) {
        console.log(`[RssService] XML declaration found with ${encoding}, using it`);
        return encoding;
      }
    } catch (e) {
      // デコードエラーは無視して次のエンコーディングを試す
      continue;
    }
  }

  // 3. ドメインベースの判定（フォールバック）
  try {
    const domain = new URL(url).hostname;
    console.log(`[RssService] Domain: ${domain}`);
    
    // はてなブックマーク（EUC-JP）
    if (domain.includes('hatena.ne.jp') || domain.includes('b.hatena.ne.jp')) {
      console.log(`[RssService] hatena.ne.jp domain detected, using EUC-JP`);
      return 'euc-jp';
    }
    
    // 政府系サイトは基本的にUTF-8を優先（最近のサイトはUTF-8が多い）
    if (domain.endsWith('.go.jp')) {
      console.log(`[RssService] .go.jp domain detected, using UTF-8 (modern default)`);
      return 'utf-8';
    }
  } catch (e) {
    console.log(`[RssService] URL parse error:`, e);
    // URL パースエラーは無視
  }

  // 4. デフォルト: UTF-8
  console.log(`[RssService] No specific encoding detected, using UTF-8 as default`);
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
    try {
      console.log(`[RssService] fetchMeta: ${url}`);
      const xml = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      console.log(`[RssService] XML fetched, length: ${xml.length}`);
      
      const parsed = parser.parse(xml) as Record<string, unknown>;
      console.log(`[RssService] XML parsed successfully`);
      console.log(`[RssService] Parsed top-level keys:`, Object.keys(parsed));
      console.log(`[RssService] XML first 500 chars:`, xml.substring(0, 500));

      // RSS 1.0 (RDF) チェック
      const rdf = parsed['rdf:RDF'] as Record<string, unknown> | undefined;
      console.log(`[RssService] rdf:RDF exists:`, !!rdf);
      if (rdf) {
        const channel = rdf['channel'] as Record<string, unknown> | undefined;
        if (channel) {
          const title = getText(channel['title']);
          const image = channel['image'] as Record<string, unknown> | undefined;
          const iconUrl = image ? getText(image['url']) : undefined;
          if (!title) throw new Error('Failed to parse feed title (RSS 1.0)');
          console.log(`[RssService] RSS 1.0 detected: ${title}`);
          return { title, iconUrl: iconUrl || undefined };
        }
      }

      // RSS 2.0 チェック
      const rss = parsed['rss'] as Record<string, unknown> | undefined;
      console.log(`[RssService] rss exists:`, !!rss);
      if (rss) {
        console.log(`[RssService] rss keys:`, Object.keys(rss));
        console.log(`[RssService] rss.channel exists:`, !!rss['channel']);
      }
      if (rss?.['channel']) {
        const channel = rss['channel'] as Record<string, unknown>;
        const title = getText(channel['title']);
        const image = channel['image'] as Record<string, unknown> | undefined;
        const iconUrl = image ? getText(image['url']) : undefined;
        if (!title) throw new Error('Failed to parse feed title (RSS 2.0)');
        console.log(`[RssService] RSS 2.0 detected: ${title}`);
        return { title, iconUrl: iconUrl || undefined };
      }

      // Atom チェック
      const feed = parsed['feed'] as Record<string, unknown> | undefined;
      if (feed) {
        const title = getText(feed['title']);
        const iconUrl = extractAtomIconUrl(feed);
        if (!title) throw new Error('Failed to parse feed title (Atom)');
        console.log(`[RssService] Atom detected: ${title}`);
        return { title, iconUrl: iconUrl || undefined };
      }

      throw new Error('Unsupported feed format (not RSS 1.0, RSS 2.0 nor Atom)');
    } catch (error) {
      console.error(`[RssService] fetchMeta error for ${url}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch feed: ${error.message}`);
      }
      throw error;
    }
  },

  async fetchArticles(url: string): Promise<Article[]> {
    try {
      console.log(`[RssService] fetchArticles: ${url}`);
      const xml = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      console.log(`[RssService] XML fetched, length: ${xml.length}`);
      
      const parsed = parser.parse(xml) as Record<string, unknown>;
      console.log(`[RssService] XML parsed successfully`);

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
        console.log(`[RssService] RSS 1.0 format, ${items.length} items`);

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

        console.log(`[RssService] Parsed ${result.length} articles from RSS 1.0`);
        return result;
      }

      // RSS 2.0 チェック
      const rss = parsed['rss'] as Record<string, unknown> | undefined;
      if (rss?.['channel']) {
        const channel = rss['channel'] as Record<string, unknown>;
        const items = ensureArray(channel['item'] as unknown).slice(0, MAX_ARTICLES);
        console.log(`[RssService] RSS 2.0 format, ${items.length} items`);

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

        console.log(`[RssService] Parsed ${result.length} articles from RSS 2.0`);
        return result;
      }

      // Atom チェック
      const feed = parsed['feed'] as Record<string, unknown> | undefined;
      if (feed) {
        const entries = ensureArray(feed['entry'] as unknown).slice(0, MAX_ARTICLES);
        console.log(`[RssService] Atom format, ${entries.length} entries`);

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

        console.log(`[RssService] Parsed ${result.length} articles from Atom`);
        return result;
      }

      throw new Error('Unsupported feed format (not RSS 1.0, RSS 2.0 nor Atom)');
    } catch (error) {
      console.error(`[RssService] fetchArticles error for ${url}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch articles: ${error.message}`);
      }
      throw error;
    }
  },
};