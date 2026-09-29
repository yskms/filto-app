/**
 * JSスレッドを1マクロタスク分手放す。
 *
 * 大きいフィード（数百KB〜数MB）のRSS取得は、XMLパースやUTF-8デコードが
 * JSスレッド上で同期的に実行されるため、何もしないと1回の処理で1秒を超えて
 * JSスレッドを占有し、その間タッチ操作が効かなくなる（オンボーディングの
 * 「次へ」タップがもたつく原因になっていた）。フィード単位・チャンク単位の
 * 処理の合間にこれを挟むことで、長時間ブロックを小さな単位に分割する。
 *
 * `Promise.resolve().then()` のようなmicrotaskだけのyieldは、同じ同期実行の
 * 直後に消化されてしまいタッチ/タイマー処理の前に割り込む余地がないため使わない。
 */
export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
