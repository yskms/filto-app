#!/usr/bin/env node
// 広告のテスト用IDが残ったまま本番リリースされるのを防ぐ静的検査。
//
// 目的: app.json のAdMob App ID と constants/adConfig.ts の広告ユニットIDが、
//       Google公開のテスト用IDのままになっていないかを確認する。
// 背景: 開発中はテスト用ID（実際のAdMobアカウント不要・収益ゼロ・不正トラフィック
//       扱いにならない）を使う。しかしこれを差し替え忘れて本番ビルドすると、
//       収益化のためのリリースなのに収益がゼロになり、しかも実害が「動いているのに
//       儲からない」という気づきにくい形で出る。コメントのTODOだけでは防げないので
//       機械的に検出する。
//
// 使い方: node scripts/check-ad-ids.mjs  （テストIDが残っていれば exit 1）

import { readFileSync } from 'fs';

// Google公開のテスト用IDはすべてこのパブリッシャIDで始まる
const TEST_PUBLISHER_ID = 'ca-app-pub-3940256099942544';

const errors = [];

// 1. app.json のプラグイン設定（androidAppId / iosAppId）
const appJsonUrl = new URL('../app.json', import.meta.url);
const appJson = JSON.parse(readFileSync(appJsonUrl, 'utf8'));
const plugins = appJson?.expo?.plugins ?? [];
for (const plugin of plugins) {
  if (!Array.isArray(plugin) || plugin[0] !== 'react-native-google-mobile-ads') continue;
  const opts = plugin[1] ?? {};
  for (const key of ['androidAppId', 'iosAppId']) {
    if (typeof opts[key] === 'string' && opts[key].startsWith(TEST_PUBLISHER_ID)) {
      errors.push(`  app.json  ${key} がテスト用App IDのまま: ${opts[key]}`);
    }
  }
}

// 2. constants/adConfig.ts の広告ユニットID（TestIds.* 参照 or テストIDのベタ書き）
const adConfigUrl = new URL('../constants/adConfig.ts', import.meta.url);
const adConfig = readFileSync(adConfigUrl, 'utf8');
// コメント行は除外する（TODOの説明文でTestIdsに言及しているため）
const adConfigCode = adConfig
  .split('\n')
  .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//') && !line.trim().startsWith('/*'))
  .join('\n');

if (/\bTestIds\s*\./.test(adConfigCode)) {
  errors.push('  constants/adConfig.ts  広告ユニットIDが TestIds.* のまま');
}
if (adConfigCode.includes(TEST_PUBLISHER_ID)) {
  errors.push('  constants/adConfig.ts  テスト用の広告ユニットIDがベタ書きされている');
}

if (errors.length > 0) {
  console.error('✖ 広告のテスト用IDが残っています。このままリリースすると収益がゼロになります。\n');
  console.error(errors.join('\n'));
  console.error('\n→ AdMobコンソールで作成した実際のApp ID / 広告ユニットIDに差し替えてください。');
  console.error('  （開発中に意図的にテストIDを使っている場合は、このチェックを実行しないでください）');
  process.exit(1);
}

console.log('✓ 広告IDOK（テスト用IDは残っていません）');
