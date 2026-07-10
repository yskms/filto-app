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

/** YYYYMMDD 形式の日付スタンプ */
function dateStamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * 内容をキャッシュに書き出して共有シートを開く。
 *
 * @param prefix ファイル名の接頭辞（`filto_feeds_` など）。掃除対象の判別にも使う
 * @param extension 拡張子（`opml` / `json`）
 * @param content 書き出す文字列
 */
export async function writeAndShare(
  prefix: string,
  extension: string,
  content: string,
  options: { mimeType: string; dialogTitle: string; UTI: string }
): Promise<ShareExportResult> {
  // 前回のエクスポート残骸を掃除してから書き出す
  cleanupExportedFiles(prefix);

  const file = new File(Paths.cache, `${prefix}${dateStamp()}.${extension}`);
  if (file.exists) file.delete();
  file.create();
  file.write(content);

  if (!(await Sharing.isAvailableAsync())) {
    return { status: 'unavailable' };
  }

  await Sharing.shareAsync(file.uri, options);
  return { status: 'shared' };
}
