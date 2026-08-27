/**
 * 同期と「DBを作り替える操作」（バックアップ復元・各種リセット）の相互排他。
 *
 * なぜ必要か:
 *   SQLite が保証するのは「DBが壊れないこと」であって、「同期で取得した記事と
 *   復元した記事のどちらが上に来るべきか」というアプリケーションの意図までは
 *   保証しない。また `SyncService.cancelOngoing()` はキャンセル要求を出すだけで、
 *   進行中の処理の終了を待たない。「進行中の同期を止める」ことと「復元中に
 *   新しい同期が始まらない」ことは別の問題であり、後者はここでしか塞げない。
 *
 * 塞ぎたい具体的な順序:
 *   復元が「未採番の記事をすべて削除」した直後に、まだ走っていた同期が
 *   insertMany で未採番を書き足し、そのまま採番まで進んでしまう。
 *   保存そのものを止めないと塞げないため、ロックは同期の取得〜保存〜採番の
 *   全体で保持する。
 *
 * 保持者による非対称性:
 *   - 同期は取得できなければ**即座に諦める**（待ち行列を持たない）。
 *     バックグラウンド同期が1回飛んでも次の発火で取り直せば足りる。
 *   - 復元・リセットは進行中の同期をキャンセルしたうえで、その終了を待って取る。
 *     RSS取得は10秒でタイムアウトするため、待ち時間は現実的な範囲に収まる。
 *
 * 単一JSランタイム内の排他であることに注意。バックグラウンド同期が headless
 * ランタイムで動く場合はこのモジュール変数が共有されないため、そちらは
 * SQLite 側のトランザクション排他で守る（詳細は設計書 ArticleDisplayOrder.md）。
 */

export type LockHolder = 'sync' | 'exclusive';

/** 排他側が同期の終了を待てる上限。超えたら諦めて例外にする（無排他で続行はしない） */
const EXCLUSIVE_WAIT_TIMEOUT_MS = 30_000;

let holder: LockHolder | null = null;

/** 現在の保持者が解放したら解決する Promise。保持者が居なければ null */
let releasedPromise: Promise<void> | null = null;
let resolveReleased: (() => void) | null = null;

/**
 * 排他側が「進行中の同期の終了」を待っている数。
 * 0 より大きい間は同期を開始させない。これが無いと、待っている隙に別の同期が
 * 始まってしまい、待った意味が無くなる。
 */
let exclusiveWaiting = 0;

/** 解放関数が「自分が取ったロック」だけを解放するようにするための識別子 */
let currentToken = 0;

function grab(who: LockHolder): () => void {
  const myToken = ++currentToken;
  holder = who;
  releasedPromise = new Promise<void>((resolve) => {
    resolveReleased = resolve;
  });

  return () => {
    // 二重解放や、すでに次の保持者に渡ったあとの解放で他人のロックを壊さない
    if (currentToken !== myToken) return;
    holder = null;
    releasedPromise = null;
    const resolve = resolveReleased;
    resolveReleased = null;
    resolve?.();
  };
}

export class SyncLockTimeoutError extends Error {
  constructor() {
    super('Timed out waiting for the ongoing sync to finish');
    this.name = 'SyncLockTimeoutError';
  }
}

export const SyncLock = {
  /** 現在の保持者（未使用なら null）。UIの「更新中」表示の判定に使う */
  holder(): LockHolder | null {
    return holder;
  },

  /**
   * 同期側の取得。取れなければ null を返すので、呼び出し側は即座に諦めること。
   * 待たないので await も不要（＝取得と判定の間に他の処理が割り込まない）。
   */
  tryAcquireForSync(): (() => void) | null {
    if (holder !== null || exclusiveWaiting > 0) return null;
    return grab('sync');
  },

  /**
   * 復元・リセット側の取得。進行中の保持者が居れば、その終了を待ってから取る。
   *
   * 待っている間は exclusiveWaiting により新しい同期が開始できない。
   * 呼び出し側は、この関数を呼ぶ直前に SyncService.cancelOngoing() を実行して
   * 進行中の同期に終了を促すこと（両者の間に await を挟まないこと）。
   *
   * @throws SyncLockTimeoutError 制限時間内に前の保持者が終わらなかった場合。
   *   「待てなかったので排他せずに実行する」は選ばない（データを壊す方向のため）。
   */
  async acquireExclusive(): Promise<() => void> {
    exclusiveWaiting++;
    try {
      const deadline = Date.now() + EXCLUSIVE_WAIT_TIMEOUT_MS;
      while (holder !== null) {
        const pending = releasedPromise;
        if (!pending) break; // holder と releasedPromise は同時に立つので通常は来ない
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new SyncLockTimeoutError();
        const timedOut = await waitWithTimeout(pending, remaining);
        if (timedOut) throw new SyncLockTimeoutError();
      }
      return grab('exclusive');
    } finally {
      // 減算はロックを掴んだ「後」。await の前で増やし、掴んだ後に減らすことで、
      // 待機終了とロック取得の間に同期が割り込む窓を作らない
      exclusiveWaiting--;
    }
  },
};

/** pending が先に解決したら false、制限時間切れなら true */
function waitWithTimeout(pending: Promise<void>, ms: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(true), ms);
    pending.then(() => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}
