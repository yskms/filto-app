import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { FeedService } from '@/services/FeedService';
import { FilterService, Filter } from '@/services/FilterService';
import { GlobalAllowKeywordService } from '@/services/GlobalAllowKeywordService';
import { ArticleRepository } from '@/repositories/ArticleRepository';
import { Article } from '@/types/Article';
import { isValidFeedUrl } from '@/utils/feedUrl';
import { writeAndShare, type ShareExportResult } from '@/utils/exportFile';
import { clearUserDataTables } from '@/database/init';

/**
 * BackupService
 * フィード・フィルタ・グローバル許可キーワード・記事を JSON でバックアップ / 復元する。
 *
 * 記事はエクスポート時に「お気に入りのみ」か「すべて」を選べる。
 * 表示設定（テーマ・言語など）は対象外：端末ごとに選ぶ性質で項目数も少なく、
 * 復元しても Provider が起動時に読むため即時反映されず分かりにくいため。
 *
 * 復元はファイルを読んでから「追加(merge)」か「置き換え(replace)」を選ぶ二段構え。
 * 置き換えは取り消せないうえ、バックアップの記事の範囲によって失われる量が変わるため、
 * 中身を数えてから確認したい。
 */

const BACKUP_VERSION = 1;
const BACKUP_APP_ID = 'filto';

/** エクスポートしたバックアップファイル名の接頭辞（掃除対象の判別に使う） */
const EXPORT_FILE_PREFIX = 'filto_backup_';

interface BackupFeed {
  url: string;
  title: string;
  iconUrl?: string;
}

interface BackupFilter {
  block_keyword: string;
  allow_keyword: string | null;
  target_title: number;
  target_description: number;
}

/**
 * 記事はフィードのIDではなくURLで紐づける。
 * 復元時にフィードのIDは新しく採番されるため、IDのままでは対応が取れなくなる。
 */
interface BackupArticle {
  feedUrl: string;
  feedName: string;
  title: string;
  link: string;
  summary?: string;
  thumbnailUrl?: string;
  publishedAt: string;
  isRead: boolean;
  isStarred: boolean;
}

export interface BackupData {
  app: typeof BACKUP_APP_ID;
  version: number;
  exportedAt: string;
  feeds: BackupFeed[];
  filters: BackupFilter[];
  globalAllowKeywords: string[];
  /** エクスポート時の選択により「お気に入りのみ」または「すべての記事」 */
  articles: BackupArticle[];
  /**
   * articles が全記事か、お気に入りのみか。
   * 置き換え復元で「何が失われるか」を正しく警告するために必要。
   * この項目が無い古いバックアップもあるため、読む側では省略を許容する。
   */
  includeAllArticles: boolean;
}

/**
 * フィルタの重複判定キー。
 * 値にスペースが含まれても衝突しないよう JSON 配列として直列化する
 * （block="a b" / allow="" と block="a" / allow="b" を区別するため）
 */
function filterSignature(f: BackupFilter): string {
  return JSON.stringify([f.block_keyword, f.allow_keyword ?? '', f.target_title, f.target_description]);
}

/** 記事の重複判定キー（DBの UNIQUE(feed_id, link) に対応） */
function articleKey(feedId: string, link: string): string {
  return JSON.stringify([feedId, link]);
}

export type BackupExportResult = ShareExportResult;

/** 復元の方式 */
export type BackupImportMode =
  /** 既存データを残したまま、足りないものを追加する */
  | 'merge'
  /** 既存のフィード・フィルタ・許可キーワード・記事をすべて消してから取り込む */
  | 'replace';

/** ファイルを選んで検証した結果。中身の件数を確認ダイアログに出すために持ち回る */
export type BackupPickResult =
  | {
      status: 'ok';
      data: BackupData;
      feeds: number;
      filters: number;
      keywords: number;
      articles: number;
      /** null は「範囲を記録していない古いバックアップ」。保守的に警告する */
      includeAllArticles: boolean | null;
    }
  | { status: 'cancelled' }
  /** JSONとして読めない、または Filto のバックアップではない */
  | { status: 'invalid' }
  /** このアプリより新しい形式のバックアップ（読み込むと壊れる可能性がある） */
  | { status: 'unsupportedVersion' };

export interface BackupApplyResult {
  feeds: number;
  filters: number;
  keywords: number;
  articles: number;
  /** すでに端末にあった記事のうち、バックアップを見てお気に入りを立て直した件数 */
  starredRestored: number;
  /** 無料版の上限などで復元できなかった許可キーワードの件数 */
  keywordsSkipped: number;
}

