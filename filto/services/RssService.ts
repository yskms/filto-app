import { XMLParser } from 'fast-xml-parser';
import * as Encoding from 'encoding-japanese';

import { Article } from '@/types/Article';
import { getFaviconUrl } from '@/utils/feedUrl';
import { XML_ENTITY_PROCESSING } from '@/constants/xmlEntityOptions';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_ARTICLES = 50;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // 数値文字参照/HTMLエンティティを展開。エンティティ多数のフィード対策で展開上限を明示調整。
  processEntities: XML_ENTITY_PROCESSING,
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

/**
 * Date.parse が解釈できないタイムゾーン略称と、そのUTCオフセット。
 * GMT/UT/EST/EDT/CST/CDT/MST/MDT/PST/PDT は RFC 2822 として解釈できるため不要。
 * IST(印+0530/愛+0100/イスラエル+0200)のように地域で衝突する略称は誤変換を避けて含めない。
 */
const TIMEZONE_ABBREVIATIONS: Record<string, string> = {
  BST: '+0100',
  WET: '+0000',
  WEST: '+0100',
  CET: '+0100',
  CEST: '+0200',
  EET: '+0200',
  EEST: '+0300',
  MSK: '+0300',
  JST: '+0900',
  KST: '+0900',
  AEST: '+1000',
  AEDT: '+1100',
  ACST: '+0930',
  ACDT: '+1030',
  AWST: '+0800',
  NZST: '+1200',
  NZDT: '+1300',
};

function toIsoDateOrNow(dateLike: unknown): string {
  const text = getText(dateLike);
  if (!text) return new Date().toISOString();
  let ms = new Date(text).getTime();
  if (Number.isNaN(ms)) {
    const normalized = text.replace(
      /\b([A-Z]{2,4})\b\s*$/,
      (match, abbr: string) => TIMEZONE_ABBREVIATIONS[abbr] ?? match
    );
    ms = new Date(normalized).getTime();
  }
  if (Number.isNaN(ms)) return new Date().toISOString();
  return new Date(ms).toISOString();
}

/**
 * RSS 1.0 (RDF) のアイコンURL抽出
 */
function extractRss1IconUrl(channel: Record<string, unknown>, feedUrl: string): string | undefined {
  // 1. <webfeeds:icon> を確認
  const webfeedsIcon = getText(channel['webfeeds:icon']);
  if (webfeedsIcon) {
    return webfeedsIcon;
  }

  // 2. <webfeeds:logo> を確認
  const webfeedsLogo = getText(channel['webfeeds:logo']);
  if (webfeedsLogo) {
    return webfeedsLogo;
  }

  // 3. <image><url> を確認
  const image = channel['image'] as Record<string, unknown> | undefined;
  if (image) {
    const url = getText(image['url']);
    if (url) {
      return url;
    }
  }
  
  // 4. ファビコンAPIをフォールバック
  const faviconUrl = getFaviconUrl(feedUrl);
  return faviconUrl || undefined;
}

/**
 * RSS 2.0 のアイコンURL抽出
 */
function extractRss2IconUrl(channel: Record<string, unknown>, feedUrl: string): string | undefined {
  // 1. <webfeeds:icon> を確認（note.comなど）
  const webfeedsIcon = getText(channel['webfeeds:icon']);
  if (webfeedsIcon) {
    return webfeedsIcon;
  }

  // 2. <webfeeds:logo> を確認
  const webfeedsLogo = getText(channel['webfeeds:logo']);
  if (webfeedsLogo) {
    return webfeedsLogo;
  }

  // 3. <image><url> を確認
  const image = channel['image'] as Record<string, unknown> | undefined;
  if (image) {
    const url = getText(image['url']);
    if (url) {
      return url;
    }
  }
  
  // 4. ファビコンAPIをフォールバック
  const faviconUrl = getFaviconUrl(feedUrl);
  return faviconUrl || undefined;
}

/**
 * Atom のアイコンURL抽出
 */
function extractAtomIconUrl(feedNode: Record<string, unknown>, feedUrl: string): string | undefined {
  // 1. <webfeeds:icon> を確認（Qiitaなど）
  const webfeedsIcon = getText(feedNode['webfeeds:icon']);
  if (webfeedsIcon) {
    return webfeedsIcon;
  }

  // 2. <webfeeds:logo> を確認
  const webfeedsLogo = getText(feedNode['webfeeds:logo']);
  if (webfeedsLogo) {
    return webfeedsLogo;
  }

  // 3. <icon> を確認
  const icon = getText(feedNode['icon']);
  if (icon) {
    return icon;
  }

  // 4. <logo> を確認
  const logo = getText(feedNode['logo']);
  if (logo) {
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
        return href;
      }
    }
  }
  
  // 6. ファビコンAPIをフォールバック
  const faviconUrl = getFaviconUrl(feedUrl);
  return faviconUrl || undefined;
}

