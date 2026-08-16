import { FeedRepository } from '@/repositories/FeedRepository';
import { Feed } from '@/types/Feed';
import { RssService } from '@/services/RssService';
import { FeedSortType } from '@/components/FeedSortModal';
import { extractFeedLinks, FeedCandidate } from '@/utils/feedAutodiscovery';

/** 自動検出の個別プローブのタイムアウト（フォールバックの並列総当たり用） */
const PROBE_TIMEOUT_MS = 5_000;

/**
 * ドメイン直下（トップページ）らしいURLかどうか。
 * 既知パスの並列プローブは常にドメイン直下の絶対パスを試すため、この判定が
 * true のときだけ意味を持つ（詳細は discoverFeedUrl 内コメント参照）。
 */
function isSiteRootUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return pathname === '' || pathname === '/';
  } catch {
    return false;
  }
}

/**
 * 深い記事URL（例: note.com/{user}/n/{記事id}）から、最初のパスセグメントだけ
 * 残した「セクション/ユーザーのトップページ」らしいURLを作る。
 * パスが推測ではなく実在ページの<link>宣言を読みに行くだけなので、
 * ドメイン直下の既知パス総当たり（isSiteRootUrl の対象）とは安全性の性質が異なる。
 * セグメントが1つ以下（既にトップページに近い）なら試す意味がないため null。
 */
function sectionRootUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length <= 1) return null;
    return `${u.origin}/${segments[0]}`;
  } catch {
    return null;
  }
}

/**
 * feed_add がURL入力から辿り着ける結果:
 * - feed:       入力URL自体がフィードだった（既存挙動）
 * - candidates: HTMLの<link>やフォールバックで見つかったフィード候補（1件以上）
 * - none:       HTMLだがフィードを見つけられなかった
 * ネットワーク/タイムアウトや「フィードでもHTMLでもない」入力は例外で通知する。
 */
export type FeedDiscoveryResult =
  | { kind: 'feed'; title: string; iconUrl?: string }
  | { kind: 'candidates'; candidates: FeedCandidate[] }
  | { kind: 'none' };

/**
 * 同じURLのフィードが既に登録されている場合に投げられる
 */
