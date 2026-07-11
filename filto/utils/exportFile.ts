import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * エクスポートしたファイルをキャッシュに書き出し、共有シートで渡すための共通処理。
 * OPML / バックアップJSON の両方から使う。
 */

/** エクスポート結果。共有シートを開けたか、端末が共有に非対応か */
export type ShareExportResult = { status: 'shared' } | { status: 'unavailable' };

/**
 * 指定した接頭辞を持つ、過去のエクスポート残骸をキャッシュから削除する。
 *
 * 共有シートに渡したファイルは受け取り側がいつ読むか分からないため、共有直後には
 * 消せない。そこで次回エクスポート時に前回分を掃除する。
 * 失敗しても本処理は続行する（キャッシュはOSも回収するため）。
 */
function cleanupExportedFiles(prefix: string): void {
  try {
    for (const entry of new Directory(Paths.cache).list()) {
      if (entry instanceof File && entry.name.startsWith(prefix)) {
        entry.delete();
      }
    }
  } catch (_) {
  }
}

/**
 * YYYYMMDD_HHMMSS 形式のスタンプ。
 *
 * 同じ日に複数回書き出したとき、保存先で同名ファイルを上書きしてしまうため秒まで含める。
 * 端末のローカル時刻を使う（UTCだと日本時間の朝が前日の日付になる）。
 */
function timeStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

/**
 * 内容をキャッシュに書き出してファイルURIを返す（共有はしない）。
 *
 * @param prefix ファイル名の接頭辞（`filto_feeds_` など）。掃除対象の判別にも使う
 * @param extension 拡張子（`opml` / `json`）
 * @param content 書き出す文字列
 */
export function writeCacheFile(prefix: string, extension: string, content: string): string {
  // 前回の残骸を掃除してから書き出す
  cleanupExportedFiles(prefix);

  const file = new File(Paths.cache, `${prefix}${timeStamp()}.${extension}`);
  if (file.exists) file.delete();
  file.create();
  file.write(content);

  return file.uri;
}

/**
 * 内容をキャッシュに書き出して共有シートを開く。
 */
export async function writeAndShare(
  prefix: string,
  extension: string,
  content: string,
  options: { mimeType: string; dialogTitle: string; UTI: string }
): Promise<ShareExportResult> {
  const uri = writeCacheFile(prefix, extension, content);

  if (!(await Sharing.isAvailableAsync())) {
    return { status: 'unavailable' };
  }

  await Sharing.shareAsync(uri, options);
  return { status: 'shared' };
}
