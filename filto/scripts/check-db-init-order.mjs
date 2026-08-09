#!/usr/bin/env node
// database/init.ts の DDL 実行順を静的に検査する。
//
// 目的: 「その表を CREATE TABLE する前に、ensureColumn / CREATE INDEX / ALTER TABLE /
//        DELETE FROM がその表を参照していないか」を確認する。
// 背景: v1.3.0 で articles テーブル作成の"前"に is_hidden の ALTER/INDEX を実行しており、
//        新規インストール（＝まっさらDBで articles 未作成）では 'no such table: articles' で
//        initDatabase が例外 → seed スキップ → 空の壊れた状態でホームが開く致命バグがあった。
//        開発/更新では既存DBに表があるため再現せず、新規インストールだけで発症して見逃された。
//        このチェックはその順序退行を CI/手元で確実に検出する。
//
// 使い方: node scripts/check-db-init-order.mjs  （NG は exit 1）

import { readFileSync } from 'fs';

// 既定は database/init.ts。テスト用に任意ファイルパスを引数で渡せる。
const target = process.argv[2]
  ? new URL(process.argv[2], `file://${process.cwd()}/`)
  : new URL('../database/init.ts', import.meta.url);
const src = readFileSync(target, 'utf8');
const lines = src.split('\n');

const created = new Set();
const errors = [];

const reCreate = /CREATE TABLE IF NOT EXISTS\s+(\w+)/;
// 参照系: それぞれ「対象テーブルが既に CREATE 済み」であることを要求する。
// ${table} のような変数（ensureColumn/deleteAllFromTables のヘルパ定義内）は \w+ に
// マッチしないため、リテラルのテーブル名参照だけを検査対象にできる。
const refs = [
  [/ensureColumn\(\s*database\s*,\s*['"](\w+)['"]/, 'ensureColumn'],
  [/CREATE INDEX IF NOT EXISTS\s+\w+\s+ON\s+(\w+)/, 'CREATE INDEX'],
  [/ALTER TABLE\s+(\w+)/, 'ALTER TABLE'],
  [/DELETE FROM\s+(\w+)/, 'DELETE FROM'],
];

lines.forEach((line, i) => {
  const ln = i + 1;
  // コメントを除外する（行コメント // を除去し、JSDoc/ブロックコメント行 * や /* は丸ごと無視）。
  // これをしないと ensureColumn の説明文中の「ALTER TABLE ADD COLUMN」等を誤検出してしまう。
  const trimmed = line.trim();
  if (trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('//')) return;
  const code = line.replace(/\/\/.*$/, '');

  const c = code.match(reCreate);
  if (c) {
    created.add(c[1]);
    return;
  }
  for (const [re, kind] of refs) {
    const m = code.match(re);
    if (m && !created.has(m[1])) {
      errors.push(`  init.ts:${ln}  ${kind} が未作成テーブル "${m[1]}" を参照（CREATE TABLE より前）`);
    }
  }
});

if (errors.length > 0) {
  console.error('✖ DB初期化の順序エラー: 新規インストールで initDatabase が落ちます。\n');
  console.error(errors.join('\n'));
  console.error('\n→ 該当の ensureColumn / CREATE INDEX を、対象テーブルの CREATE TABLE の"後"へ移動してください。');
  process.exit(1);
}

console.log('✓ DB初期化の順序OK（全 ensureColumn / INDEX / ALTER / DELETE が対象テーブルの CREATE TABLE 後）');