/**
 * エンコーディングを自動検出してテキストを取得
 */
const FEED_REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
} as const;
// 注: 以前は Cache-Control / Pragma に no-cache を送っていたが、条件付きGET
// （ETag / Last-Modified による再検証）と相性が悪く 304 を得にくいため除去した。

export type FeedFetchResult =
  | { status: 'notModified' }
  | { status: 'ok'; text: string; etag: string | null; lastModified: string | null };

type ConditionalValidators = { etag?: string | null; lastModified?: string | null };

/** fetchArticles の結果。304（変化なし）のときは記事を返さず notModified を立てる。 */
export type FetchArticlesResult =
  | { notModified: true }
  | { notModified: false; articles: Article[]; etag: string | null; lastModified: string | null };

/** ベースヘッダに条件付きGET用の If-None-Match / If-Modified-Since を足す */
function buildRequestHeaders(validators?: ConditionalValidators): Record<string, string> {
  const headers: Record<string, string> = { ...FEED_REQUEST_HEADERS };
  if (validators?.etag) headers['If-None-Match'] = validators.etag;
  if (validators?.lastModified) headers['If-Modified-Since'] = validators.lastModified;
  return headers;
}

/** レスポンスから次回の条件付きGETに使うバリデータを取り出す */
function extractValidators(response: Response): { etag: string | null; lastModified: string | null } {
  return {
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
  };
}

