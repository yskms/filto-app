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
 * ファビコンAPIでフォールバック画像を生成
 */
function getFaviconUrl(feedUrl: string): string {
  try {
    const domain = new URL(feedUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
  } catch {
    return '';
  }
}

/**
 * RSS 1.0 (RDF) のアイコンURL抽出
 */
function extractRss1IconUrl(channel: Record<string, unknown>, feedUrl: string): string | undefined {
  // 1. <webfeeds:icon> を確認
  const webfeedsIcon = getText(channel['webfeeds:icon']);
  if (webfeedsIcon) {
    console.log(`[RssService] Found RSS 1.0 feed icon from <webfeeds:icon>: ${webfeedsIcon}`);
    return webfeedsIcon;
  }

  // 2. <webfeeds:logo> を確認
  const webfeedsLogo = getText(channel['webfeeds:logo']);
  if (webfeedsLogo) {
    console.log(`[RssService] Found RSS 1.0 feed icon from <webfeeds:logo>: ${webfeedsLogo}`);
    return webfeedsLogo;
  }

  // 3. <image><url> を確認
  const image = channel['image'] as Record<string, unknown> | undefined;
  if (image) {
    const url = getText(image['url']);
    if (url) {
      console.log(`[RssService] Found RSS 1.0 feed icon from <image>: ${url}`);
      return url;
    }
  }
  
  // 4. ファビコンAPIをフォールバック
  const faviconUrl = getFaviconUrl(feedUrl);
  console.log(`[RssService] Using favicon API as fallback: ${faviconUrl}`);
  return faviconUrl || undefined;
}

/**
 * RSS 2.0 のアイコンURL抽出
 */
function extractRss2IconUrl(channel: Record<string, unknown>, feedUrl: string): string | undefined {
  // 1. <webfeeds:icon> を確認（note.comなど）
  const webfeedsIcon = getText(channel['webfeeds:icon']);
  if (webfeedsIcon) {
    console.log(`[RssService] Found RSS 2.0 feed icon from <webfeeds:icon>: ${webfeedsIcon}`);
    return webfeedsIcon;
  }

  // 2. <webfeeds:logo> を確認
  const webfeedsLogo = getText(channel['webfeeds:logo']);
  if (webfeedsLogo) {
    console.log(`[RssService] Found RSS 2.0 feed icon from <webfeeds:logo>: ${webfeedsLogo}`);
    return webfeedsLogo;
  }

  // 3. <image><url> を確認
  const image = channel['image'] as Record<string, unknown> | undefined;
  if (image) {
    const url = getText(image['url']);
    if (url) {
      console.log(`[RssService] Found RSS 2.0 feed icon from <image>: ${url}`);
      return url;
    }
  }
  
  // 4. ファビコンAPIをフォールバック
  const faviconUrl = getFaviconUrl(feedUrl);
  console.log(`[RssService] Using favicon API as fallback: ${faviconUrl}`);
  return faviconUrl || undefined;
}

/**
 * Atom のアイコンURL抽出
 */
function extractAtomIconUrl(feedNode: Record<string, unknown>, feedUrl: string): string | undefined {
  // 1. <webfeeds:icon> を確認（Qiitaなど）
  const webfeedsIcon = getText(feedNode['webfeeds:icon']);
  if (webfeedsIcon) {
    console.log(`[RssService] Found Atom feed icon from <webfeeds:icon>: ${webfeedsIcon}`);
    return webfeedsIcon;
  }

  // 2. <webfeeds:logo> を確認
  const webfeedsLogo = getText(feedNode['webfeeds:logo']);
  if (webfeedsLogo) {
    console.log(`[RssService] Found Atom feed icon from <webfeeds:logo>: ${webfeedsLogo}`);
    return webfeedsLogo;
  }

  // 3. <icon> を確認
  const icon = getText(feedNode['icon']);
  if (icon) {
    console.log(`[RssService] Found Atom feed icon from <icon>: ${icon}`);
    return icon;
  }

  // 4. <logo> を確認
  const logo = getText(feedNode['logo']);
  if (logo) {
    console.log(`[RssService] Found Atom feed icon from <logo>: ${logo}`);
    return logo;
  }

  // 5. <link rel="icon"> を確認
  const links = ensureArray(feedNode['link'] as unknown);
  for (const link of links) {
    if (typeof link !== 'object' || link === null) continue;
    const rel = getText((link as Record<string, unknown>)['@_rel'])?.toLowerCase();
    if (rel === 'icon' || rel === 'shortcut icon') {
      const href = getText((link as Record<string, unknown>)['@_href']);
      if (href) {
        console.log(`[RssService] Found Atom feed icon from <link rel="icon">: ${href}`);
        return href;
      }
    }
  }
  
  // 6. ファビコンAPIをフォールバック
  const faviconUrl = getFaviconUrl(feedUrl);
  console.log(`[RssService] Using favicon API as fallback: ${faviconUrl}`);
  return faviconUrl || undefined;
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

function extractImageUrl(html: string | undefined): string | undefined {
  if (!html) return undefined;
  
  // 1. 一般的な<img>タグからsrcを抽出
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
  const match = html.match(imgRegex);
  
  if (match && match[1]) {
    // 相対URLは無視（完全なURLのみ）
    if (match[1].startsWith('http://') || match[1].startsWith('https://')) {
      console.log(`[RssService] Found image in src:`, match[1].substring(0, 100));
      return match[1];
    }
  }
  
  // 2. data-srcやsrcsetなども試す（Lazy loading対応）
  const dataSrcRegex = /<img[^>]+data-src=["']([^"']+)["']/i;
  const dataSrcMatch = html.match(dataSrcRegex);
  
  if (dataSrcMatch && dataSrcMatch[1]) {
    if (dataSrcMatch[1].startsWith('http://') || dataSrcMatch[1].startsWith('https://')) {
      console.log(`[RssService] Found image in data-src:`, dataSrcMatch[1].substring(0, 100));
      return dataSrcMatch[1];
    }
  }
  
  // 3. srcsetから最初の画像を抽出
  const srcsetRegex = /<img[^>]+srcset=["']([^"']+)["']/i;
  const srcsetMatch = html.match(srcsetRegex);
  
  if (srcsetMatch && srcsetMatch[1]) {
    // srcsetは "url1 1024w, url2 768w" の形式
    const firstUrl = srcsetMatch[1].split(',')[0].trim().split(' ')[0];
    if (firstUrl.startsWith('http://') || firstUrl.startsWith('https://')) {
      console.log(`[RssService] Found image in srcset:`, firstUrl.substring(0, 100));
      return firstUrl;
    }
  }
  
  console.log(`[RssService] No image found in HTML content`);
  return undefined;
}

/**
 * サイト固有のサムネイルURL生成
 * 一部のサイトはRSSに画像を含めないため、URLから推測
 * 
 * 使い方: USE_SITE_SPECIFIC_THUMBNAILS を true に変更すると有効化されます
 */
function generateThumbnailFromUrl(link: string): string | undefined {
  // フラグで制御: true にするとサイト固有のサムネイルを使用
  const USE_SITE_SPECIFIC_THUMBNAILS = false;
  
  if (!USE_SITE_SPECIFIC_THUMBNAILS) {
    return undefined;
  }
  
  try {
    const url = new URL(link);
    
    // Qiita: OGP画像風のサムネイルを使用
    if (url.hostname === 'qiita.com') {
      const match = link.match(/\/items\/([a-f0-9]+)/);
      if (match) {
        // Qiitaのデフォルト記事画像を使用（ファビコンより大きい）
        return `https://cdn.qiita.com/assets/qiita-fb-2887e7b4aad86fd8c25cea84846f2236.png`;
      }
    }
    
    // 総務省: 政府系サイトのロゴ画像を使用
    if (url.hostname === 'www.soumu.go.jp') {
      // 総務省のロゴ画像（公式サイトより）
      return `https://www.soumu.go.jp/main_content/000269738.jpg`;
    }
    
    // 他のサイトを追加する場合はここに記述
    // if (url.hostname === 'example.com') {
    //   return `https://example.com/default-image.jpg`;
    // }
    
    return undefined;
  } catch (e) {
    return undefined;
  }
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
          const iconUrl = extractRss1IconUrl(channel, url);
          if (!title) throw new Error('Failed to parse feed title (RSS 1.0)');
          console.log(`[RssService] RSS 1.0 detected: ${title}`);
          return { title, iconUrl };
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
        const iconUrl = extractRss2IconUrl(channel, url);
        if (!title) throw new Error('Failed to parse feed title (RSS 2.0)');
        console.log(`[RssService] RSS 2.0 detected: ${title}`);
        return { title, iconUrl };
      }

      // Atom チェック
      const feed = parsed['feed'] as Record<string, unknown> | undefined;
      if (feed) {
        const title = getText(feed['title']);
        const iconUrl = extractAtomIconUrl(feed, url);
        if (!title) throw new Error('Failed to parse feed title (Atom)');
        console.log(`[RssService] Atom detected: ${title}`);
        return { title, iconUrl };
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

  async fetchArticles(url: string, feedIconUrl?: string): Promise<Article[]> {
    try {
      console.log(`[RssService] fetchArticles: ${url}`);
      console.log(`[RssService] Feed icon URL: ${feedIconUrl || 'none'}`);
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
          const content = getText(obj['content:encoded']);
          
          const dcDate = getText(obj['dc:date']);
          const publishedAt = toIsoDateOrNow(dcDate);

          let thumbnailUrl: string | undefined;
          
          // enclosure を確認（Zenn対応: typeが"false"でも許可）
          const enclosure = obj['enclosure'] as Record<string, unknown> | undefined;
          if (enclosure) {
            const enclosureUrl = getText(enclosure['@_url']);
            const type = getText(enclosure['@_type']);
            
            // typeがimage/*、または不正な値（"false"など）、または空の場合でもURLがあれば使用
            if (enclosureUrl) {
              if (!type || type === 'false' || type.startsWith('image/')) {
                thumbnailUrl = enclosureUrl;
                console.log(`[RssService] Found image from enclosure (RSS 1.0): ${thumbnailUrl.substring(0, 100)}`);
              }
            }
          }
          
          // content:encoded 内の画像を確認
          if (!thumbnailUrl && content) {
            thumbnailUrl = extractImageUrl(content);
          }
          
          // description 内の画像を確認
          if (!thumbnailUrl && summary) {
            thumbnailUrl = extractImageUrl(summary);
          }
          
          // サイト固有のサムネイル生成を試みる
          if (!thumbnailUrl) {
            thumbnailUrl = generateThumbnailFromUrl(link);
            if (thumbnailUrl) {
              console.log(`[RssService] Generated site-specific thumbnail: ${thumbnailUrl.substring(0, 100)}`);
            }
          }
          
          // フォールバック: フィードのアイコン
          if (!thumbnailUrl && feedIconUrl) {
            thumbnailUrl = feedIconUrl;
            console.log(`[RssService] Using feed icon as fallback: ${thumbnailUrl.substring(0, 100)}`);
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
            isStarred: false,
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
          const content = getText(obj['content:encoded']);
          const publishedAt = toIsoDateOrNow(obj['pubDate']);

          let thumbnailUrl: string | undefined;
          
          // 1. media:thumbnail を確認
          const mediaThumbnail = obj['media:thumbnail'];
          if (mediaThumbnail) {
            // テキストコンテンツとして取得（note.com形式）
            thumbnailUrl = getText(mediaThumbnail);
            
            // 属性として取得も試す（他のフィード形式）
            if (!thumbnailUrl && typeof mediaThumbnail === 'object') {
              thumbnailUrl = getText((mediaThumbnail as Record<string, unknown>)['@_url']);
            }
            
            if (thumbnailUrl) {
              console.log(`[RssService] Found image from media:thumbnail: ${thumbnailUrl.substring(0, 100)}`);
            }
          }
          
          // 2. media:content を確認
          if (!thumbnailUrl) {
            const mediaContent = obj['media:content'];
            if (mediaContent) {
              // テキストコンテンツとして取得
              thumbnailUrl = getText(mediaContent);
              
              // 属性として取得も試す
              if (!thumbnailUrl && typeof mediaContent === 'object') {
                thumbnailUrl = getText((mediaContent as Record<string, unknown>)['@_url']);
              }
              
              if (thumbnailUrl) {
                console.log(`[RssService] Found image from media:content: ${thumbnailUrl.substring(0, 100)}`);
              }
            }
          }
          
          // 3. image タグを確認（Yahoo!ニュース対応）
          if (!thumbnailUrl) {
            const imageTag = obj['image'];
            if (imageTag) {
              thumbnailUrl = getText(imageTag);
              
              if (thumbnailUrl) {
                console.log(`[RssService] Found image from <image> tag: ${thumbnailUrl.substring(0, 100)}`);
              }
            }
          }
          
          // 4. enclosure を確認（Zenn対応: typeが"false"でも許可）
          if (!thumbnailUrl) {
            const enclosure = obj['enclosure'] as Record<string, unknown> | undefined;
            if (enclosure) {
              const enclosureUrl = getText(enclosure['@_url']);
              const type = getText(enclosure['@_type']);
              
              // typeがimage/*、または不正な値（"false"など）、または空の場合でもURLがあれば使用
              if (enclosureUrl) {
                if (!type || type === 'false' || type.startsWith('image/')) {
                  thumbnailUrl = enclosureUrl;
                  console.log(`[RssService] Found image from enclosure: ${thumbnailUrl.substring(0, 100)}`);
                }
              }
            }
          }
          
          // 5. content:encoded 内の画像を確認（優先）
          if (!thumbnailUrl && content) {
            thumbnailUrl = extractImageUrl(content);
          }
          
          // 6. description 内の画像を確認
          if (!thumbnailUrl && summary) {
            thumbnailUrl = extractImageUrl(summary);
          }
          
          // サイト固有のサムネイル生成を試みる
          if (!thumbnailUrl) {
            thumbnailUrl = generateThumbnailFromUrl(link);
            if (thumbnailUrl) {
              console.log(`[RssService] Generated site-specific thumbnail: ${thumbnailUrl.substring(0, 100)}`);
            }
          }
          
          // 7. フォールバック: フィードのアイコン
          if (!thumbnailUrl && feedIconUrl) {
            thumbnailUrl = feedIconUrl;
            console.log(`[RssService] Using feed icon as fallback: ${thumbnailUrl.substring(0, 100)}`);
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
            isStarred: false,
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
          const summary = getText(obj['summary']);
          const content = getText(obj['content']);
          const publishedAt = toIsoDateOrNow(obj['published'] ?? obj['updated']);

          let thumbnailUrl: string | undefined;
          
          // link要素内のenclosureを確認（Zenn対応: typeが"false"でも許可）
          const links = ensureArray(obj['link'] as unknown);
          for (const linkNode of links) {
            if (typeof linkNode !== 'object' || linkNode === null) continue;
            const linkObj = linkNode as Record<string, unknown>;
            
            const rel = getText(linkObj['@_rel'])?.toLowerCase();
            const type = getText(linkObj['@_type']);
            const href = getText(linkObj['@_href']);
            
            // relがenclosureで、typeがimage/*または不正/空の場合
            if (rel === 'enclosure' && href) {
              if (!type || type === 'false' || type.startsWith('image/')) {
                thumbnailUrl = href;
                console.log(`[RssService] Found image from Atom link enclosure: ${thumbnailUrl.substring(0, 100)}`);
                break;
              }
            }
          }
          
          // content 内の画像を確認
          if (!thumbnailUrl && content) {
            thumbnailUrl = extractImageUrl(content);
          }
          
          // summary 内の画像を確認
          if (!thumbnailUrl && summary) {
            thumbnailUrl = extractImageUrl(summary);
          }
          
          // サイト固有のサムネイル生成を試みる
          if (!thumbnailUrl) {
            thumbnailUrl = generateThumbnailFromUrl(link);
            if (thumbnailUrl) {
              console.log(`[RssService] Generated site-specific thumbnail: ${thumbnailUrl.substring(0, 100)}`);
            }
          }
          
          // フォールバック: フィードのアイコン
          if (!thumbnailUrl && feedIconUrl) {
            thumbnailUrl = feedIconUrl;
            console.log(`[RssService] Using feed icon as fallback: ${thumbnailUrl.substring(0, 100)}`);
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
            isStarred: false,
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