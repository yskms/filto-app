/**
 * fast-xml-parser の `processEntities` オプション（RssService / OpmlService で共有）。
 *
 * 【経緯】fast-xml-parser を 5.3.3→5.6.0 に更新した際（npm audit fix、コードは不変）、
 * `processEntities: true` の既定 `maxTotalExpansions: 1000` が適用されるようになり、
 * `&#39;` `&nbsp;` 等のエンティティが1文書に 1000 個を超えるフィードが**丸ごとパース失敗**する
 * 不具合が発生した（実測ピーク: はてブのタグ検索 約25,000個）。`&amp;` `&lt;` `&gt;` は対象外。
 *
 * 【重要】`processEntities` を boolean(true) から**オブジェクトに変えると、指定しなかった項目の
 * 既定値まで一斉に変わる**（fast-xml-parser の OptionsBuilder 参照）:
 *   - maxTotalExpansions: true=1000  → object未指定=Infinity
 *   - maxExpansionDepth : true=10    → object未指定=10000
 *   - maxEntityCount    : true=100   → object未指定=1000
 * そのため「緩めるのは maxTotalExpansions だけ、残りは boolean 既定と同値を明示して固定」する。
 * 2パラメータだけ指定すると depth/count が黙って緩む（セキュリティが逆に弱くなる）ため。
 *
 * 実効的な OOM 防御は maxExpandedLength（展開後の総長を頭打ち）。billion laughs（多段展開の
 * 指数爆発）はこのバージョンでは再現しなかったが、将来のパーサ変更で黙って緩まないよう depth も固定する。
 *
 * ※ 同じ設定の複製が scripts/verify-feeds.mjs にもある（node スクリプトから本 TS を直接
 *   import できないため）。値を変えるときは必ず両方そろえること。
 */
export const XML_ENTITY_PROCESSING = {
  enabled: true,
  maxTotalExpansions: 100000, // 唯一緩める項目（実測ピーク約25,000に対し余裕を持たせる。boolean既定は1000）
  maxExpandedLength: 1000000, // 実効的なOOM防御（展開後の総長を約1MBで頭打ち。boolean既定100000より緩め）
  maxExpansionDepth: 10, // boolean既定と同値に固定（object既定10000に流されない）
  maxEntityCount: 100, // boolean既定と同値に固定（object既定1000に流されない）
  maxEntitySize: 10000, // boolean既定と同値（個別エンティティ値のサイズ上限）
};
