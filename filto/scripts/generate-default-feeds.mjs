// constants/defaultFeeds.ts を再生成するスクリプト。
// 前提: `node scripts/verify-feeds.mjs > scripts/verify-results.json` を先に実行しておくこと。
// verify 結果のうち status==="OK"（取得成功 + 記事サムネあり）のみを採用する。
//
// 使い方:
//   node scripts/verify-feeds.mjs > scripts/verify-results.json
//   node scripts/generate-default-feeds.mjs
import { readFileSync, writeFileSync } from 'fs';

const CAT_ORDER = {
  ja: ['news', 'tech', 'business', 'science', 'dev', 'game', 'anime', 'art', 'entertainment', 'sports', 'outdoor', 'fitness', 'fashion', 'lifestyle', 'pets', 'kids', 'food', 'auto', 'travel'],
  en: ['world', 'tech', 'business', 'science', 'game', 'entertainment', 'sports', 'fitness', 'design', 'fashion', 'food', 'kids', 'auto', 'travel', 'culture'],
};
const LABELS = {
  ja: { news: 'ニュース', tech: 'テクノロジー', business: 'ビジネス・マネー', science: 'サイエンス', dev: '開発・プログラミング', game: 'ゲーム', anime: 'アニメ・マンガ', art: 'アート・イラスト', entertainment: 'エンタメ・音楽', sports: 'スポーツ', outdoor: '釣り・アウトドア', fitness: 'フィットネス・健康', fashion: 'ファッション・美容', lifestyle: 'ライフスタイル', pets: 'ペット・動物', kids: '子育て・育児', food: 'グルメ・料理', auto: '自動車', travel: '旅行' },
  en: { world: 'World News', tech: 'Technology', business: 'Business', science: 'Science', game: 'Gaming', entertainment: 'Entertainment', sports: 'Sports', fitness: 'Fitness & Health', design: 'Design', fashion: 'Fashion & Beauty', food: 'Food', kids: 'Parenting', auto: 'Auto', travel: 'Travel', culture: 'Culture' },
};
const GENERIC = new Set(['www', 'feeds', 'feed', 'rss', 'news', 'assets', 'wor', 'co', 'com', 'net', 'org', 'jp', 'uk', 'io', 'go', 'tokyo', 'media', 'or', 'ne', 'nikkeibp', 'content', 'public', 'hpplus', 'shogakukan', 'benesse', 'kusuguru', 'magazine']);

function slug(url) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    // Yahoo!ニュースの媒体フィードはホストが全て news.yahoo.co.jp で被るため、パスの媒体IDを使う
    const ym = u.pathname.match(/\/rss\/media\/([^/]+)\//);
    if (host === 'news.yahoo.co.jp' && ym) return ym[1].replace(/[^a-z0-9]/gi, '').toLowerCase();
    const parts = host.split('.').filter((p) => !GENERIC.has(p) && p.length > 2);
    const best = (parts.length ? parts : host.split('.')).reduce((a, b) => (b.length > a.length ? b : a), '');
    return best.replace(/[^a-z0-9]/gi, '').toLowerCase();
  } catch {
    return 'feed';
  }
}

const results = JSON.parse(readFileSync(new URL('./verify-results.json', import.meta.url)));
// status==='OK'(取得+サムネあり) を基本採用。force:true は方針の例外として明示的に採用する
// （例: Qiita はRSSにサムネを埋めないが、利用者要望によりfaviconフォールバックで収録）。
// exclude:true は「採用しないフィード」（取得エラー・更新停止・画像なし・中身なし・重複・ニッチ等）。
// 検証の成否に関わらず生成から除外する。理由は各エントリの excludeReason に記録（scripts/feed-candidates.json）。
// これにより「調べたが不採用」の判断が恒久化され、再調査を防ぐ。
const ok = results.filter((r) => (r.status === 'OK' || r.force) && !r.exclude);
const seen = new Set();
const feeds = ok.filter((r) => (seen.has(r.url) ? false : seen.add(r.url)));

const out = { ja: {}, en: {} };
for (const f of feeds) (out[f.lang][f.category] ??= []).push(f);

const idSeen = {};
function emit(lang) {
  const lines = [];
  for (const c of CAT_ORDER[lang].filter((c) => out[lang][c])) {
    lines.push('  {', `    id: ${JSON.stringify(c)},`, `    label: ${JSON.stringify(LABELS[lang][c])},`, '    feeds: [');
    for (const f of out[lang][c]) {
      const base = 'default_' + lang + '_' + slug(f.url);
      let id = base, n = 2;
      while (idSeen[id]) { id = base + n; n++; }
      idSeen[id] = 1;
      lines.push(`      { id: ${JSON.stringify(id)}, title: ${JSON.stringify(f.title)}, url: ${JSON.stringify(f.url)} },`);
    }
    lines.push('    ],', '  },');
  }
  return lines.join('\n');
}

const jaN = feeds.filter((f) => f.lang === 'ja').length;
const enN = feeds.filter((f) => f.lang === 'en').length;
const content = `// 自動生成されたデフォルトフィード一覧（scripts/verify-feeds.mjs で実URL検証済み）
// すべて「取得成功 + 記事にサムネイル画像が存在する」ことを確認したフィードのみ収録。
// 収録数: JA ${jaN}件 / EN ${enN}件
// ⚠️ このファイルは生成物。直接編集しない。追加/除外の手順は scripts/README.md を参照。
// 再生成: node scripts/verify-feeds.mjs > scripts/verify-results.json && node scripts/generate-default-feeds.mjs

export type DefaultFeedItem = { id: string; title: string; url: string };
export type DefaultFeedCategory = { id: string; label: string; feeds: DefaultFeedItem[] };

export const DEFAULT_FEED_CATEGORIES: Record<'ja' | 'en', DefaultFeedCategory[]> = {
  ja: [
${emit('ja')}
  ],
  en: [
${emit('en')}
  ],
};

/** カテゴリをまたいでフラットなフィード配列を返す */
export function getDefaultFeedsFlat(lang: 'ja' | 'en'): DefaultFeedItem[] {
  return DEFAULT_FEED_CATEGORIES[lang].flatMap((c) => c.feeds);
}
`;
writeFileSync(new URL('../constants/defaultFeeds.ts', import.meta.url), content);
console.log(`generated constants/defaultFeeds.ts  JA=${jaN} EN=${enN} total=${jaN + enN}`);
