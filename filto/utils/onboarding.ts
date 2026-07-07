// オンボーディング（フィード選択＋キーワード選択＋コーチマークツアー）を
// 最初からやり直すためのシンプルなイベントバス。
//
// 設定・データ管理などの導線から restartOnboarding() を呼ぶと、RootLayout が
// これを購読してオンボーディング画面を再表示する（画面ツリー全体を差し替えるため
// push 画面の後始末は不要）。オンボ完了時の seed は INSERT OR IGNORE なので、
// 既存フィード（同一URL）はスキップされ、フィード管理画面にダブりは生じない。

type Listener = () => void;

const listeners = new Set<Listener>();

/** RootLayout が購読する。戻り値で解除。 */
export function subscribeRestartOnboarding(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** オンボーディングを最初からやり直す。既存データは削除しない。 */
export function restartOnboarding(): void {
  listeners.forEach((l) => l());
}