export const BackupService = {
  /**
   * フィード・フィルタ・許可キーワード・記事を JSON にまとめて共有シートを開く。
   * @param options.includeAllArticles true なら全記事、false ならお気に入りのみ
   */
  async exportToFile(options: { includeAllArticles: boolean }): Promise<BackupExportResult> {
    const [feeds, filters, keywords, articles] = await Promise.all([
      FeedService.list(),
      FilterService.list(),
      GlobalAllowKeywordService.list(),
      options.includeAllArticles ? ArticleRepository.listAll() : ArticleRepository.listStarred(),
    ]);

    const feedUrlById = new Map(feeds.map((f) => [f.id, f.url]));

    const data: BackupData = {
      app: BACKUP_APP_ID,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      includeAllArticles: options.includeAllArticles,
      feeds: feeds.map((f) => ({ url: f.url, title: f.title, iconUrl: f.iconUrl })),
      filters: filters.map((f) => ({
        block_keyword: f.block_keyword,
        allow_keyword: f.allow_keyword,
        target_title: f.target_title,
        target_description: f.target_description,
      })),
      globalAllowKeywords: keywords.map((k) => k.keyword),
      articles: articles.flatMap((a) => {
        const feedUrl = feedUrlById.get(a.feedId);
        // 対応するフィードが無い記事（削除済みフィードの残骸など）は持ち出さない
        if (!feedUrl) return [];
        return [{
          feedUrl,
          feedName: a.feedName,
          title: a.title,
          link: a.link,
          summary: a.summary,
          thumbnailUrl: a.thumbnailUrl,
          publishedAt: a.publishedAt,
          isRead: a.isRead,
          isStarred: a.isStarred,
        }];
      }),
    };

    // 全記事を含めると数MBになりうる。整形はせず1行で書き出す（機械が読むファイルのため）
    return writeAndShare(EXPORT_FILE_PREFIX, 'json', JSON.stringify(data), {
      mimeType: 'application/json',
      dialogTitle: 'Filto Backup',
      UTI: 'public.json',
    });
  },

  /**
   * バックアップ JSON を選択して検証する。まだ何も書き込まない。
   * 呼び出し側はこの件数をユーザーに見せてから applyBackup を呼ぶ。
   */
  async pickBackupFile(): Promise<BackupPickResult> {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (picked.canceled || !picked.assets || picked.assets.length === 0) {
      return { status: 'cancelled' };
    }

    let parsed: unknown;
    try {
      const content = await new File(picked.assets[0].uri).text();
      parsed = JSON.parse(content);
    } catch (_) {
      return { status: 'invalid' };
    }

    const data = parsed as Partial<BackupData> | null;
    if (!data || data.app !== BACKUP_APP_ID || !Array.isArray(data.feeds)) {
      return { status: 'invalid' };
    }

    // 新しい形式のバックアップは解釈できない。黙って一部だけ取り込むより弾く
    if (typeof data.version === 'number' && data.version > BACKUP_VERSION) {
      return { status: 'unsupportedVersion' };
    }

    const articles = Array.isArray(data.articles) ? data.articles : [];

    return {
      status: 'ok',
      data: {
        app: BACKUP_APP_ID,
        version: typeof data.version === 'number' ? data.version : BACKUP_VERSION,
        exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
        feeds: data.feeds,
        filters: Array.isArray(data.filters) ? data.filters : [],
        globalAllowKeywords: Array.isArray(data.globalAllowKeywords) ? data.globalAllowKeywords : [],
        articles,
        includeAllArticles: data.includeAllArticles === true,
      },
      feeds: data.feeds.length,
      filters: Array.isArray(data.filters) ? data.filters.length : 0,
      keywords: Array.isArray(data.globalAllowKeywords) ? data.globalAllowKeywords.length : 0,
      articles: articles.length,
      includeAllArticles: typeof data.includeAllArticles === 'boolean' ? data.includeAllArticles : null,
    };
  },

  /**
   * 検証済みのバックアップを取り込む。
   *
   * merge: 既存と重複するフィード / フィルタ / 許可キーワード / 記事はスキップする。
   *        すでにある記事にはバックアップのお気に入りを立て直すが、既読状態は変えない。
   * replace: 先に既存データを消してから同じ取り込みを行う。
   */
  async applyBackup(data: BackupData, mode: BackupImportMode): Promise<BackupApplyResult> {
    if (mode === 'replace') {
      // 表示設定など AsyncStorage のデータは消さない（バックアップにも含めていないため）
      clearUserDataTables();
    }

    let feedsAdded = 0;
    let filtersAdded = 0;
    let keywordsAdded = 0;
    let keywordsSkipped = 0;
    let articlesAdded = 0;
    let starredRestored = 0;

    // フィード（URL重複はスキップ）
    const existingFeeds = await FeedService.list();
    const existingFeedUrls = new Set(existingFeeds.map((f) => f.url));
    for (const feed of data.feeds) {
      if (!feed || typeof feed.url !== 'string' || existingFeedUrls.has(feed.url)) continue;
      // バックアップJSONは手で編集でき、他端末からも持ち込まれる。
      // 手動追加(feed_add)と同じ基準で検証し、壊れたフィードの永続化を防ぐ
      if (!isValidFeedUrl(feed.url)) continue;
      try {
        await FeedService.create({ url: feed.url, title: feed.title, iconUrl: feed.iconUrl });
        existingFeedUrls.add(feed.url);
        feedsAdded++;
      } catch (_) {}
    }

    // フィルタ（内容が一致するものはスキップ）
    const existingFilters = await FilterService.list();
    const existingSigs = new Set(
      existingFilters.map((f) =>
        filterSignature({
          block_keyword: f.block_keyword,
          allow_keyword: f.allow_keyword,
          target_title: f.target_title,
          target_description: f.target_description,
        })
      )
    );
    for (const filter of data.filters) {
      if (!filter || typeof filter.block_keyword !== 'string') continue;
      const normalized: BackupFilter = {
        block_keyword: filter.block_keyword,
        allow_keyword: filter.allow_keyword ?? null,
        target_title: filter.target_title ? 1 : 0,
        target_description: filter.target_description ? 1 : 0,
      };
      const sig = filterSignature(normalized);
      if (existingSigs.has(sig)) continue;
      try {
        const now = Math.floor(Date.now() / 1000);
        await FilterService.save({ ...normalized, created_at: now, updated_at: now } as Filter);
        existingSigs.add(sig);
        filtersAdded++;
      } catch (_) {}
    }

    // グローバル許可キーワード（重複・上限超過はスキップ）
    const existingKeywords = await GlobalAllowKeywordService.list();
    const existingKw = new Set(existingKeywords.map((k) => k.keyword));
    for (const keyword of data.globalAllowKeywords) {
      if (typeof keyword !== 'string' || existingKw.has(keyword)) continue;
      try {
        const result = await GlobalAllowKeywordService.create(keyword);
        if (result.success) {
          existingKw.add(keyword);
          keywordsAdded++;
        } else {
          // 無料版の上限などで登録できなかった。黙って捨てるとデータが
          // 消えたように見えるため、件数を数えてユーザーに伝える
          keywordsSkipped++;
        }
      } catch (_) {
        keywordsSkipped++;
      }
    }

    // 記事（フィードURL → 復元後のフィードID に貼り替えて取り込む）
    if (data.articles.length > 0) {
      // フィード復元後の一覧で URL → ID の対応を作る
      const feedIdByUrl = new Map((await FeedService.list()).map((f) => [f.url, f.id]));

      // 重複判定はDBの UNIQUE(feed_id, link) と INSERT OR IGNORE に任せる。
      // 事前に既存記事を読み出すと、キーを作るためだけに全記事（本文込み）を
      // メモリに載せることになるため
      const toInsert: Article[] = [];
      const starTargets: { feedId: string; link: string }[] = [];
      const seen = new Set<string>();

      for (const article of data.articles) {
        if (!article || typeof article.link !== 'string' || typeof article.feedUrl !== 'string') continue;
        const feedId = feedIdByUrl.get(article.feedUrl);
        // 対応するフィードが無い（復元されなかった）記事は取り込まない
        if (!feedId) continue;

        if (article.isStarred) {
          starTargets.push({ feedId, link: article.link });
        }

        // バックアップファイル自体に重複がある場合に備える（DB側の重複はDBが弾く）
        const key = articleKey(feedId, article.link);
        if (seen.has(key)) continue;
        seen.add(key);

        toInsert.push({
          id: '', // insertMany では使われない（id は AUTOINCREMENT）
          feedId,
          feedName: article.feedName,
          title: article.title,
          link: article.link,
          summary: article.summary,
          thumbnailUrl: article.thumbnailUrl,
          publishedAt: article.publishedAt,
          isRead: !!article.isRead,
          isStarred: !!article.isStarred,
        });
      }

      try {
        // 実際に入った件数（既存と重複した分は除く）を insertMany から受け取る
        articlesAdded = await ArticleRepository.insertMany(toInsert);
      } catch (_) {}

      // すでに端末にあった記事にお気に入りを立て直す。
      // 新規挿入分は is_starred = 1 で入っているため、この件数には数えられない
      try {
        starredRestored = await ArticleRepository.starManyByLink(starTargets);
      } catch (_) {}
    }

    return {
      feeds: feedsAdded,
      filters: filtersAdded,
      keywords: keywordsAdded,
      articles: articlesAdded,
      starredRestored,
      keywordsSkipped,
    };
  },
};
