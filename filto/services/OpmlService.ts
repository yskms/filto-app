import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { XMLParser } from 'fast-xml-parser';
import { FeedService } from '@/services/FeedService';
import { getFaviconUrl, isValidFeedUrl } from '@/utils/feedUrl';
import { Feed } from '@/types/Feed';

/**
 * OpmlService
 * フィード購読リストを OPML 形式でインポート / エクスポートする
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,
  htmlEntities: true,
});

/** XML 特殊文字をエスケープ */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** フィード配列から OPML 文字列を生成 */
function buildOpml(feeds: Feed[]): string {
  const now = new Date().toUTCString();
  const outlines = feeds
    .map((feed) => {
      const title = escapeXml(feed.title || feed.url);
      const url = escapeXml(feed.url);
      return `    <outline text="${title}" title="${title}" type="rss" xmlUrl="${url}" />`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Filto Feeds</title>
    <dateCreated>${now}</dateCreated>
  </head>
  <body>
${outlines}
  </body>
</opml>
`;
}

/** OPML のアウトラインを再帰的に走査し、xmlUrl を持つものを抽出 */
function collectOutlines(
  node: unknown,
  acc: { url: string; title?: string }[]
): void {
  if (node === null || node === undefined) return;
  const list = Array.isArray(node) ? node : [node];
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;
    const xmlUrl = obj['@_xmlUrl'] ?? obj['@_xmlurl'];
    if (typeof xmlUrl === 'string' && xmlUrl.trim().length > 0) {
      const titleAttr = obj['@_title'] ?? obj['@_text'];
      acc.push({
        url: xmlUrl.trim(),
        title: typeof titleAttr === 'string' ? titleAttr.trim() : undefined,
      });
    }
    // ネストされたアウトライン（フォルダ）を再帰
    if (obj['outline']) {
      collectOutlines(obj['outline'], acc);
    }
  }
}

export type OpmlExportResult =
  | { status: 'shared'; count: number }
  | { status: 'unavailable'; count: number; uri: string }
  | { status: 'empty' };

export type OpmlImportResult =
  | { status: 'imported'; added: number; skipped: number; total: number }
  | { status: 'cancelled' }
  | { status: 'invalid' };

export const OpmlService = {
  /**
   * 現在の購読フィードを OPML として書き出し、共有シートを開く。
   */
  async exportToFile(): Promise<OpmlExportResult> {
    const feeds = await FeedService.list();
    if (feeds.length === 0) {
      return { status: 'empty' };
    }

    const xml = buildOpml(feeds);

    // 日付入りのファイル名でキャッシュに書き出し
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const file = new File(Paths.cache, `filto_feeds_${stamp}.opml`);
    if (file.exists) file.delete();
    file.create();
    file.write(xml);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/x-opml',
        dialogTitle: 'Filto OPML',
        UTI: 'org.opml.opml',
      });
      return { status: 'shared', count: feeds.length };
    }

    return { status: 'unavailable', count: feeds.length, uri: file.uri };
  },

  /**
   * OPML ファイルを選択して購読フィードを取り込む。
   * 既存と同じ URL はスキップする。
   */
  async importFromFile(): Promise<OpmlImportResult> {
    const picked = await DocumentPicker.getDocumentAsync({
      // OPML の MIME は環境依存のため広めに許可し、内容で判定する
      type: ['application/xml', 'text/xml', 'text/x-opml', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (picked.canceled || !picked.assets || picked.assets.length === 0) {
      return { status: 'cancelled' };
    }

    const asset = picked.assets[0];
    let content: string;
    try {
      content = await new File(asset.uri).text();
    } catch (_) {
      return { status: 'invalid' };
    }

    let parsed: unknown;
    try {
      parsed = parser.parse(content);
    } catch (_) {
      return { status: 'invalid' };
    }

    const root = parsed as Record<string, unknown> | null;
    const opml = root?.['opml'] as Record<string, unknown> | undefined;
    const body = opml?.['body'] as Record<string, unknown> | undefined;
    if (!body) {
      return { status: 'invalid' };
    }

    const collected: { url: string; title?: string }[] = [];
    collectOutlines(body['outline'], collected);

    if (collected.length === 0) {
      return { status: 'invalid' };
    }

    // 既存フィードの URL 集合（重複登録を避ける）
    const existing = await FeedService.list();
    const existingUrls = new Set(existing.map((f) => f.url));

    // OPML 内の重複も除外
    const seen = new Set<string>();
    let added = 0;
    let skipped = 0;

    for (const entry of collected) {
      // 手動追加(feed_add)と同じ基準で検証する。http/https 以外を登録すると
      // 同期のたびに失敗し続ける壊れたフィードが永続化されてしまう
      if (!isValidFeedUrl(entry.url)) {
        skipped++;
        continue;
      }

      if (seen.has(entry.url)) {
        skipped++;
        continue;
      }
      seen.add(entry.url);

      if (existingUrls.has(entry.url)) {
        skipped++;
        continue;
      }

      try {
        // オンボーディングでの登録と同様、ファビコンをアイコンとして補完する
        await FeedService.create({
          url: entry.url,
          title: entry.title,
          iconUrl: getFaviconUrl(entry.url),
        });
        added++;
      } catch (_) {
        skipped++;
      }
    }

    return { status: 'imported', added, skipped, total: collected.length };
  },
};