export class DuplicateFeedUrlError extends Error {
  constructor(public readonly existingTitle?: string) {
    super('Feed with the same URL already exists');
    this.name = 'DuplicateFeedUrlError';
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toUpperCase().includes('UNIQUE CONSTRAINT FAILED');
}

/**
 * FeedService
 * フィード管理のビジネスロジック
 */
export const FeedService = {
  /**
   * 全フィードを取得
   */
  async list(): Promise<Feed[]> {
    return await FeedRepository.list();
  },

  /**
   * ソート順を指定してフィードを取得
   */
  async listWithSort(sortType: FeedSortType): Promise<Feed[]> {
    return await FeedRepository.listWithSort(sortType);
  },

  /**
   * IDでフィードを取得
   */
  async get(id: string): Promise<Feed | null> {
    return await FeedRepository.get(id);
  },

  /**
   * URLでフィードを取得（未登録なら null）
   */
  async findByUrl(url: string): Promise<Feed | null> {
    return await FeedRepository.findByUrl(url);
  },

  /**
   * フィードを作成
   * @throws {DuplicateFeedUrlError} 同じURLのフィードが既に存在する場合
   */
  async create(input: {
    url: string;
    title?: string;
    iconUrl?: string;
  }): Promise<string> {
    const existing = await FeedRepository.findByUrl(input.url);
    if (existing) {
      throw new DuplicateFeedUrlError(existing.title);
    }

    // IDを生成（UUID的なもの）
    const id = `feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 現在のフィード数を取得（order_noを決定）
    const count = await FeedRepository.count();
    const orderNo = count + 1;

    // タイトルが指定されていない場合はURLをタイトルにする（仮）
    const title = input.title || input.url;

    const feed: Omit<Feed, 'createdAt'> = {
      id,
      title,
      url: input.url,
      iconUrl: input.iconUrl,
      orderNo,
      hiddenFromHome: false,
    };

    try {
      await FeedRepository.create(feed);
    } catch (error) {
      // 事前チェックと INSERT の間に別経路で登録された場合の保険
      if (isUniqueConstraintError(error)) {
        throw new DuplicateFeedUrlError();
      }
      throw error;
    }

    return id;
  },

  /**
   * フィードを更新
   * @throws {DuplicateFeedUrlError} 他のフィードが同じURLを使用している場合
   */
  async update(feed: Feed): Promise<void> {
    const existing = await FeedRepository.findByUrl(feed.url);
    if (existing && existing.id !== feed.id) {
      throw new DuplicateFeedUrlError(existing.title);
    }

    try {
      await FeedRepository.update(feed);
    } catch (error) {
      // 事前チェックと UPDATE の間に別経路で登録された場合の保険
      if (isUniqueConstraintError(error)) {
        throw new DuplicateFeedUrlError();
      }
      throw error;
    }
  },

  /**
   * フィードを削除
   */
  async delete(id: string): Promise<void> {
    await FeedRepository.delete(id);
  },

  /**
   * 並び順を更新
   */
  async reorder(feeds: Feed[]): Promise<void> {
    await FeedRepository.bulkUpdateOrder(feeds);
  },

  /**
   * フィード数を取得
   */
  async count(): Promise<number> {
    return await FeedRepository.count();
  },

  /**
   * 条件付きGET用のバリデータ（ETag / Last-Modified）を取得
   */
  async getFetchState(feedId: string): Promise<{ etag: string | null; lastModified: string | null } | null> {
    return await FeedRepository.getFetchState(feedId);
  },

  /**
   * 条件付きGET用のバリデータを保存
   */
  async setFetchState(feedId: string, etag: string | null, lastModified: string | null): Promise<void> {
    await FeedRepository.setFetchState(feedId, etag, lastModified);
  },

  /**
   * ホーム非表示（ミュート）フラグを更新する
   */
  async setHiddenFromHome(feedId: string, hidden: boolean): Promise<void> {
    await FeedRepository.setHiddenFromHome(feedId, hidden);
  },

  /**
   * 入力URLからフィードを解決する（RSS Autodiscovery）。
   *
   * 1. 入力URL自体をフィードとして解釈できれば確定（既存挙動を維持）
   * 2. HTMLなら <head> の <link rel="alternate"> から候補を抽出
   * 3. 候補ゼロ・深いURLなら、セクション/ユーザーのトップページで再度2を試す
   * 4. それでも候補ゼロ・サイト直下URLなら既知パスを並列プローブ（フォールバック）
   *
   * @throws ネットワーク/タイムアウト、または「フィードでもHTMLでもない」入力
   */
  async discoverFeedUrl(inputUrl: string): Promise<FeedDiscoveryResult> {
    const res = await RssService.fetchMetaOrBody(inputUrl);
    if (res.kind === 'feed') {
      return { kind: 'feed', title: res.title, iconUrl: res.iconUrl };
    }

    // HTML → Autodiscovery（相対hrefの基準はリダイレクト後のfinalUrl）
    const links = extractFeedLinks(res.body, res.finalUrl);
    if (links.length > 0) {
      return { kind: 'candidates', candidates: links };
    }

    // 記事ページ等の深いURLで<link>が無い場合、セクション/ユーザーのトップ
    // ページ（最初のパスセグメントだけ残したURL）で改めてAutodiscoveryを試す。
    // 例: note.com/{user}/n/{記事id} → note.com/{user}。あくまで実在ページが
    // <link>で宣言したフィードを読むだけで、URLパスを推測するわけではない
    // （常にドメイン直下の絶対パスへ解決される既知パスプローブとは安全性の性質が別物）。
    const sectionRoot = sectionRootUrl(res.finalUrl);
    if (sectionRoot) {
      try {
        // 元URL取得(最大10秒)にこれが直列で乗るため、既定の10秒だと最悪20秒待たせる。
        // 「念のための2回目の試行」としてフォールバックプローブと同じ5秒に短縮する。
        const sectionRes = await RssService.fetchMetaOrBody(sectionRoot, PROBE_TIMEOUT_MS);
        if (sectionRes.kind === 'feed') {
          return {
            kind: 'candidates',
            candidates: [{ url: sectionRoot, type: 'rss', title: sectionRes.title }],
          };
        }
        const sectionLinks = extractFeedLinks(sectionRes.body, sectionRes.finalUrl);
        if (sectionLinks.length > 0) {
          return { kind: 'candidates', candidates: sectionLinks };
        }
      } catch {
        // セクショントップの取得に失敗しても、以降のフォールバックへ進む
      }
    }

    // フォールバック: サイト直下（トップページ）らしいURLのときだけ既知パスを試す。
    // commonPaths は常にドメイン直下の絶対パスに解決されるため、記事など深い
    // URLで実行すると「入力とは無関係にドメイン直下にたまたま存在するフィード」
    // を誤って正解として返しかねない（例: 個別記事URLを貼ったのに note.com/rss
    // というサイト全体のフィードが返る）。見つからないなら素直に none にする。
    if (isSiteRootUrl(res.finalUrl)) {
      const probed = await FeedService.detectRssUrl(res.finalUrl);
      if (probed) {
        return { kind: 'candidates', candidates: [{ url: probed, type: 'rss' }] };
      }
    }

    return { kind: 'none' };
  },

  /**
   * 既知のRSSパスを並列プローブして最初に成功したURLを返す（フォールバック専用）。
   * Autodiscoveryで見つかった場合は呼ばないこと（8本同時取得の瞬間負荷を避けるため）。
   *
   * @param baseUrl ベースURL（例: https://example.com/）
   * @returns 検出されたRSS URL、見つからなければnull
   */
  async detectRssUrl(baseUrl: string): Promise<string | null> {
    // 一般的なRSSパス（添字が小さいものを優先）
    const commonPaths = [
      '/feed',
      '/feed.xml',
      '/rss',
      '/rss.xml',
      '/atom.xml',
      '/index.xml',
      '/feeds',
      '/feeds/posts/default',
    ];

    const urls = commonPaths.map((path) => {
      try {
        return new URL(path, baseUrl).href;
      } catch {
        return null;
      }
    });

    // 並列に投げ、成功したパスの添字を集める（各5秒で打ち切り）
    const hits = await Promise.all(
      urls.map(async (u, i) => {
        if (!u) return -1;
        try {
          await RssService.fetchMeta(u, PROBE_TIMEOUT_MS);
          return i;
        } catch {
          return -1;
        }
      })
    );

    const found = hits.filter((i) => i >= 0).sort((a, b) => a - b);
    return found.length > 0 ? urls[found[0]] : null;
  },
};

