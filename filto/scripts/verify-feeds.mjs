// RSSフィード検証スクリプト
// アプリ(RssService.ts)と同じロジックで「取得可能か」「記事にサムネ画像があるか」を判定する。
// 使い方: node scripts/verify-feeds.mjs
import { XMLParser } from 'fast-xml-parser';

const FETCH_TIMEOUT_MS = 15000;
const CONCURRENCY = 8;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,
  htmlEntities: true,
});

function getText(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const candidates = [value['#text'], value['text'], value['__cdata']];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().length > 0) return c;
      if (typeof c === 'number') return String(c);
    }
  }
  return undefined;
}

function ensureArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function extractImageUrl(html) {
  if (!html) return undefined;
  let m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m && m[1] && /^https?:\/\//.test(m[1])) return m[1];
  m = html.match(/<img[^>]+data-src=["']([^"']+)["']/i);
  if (m && m[1] && /^https?:\/\//.test(m[1])) return m[1];
  m = html.match(/<img[^>]+srcset=["']([^"']+)["']/i);
  if (m && m[1]) {
    const first = m[1].split(',')[0].trim().split(' ')[0];
    if (/^https?:\/\//.test(first)) return first;
  }
  return undefined;
}

// 1記事から「実サムネ」(faviconフォールバックを除く)を抽出
function itemThumb(obj, kind) {
  if (kind === 'rss2') {
    const mt = obj['media:thumbnail'];
    if (mt) {
      let u = getText(mt);
      if (!u && typeof mt === 'object') u = getText(mt['@_url']);
      if (u) return u;
    }
    const mc = obj['media:content'];
    if (mc) {
      const arr = ensureArray(mc);
      for (const c of arr) {
        let u = getText(c);
        if (!u && typeof c === 'object') u = getText(c['@_url']);
        if (u) return u;
      }
    }
    const img = obj['image'];
    if (img) { const u = getText(img); if (u) return u; }
    const enc = obj['enclosure'];
    if (enc) {
      const u = getText(enc['@_url']);
      const type = getText(enc['@_type']);
      if (u && (!type || type === 'false' || type.startsWith('image/'))) return u;
    }
    const content = getText(obj['content:encoded']);
    let t = extractImageUrl(content);
    if (t) return t;
    t = extractImageUrl(getText(obj['description']));
    if (t) return t;
    return undefined;
  }
  if (kind === 'rdf') {
    const enc = obj['enclosure'];
    if (enc) {
      const u = getText(enc['@_url']);
      const type = getText(enc['@_type']);
      if (u && (!type || type === 'false' || type.startsWith('image/'))) return u;
    }
    const mt = obj['media:thumbnail'];
    if (mt) { let u = getText(mt); if (!u && typeof mt === 'object') u = getText(mt['@_url']); if (u) return u; }
    const mc = obj['media:content'];
    if (mc) { const arr = ensureArray(mc); for (const c of arr) { let u = getText(c); if (!u && typeof c === 'object') u = getText(c['@_url']); if (u) return u; } }
    let t = extractImageUrl(getText(obj['content:encoded']));
    if (t) return t;
    t = extractImageUrl(getText(obj['description']));
    if (t) return t;
    return undefined;
  }
  // atom
  const links = ensureArray(obj['link']);
  for (const ln of links) {
    if (typeof ln !== 'object' || ln === null) continue;
    const rel = getText(ln['@_rel'])?.toLowerCase();
    const type = getText(ln['@_type']);
    const href = getText(ln['@_href']);
    if (rel === 'enclosure' && href && (!type || type === 'false' || type.startsWith('image/'))) return href;
  }
  const mt = obj['media:thumbnail'];
  if (mt) { let u = getText(mt); if (!u && typeof mt === 'object') u = getText(mt['@_url']); if (u) return u; }
  const mc = obj['media:content'];
  if (mc) { const arr = ensureArray(mc); for (const c of arr) { let u = getText(c); if (!u && typeof c === 'object') u = getText(c['@_url']); if (u) return u; } }
  let t = extractImageUrl(getText(obj['content']));
  if (t) return t;
  t = extractImageUrl(getText(obj['summary']));
  if (t) return t;
  return undefined;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return { ok: false, reason: 'empty' };
    // 簡易エンコーディング判定（検証目的なのでUTF-8/SJISのみ）
    const head = buf.slice(0, 200).toString('latin1');
    let text;
    const enc = head.match(/encoding=["']([^"']+)["']/i)?.[1]?.toLowerCase() || '';
    if (enc.includes('shift') || enc.includes('sjis') || enc.includes('euc')) {
      // サムネ有無の判定にはasciiなURLが取れれば十分なのでlatin1で代用
      text = buf.toString('latin1');
    } else {
      text = buf.toString('utf8');
    }
    return { ok: true, text };
  } catch (e) {
    const msg = e?.message || String(e);
    return { ok: false, reason: /abort/i.test(msg) ? 'timeout' : msg };
  } finally {
    clearTimeout(timer);
  }
}

async function verify(feed) {
  const r = await fetchText(feed.url);
  if (!r.ok) return { ...feed, status: 'FAIL', reason: r.reason };
  let parsed;
  try { parsed = parser.parse(r.text); }
  catch (e) { return { ...feed, status: 'FAIL', reason: 'parse error' }; }

  let items = [];
  let kind = '';
  let feedTitle = '';
  const rdf = parsed['rdf:RDF'];
  const rss = parsed['rss'];
  const atom = parsed['feed'];
  if (rdf) { kind = 'rdf'; items = ensureArray(rdf['item']); feedTitle = getText(rdf['channel']?.['title']) || ''; }
  else if (rss?.['channel']) { kind = 'rss2'; items = ensureArray(rss['channel']['item']); feedTitle = getText(rss['channel']['title']) || ''; }
  else if (atom) { kind = 'atom'; items = ensureArray(atom['entry']); feedTitle = getText(atom['title']) || ''; }
  else return { ...feed, status: 'FAIL', reason: 'not a feed' };

  if (items.length === 0) return { ...feed, status: 'FAIL', reason: 'no items' };

  let withThumb = 0;
  const check = items.slice(0, 20);
  for (const it of check) {
    if (typeof it !== 'object' || it === null) continue;
    if (itemThumb(it, kind)) withThumb++;
  }
  const ratio = withThumb / check.length;
  const status = withThumb >= Math.max(2, Math.ceil(check.length * 0.4)) ? 'OK' : (withThumb > 0 ? 'PARTIAL' : 'NOTHUMB');
  return { ...feed, status, kind, items: items.length, withThumb, checked: check.length, ratio: ratio.toFixed(2), feedTitle: feedTitle.slice(0, 40) };
}

import { readFileSync } from 'fs';
const candidates = JSON.parse(readFileSync(new URL('./feed-candidates.json', import.meta.url)));

const results = [];
let idx = 0;
async function worker() {
  while (idx < candidates.length) {
    const i = idx++;
    const res = await verify(candidates[i]);
    results.push(res);
    const tag = res.status.padEnd(8);
    console.error(`[${results.length}/${candidates.length}] ${tag} ${res.lang} ${(res.title||'').padEnd(24)} thumb=${res.withThumb ?? '-'}/${res.checked ?? '-'} ${res.reason ? '(' + res.reason + ')' : res.kind}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

results.sort((a, b) => (a.lang + a.category).localeCompare(b.lang + b.category));
console.log(JSON.stringify(results, null, 2));

const ok = results.filter(r => r.status === 'OK');
const partial = results.filter(r => r.status === 'PARTIAL');
console.error(`\n=== SUMMARY ===`);
console.error(`OK: ${ok.length} | PARTIAL: ${partial.length} | total: ${results.length}`);
console.error(`OK JA: ${ok.filter(r=>r.lang==='ja').length} | OK EN: ${ok.filter(r=>r.lang==='en').length}`);