/** フィードのバイト列をエンコーディング判定してデコードする */
function decodeFeedBytes(arrayBuffer: ArrayBuffer, url: string): string {
  const bytes = new Uint8Array(arrayBuffer);
  const encoding = detectEncoding(bytes, url);
  if (encoding === 'shift_jis') {
    const unicodeArray = Encoding.convert(Array.from(bytes), { to: 'UNICODE', from: 'SJIS' });
    return Encoding.codeToString(unicodeArray);
  }
  if (encoding === 'euc-jp') {
    const unicodeArray = Encoding.convert(Array.from(bytes), { to: 'UNICODE', from: 'EUCJP' });
    return Encoding.codeToString(unicodeArray);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  validators?: ConditionalValidators
): Promise<FeedFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = buildRequestHeaders(validators);

  try {
    let response = await fetch(url, { signal: controller.signal, headers });

    // 202 Accepted: サーバが生成中。少し待って一度だけ同一条件で取り直す。
    if (response.status === 202) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      response = await fetch(url, { signal: controller.signal, headers });
    }

    // 変化なし: 本文のダウンロードもパースも省略できる（通信量削減の本命）
    if (response.status === 304) {
      return { status: 'notModified' };
    }

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    // 次回の条件付きGET用にバリデータを控える（本文取得前に読む）
    const { etag, lastModified } = extractValidators(response);

    const arrayBuffer = await response.arrayBuffer();

    // ArrayBufferが空の場合、text()メソッドで一度だけ再試行
    if (arrayBuffer.byteLength === 0) {
      const retry = await fetch(url, { signal: controller.signal, headers });
      const text = await retry.text();
      return { status: 'ok', text, etag, lastModified };
    }

    const text = decodeFeedBytes(arrayBuffer, url);
    return { status: 'ok', text, etag, lastModified };
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
  
  // 1. UTF-8 BOMチェック（最優先）
  if (bytes.length >= 3) {
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
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
      
      
      // encoding属性を大文字小文字を区別せずチェック
      const encodingMatch = header.match(/encoding=["']([^"']+)["']/i);
      if (encodingMatch) {
        const declaredEncoding = encodingMatch[1].toLowerCase();
        
        if (declaredEncoding.includes('shift') || declaredEncoding.includes('sjis')) {
          return 'shift_jis';
        }
        
        if (declaredEncoding.includes('euc')) {
          return 'euc-jp';
        }
        
        if (declaredEncoding.includes('utf-8') || declaredEncoding.includes('utf8')) {
          return 'utf-8';
        }
      }
      
      // XML宣言が読めた場合、そのエンコーディングを使用
      // （encoding属性がない場合）
      if (header.includes('<?xml')) {
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
    
    // はてなブックマーク（EUC-JP）
    if (domain.includes('hatena.ne.jp') || domain.includes('b.hatena.ne.jp')) {
      return 'euc-jp';
    }
    
    // 政府系サイトは基本的にUTF-8を優先（最近のサイトはUTF-8が多い）
    if (domain.endsWith('.go.jp')) {
      return 'utf-8';
    }
  } catch (e) {
    // URL パースエラーは無視
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

function extractImageUrl(html: string | undefined): string | undefined {
  if (!html) return undefined;
  
  // 1. 一般的な<img>タグからsrcを抽出
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
  const match = html.match(imgRegex);
  
  if (match && match[1]) {
    // 相対URLは無視（完全なURLのみ）
    if (match[1].startsWith('http://') || match[1].startsWith('https://')) {
      return match[1];
    }
  }
  
  // 2. data-srcやsrcsetなども試す（Lazy loading対応）
  const dataSrcRegex = /<img[^>]+data-src=["']([^"']+)["']/i;
  const dataSrcMatch = html.match(dataSrcRegex);
  
  if (dataSrcMatch && dataSrcMatch[1]) {
    if (dataSrcMatch[1].startsWith('http://') || dataSrcMatch[1].startsWith('https://')) {
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
      return firstUrl;
    }
  }
  
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
      // fetchMeta は条件付きGETを使わない（毎回本文が必要）ため常に 'ok'
      const result = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      if (result.status !== 'ok') {
        throw new Error('Unexpected 304 without conditional request');
      }
      const xml = result.text;

      const parsed = parser.parse(xml) as Record<string, unknown>;

      // RSS 1.0 (RDF) チェック
      const rdf = parsed['rdf:RDF'] as Record<string, unknown> | undefined;
      if (rdf) {
        const channel = rdf['channel'] as Record<string, unknown> | undefined;
        if (channel) {
          const title = getText(channel['title']);
          const iconUrl = extractRss1IconUrl(channel, url);
          if (!title) throw new Error('Failed to parse feed title (RSS 1.0)');
          return { title, iconUrl };
        }
      }

      // RSS 2.0 チェック
      const rss = parsed['rss'] as Record<string, unknown> | undefined;
      if (rss) {
      }
      if (rss?.['channel']) {
        const channel = rss['channel'] as Record<string, unknown>;
        const title = getText(channel['title']);
        const iconUrl = extractRss2IconUrl(channel, url);
        if (!title) throw new Error('Failed to parse feed title (RSS 2.0)');
        return { title, iconUrl };
      }

      // Atom チェック
      const feed = parsed['feed'] as Record<string, unknown> | undefined;
      if (feed) {
        const title = getText(feed['title']);
        const iconUrl = extractAtomIconUrl(feed, url);
        if (!title) throw new Error('Failed to parse feed title (Atom)');
        return { title, iconUrl };
      }

      throw new Error('Unsupported feed format (not RSS 1.0, RSS 2.0 nor Atom)');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch feed: ${error.message}`);
      }
      throw error;
    }
  },

  async fetchArticles(
    url: string,
    feedIconUrl?: string,
    validators?: ConditionalValidators
  ): Promise<FetchArticlesResult> {
    try {
      const fetchRes = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, validators);

      // 変化なし: 既存の記事をそのまま活かし、再パース・保存を行わない
      if (fetchRes.status === 'notModified') {
        return { notModified: true };
      }

      const { etag, lastModified } = fetchRes;
      const xml = fetchRes.text;

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
            }
          }
          
          // フォールバック: フィードのアイコン
          if (!thumbnailUrl && feedIconUrl) {
            thumbnailUrl = feedIconUrl;
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

        return { notModified: false, articles: result, etag, lastModified };
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
              }
            }
          }
          
          // 3. image タグを確認（Yahoo!ニュース対応）
          if (!thumbnailUrl) {
            const imageTag = obj['image'];
            if (imageTag) {
              thumbnailUrl = getText(imageTag);
              
              if (thumbnailUrl) {
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
            }
          }
          
          // 7. フォールバック: フィードのアイコン
          if (!thumbnailUrl && feedIconUrl) {
            thumbnailUrl = feedIconUrl;
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

        return { notModified: false, articles: result, etag, lastModified };
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
            }
          }
          
          // フォールバック: フィードのアイコン
          if (!thumbnailUrl && feedIconUrl) {
            thumbnailUrl = feedIconUrl;
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

        return { notModified: false, articles: result, etag, lastModified };
      }

      throw new Error('Unsupported feed format (not RSS 1.0, RSS 2.0 nor Atom)');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch articles: ${error.message}`);
      }
      throw error;
    }
  },
};