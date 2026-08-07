# デフォルトフィード管理

初回起動時に自動投入するデフォルトフィード（`constants/defaultFeeds.ts`）の管理手順。

## パイプライン

```
feed-candidates.json         ← 元データ（＝考慮した全フィードの台帳。ここを編集する）
   │  node scripts/verify-feeds.mjs > scripts/verify-results.json   （取得＋サムネ画像を検証）
   ▼
verify-results.json          ← 検証結果キャッシュ
   │  node scripts/generate-default-feeds.mjs                        （TSを生成）
   ▼
constants/defaultFeeds.ts    ← 生成物（アプリが読む）
```

## 大前提（ここを外すと事故る）

- **`constants/defaultFeeds.ts` は生成物。直接編集しない**（次の再生成で消える）。必ず `feed-candidates.json` を直して再生成する。
- **採用条件は「取得成功 かつ 記事にサムネイル画像がある」**（verifyの `status: OK`）。画像が無いフィードは自動で不採用（例: Google News、Yahoo!国際）。
- **URLはリダイレクト解決後の“最終URL”で登録する**。アプリのフィード取得はリダイレクトに弱く、末尾スラッシュ等が無いと実機で「取得に失敗」になることがある。
  - 例: `iheartdogs.com/feed` → `…/feed/` が必須、`lovemeow.com/feed` → `…/feeds/feed.rss`、`tsurinews.jp/feed` → `…/feed/`。
  - 確認: `curl -sIL "URL"` で 301/302 が出るなら、その先の最終URLを使う。

## フィードを「追加」する

1. `feed-candidates.json` に追加: `{ "lang": "ja|en", "category": "…", "title": "…", "url": "…" }`
2. `node scripts/verify-feeds.mjs > scripts/verify-results.json`
3. `node scripts/generate-default-feeds.mjs`
4. `git diff constants/defaultFeeds.ts` で意図通りか確認（`status` が OK でないと採用されない）

## フィードを「採用しない」（除外）＝ 調査結果を残す

`feed-candidates.json` の該当エントリに以下を足す:

```json
{ "lang": "ja", "category": "pets", "title": "フェリシモ猫部",
  "url": "https://www.nekobu.com/feed", "exclude": true, "excludeReason": "RSS無し(404)" }
```

- **対象は性質を問わない**: 取得エラー / 更新停止 / 更新遅い / 画像なし / 中身なし / 重複 / ニッチ など、採用しない理由すべて。
- `exclude: true` は **verify では取得スキップ**され（dead URL を毎回叩かない）、**生成からも除外**される。
- 「調べたが不採用」もここに記録しておくことで、**次回同じサイトを再調査しなくて済む**。
- 理由は必ず `excludeReason` に日本語で書く。

## 除外したフィードが「復活したか」再チェック

そのエントリの `exclude` を一時的に外す → `verify-feeds.mjs` を回す → `status` を確認 →
OKなら採用（`exclude` を消す）、ダメなら `exclude` を戻す。

## カテゴリを「追加」する

`generate-default-feeds.mjs` の `CAT_ORDER`（表示順）と `LABELS`（表示名）の両方に id を足す。
**そこに無いカテゴリは出力されない**（feedがあっても無視される）。

## 整合性メモ

- `feed-candidates.json` と `verify-results.json` は件数が一致しているのが正常（verifyを回せば自動で揃う）。
- 生成器は `status === 'OK'（またはforce） かつ !exclude` を採用する。
- 収録数は `defaultFeeds.ts` 冒頭コメントに出力される。
