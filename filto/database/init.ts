import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import * as Updates from 'expo-updates';

import { getDefaultFeedsFlat } from '@/constants/defaultFeeds';
import { StorageKeys, STORAGE_KEY_PREFIX } from '@/constants/storageKeys';
import { getFaviconUrl } from '@/utils/feedUrl';

const SEED_KEY = StorageKeys.defaultFeedsSeeded;
const FILTER_SEED_KEY = StorageKeys.defaultFiltersSeeded;

/**
 * 期待するスキーマのバージョン（PRAGMA user_version と比較する）。
 * 1: articles に display_order を持たせた版（表示順を保存時に確定する方式）
 */
const CURRENT_DB_VERSION = 1;

/**
 * 移行を実行してよい最小のネイティブアプリバージョン。
 *
 * 移行はJSに含まれるため通常のOTA配信に同梱されうる。runtimeVersion ポリシーが
 * appVersion なので、app.json のバージョンを上げてから配信すれば古いネイティブ版には
 * そもそも届かないが、上げ忘れて eas update した場合の保険としてコード側でも見る。
 * この定数と app.json の version は必ず同じコミットで揃えること。
 */
const MIGRATION_MIN_APP_VERSION = '1.4.0';

/**
 * articles テーブルの定義。新規作成と移行後の再作成で同じ文字列を使い、
 * 「新規インストールと移行済み端末でスキーマが微妙に食い違う」余地を無くす。
 *
 * display_order: ホームの表示順。NULL は「未採番」を意味する標識で、採番は必ず1以上に
 * なるため採番済みと明確に区別できる。ALTER TABLE では NOT NULL 列を後付けできない
 * ことも含め、NULL 許容で確定している（設計書 ArticleDisplayOrder.md 参照）。
 */
const ARTICLES_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS articles (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_id       TEXT NOT NULL,
    feed_name     TEXT NOT NULL,
    title         TEXT NOT NULL,
    link          TEXT NOT NULL,
    description   TEXT,
    thumbnail_url TEXT,
    published_at  INTEGER,
    fetched_at    INTEGER NOT NULL,
    display_order INTEGER,
    is_read       INTEGER NOT NULL DEFAULT 0,
    is_starred    INTEGER NOT NULL DEFAULT 0,
    is_hidden     INTEGER NOT NULL DEFAULT 0,

    UNIQUE(feed_id, link),
    FOREIGN KEY(feed_id) REFERENCES feeds(id) ON DELETE CASCADE
  );
`;

const DEFAULT_FILTERS = [
  { block_keyword: 'Trump', allow_keyword: null, target_title: 1, target_description: 1 },
  { block_keyword: 'Google', allow_keyword: null, target_title: 1, target_description: 1 },
  { block_keyword: 'Apple', allow_keyword: null, target_title: 1, target_description: 1 },
];

function isJapaneseLocale(): boolean {
  const locales = Localization.getLocales();
  return locales.some((locale) => locale.languageCode === 'ja');
}

let db: SQLite.SQLiteDatabase | null = null;

/**
 * データベースを開く
 * @param forceNew true の場合、既存のインスタンスを破棄して新規作成
 */
export function openDatabase(forceNew: boolean = false): SQLite.SQLiteDatabase {
  if (forceNew && db) {
    // 既存の接続をクローズ（可能であれば）
    try {
      db.closeSync();
    } catch (_) {
      // クローズ失敗は無視して新規接続を続行
    }
    db = null;
  }
  
  if (db) {
    return db;
  }

  db = SQLite.openDatabaseSync('filto.db');
  // 外部キー制約はSQLiteでは接続ごとに既定で無効。有効にしないと articles の
  // ON DELETE CASCADE が働かず、フィード削除で記事が孤児として残る。
  // トランザクション外でのみ設定できるため、接続を開いた直後にここで張る。
  db.execSync('PRAGMA foreign_keys = ON');
  return db;
}

/**
 * 既存テーブルに列が無ければ追加する（冪等）。
 *
 * このアプリはスキーマのバージョン管理を持たず initDatabase で
 * CREATE TABLE IF NOT EXISTS しているだけなので、既存ユーザーのテーブルには
 * 後から増やした列が存在しない。PRAGMA table_info で有無を確認し、
 * 無いときだけ ALTER TABLE ADD COLUMN する。
 * @param columnDef 例: 'etag TEXT'（列名＋型。DEFAULT を付けても良い）
 * @returns 実際に列を追加したか（既にあった／テーブルが無い場合は false）
 */
function ensureColumn(
  database: SQLite.SQLiteDatabase,
  table: string,
  columnName: string,
  columnDef: string
): boolean {
  const columns = database.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  // テーブル自体が存在しないと PRAGMA table_info は空を返す。そのまま ALTER すると
  // 「no such table」で例外になり初期化ごと落ちるため、ここで抜ける
  // （対象テーブルは後段の CREATE TABLE IF NOT EXISTS で作られる）。
  if (columns.length === 0) return false;
  const exists = columns.some((c) => c.name === columnName);
  if (!exists) {
    database.execSync(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
    return true;
  }
  return false;
}

/** "1.4.0" 形式のバージョンを数値で比較する。a < b なら負、等しければ0、a > b なら正 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((s) => parseInt(s, 10));
  const pb = b.split('.').map((s) => parseInt(s, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = Number.isNaN(pa[i]) ? 0 : pa[i] ?? 0;
    const nb = Number.isNaN(pb[i]) ? 0 : pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

/**
 * 破壊的な移行を実行してよい状況かどうか。
 *
 * runtimeVersion ポリシーが appVersion なので Updates.runtimeVersion は
 * 「今動いているネイティブビルドのアプリバージョン」と一致する。OTA でJSだけが
 * 新しくなっても、この値は古いままになる。
 */
function isMigrationAllowed(): boolean {
  // 開発中（Metro から読み込んだバンドル）は常に許可する。実機で移行を確認するため。
  //
  // ※ 当初は `!Updates.isEnabled` で開発環境を判定していたが、**開発ビルドでも
  //   Updates.isEnabled は true** だった（実機のログで確認）。そのため
  //   runtimeVersion が 1.3.5 の開発ビルドでは移行が永久にスキップされ、
  //   検証しているつもりで検証できていなかった。判定には __DEV__ を使うこと。
  if (__DEV__) return true;
  try {
    const running = Updates.runtimeVersion;
    if (!running) return false;
    return compareVersions(running, MIGRATION_MIN_APP_VERSION) >= 0;
  } catch (_) {
    // expo-updates を参照できない環境。ガードの判定ができない以上、
    // 破壊的な処理は行わない方に倒す（下記フォールバックが受け止める）。
    return false;
  }
}

/**
 * user_version を1つ進める移行を1段だけ適用する。呼び出し側のトランザクション内で動く。
 * ここで例外を投げれば withTransactionSync が ROLLBACK するため、中途半端な状態は残らない。
 *
 * @returns 既存の記事データを実際に捨てたか（新規インストールでは false）。
 *   呼び出し側が「取得し直しが必要か」の判断に使う。
 */
function migrateOneStep(database: SQLite.SQLiteDatabase, from: number): boolean {
  if (from === 0) {
    // 新規インストールでは articles がまだ存在しない。この場合は「捨てた」ではないので
    // 取得のやり直しも要らない（オンボーディング側が取得する）
    const hadArticles =
      (database.getFirstSync<{ c: number }>(
        "SELECT COUNT(*) AS c FROM sqlite_master WHERE type = 'table' AND name = 'articles'"
      )?.c ?? 0) > 0;

    // 0 → 1: articles を display_order 付きで作り直す。
    //
    // ALTER TABLE で列を足すのではなく作り直すのは、新規インストールと同じ DDL を
    // そのまま適用してスキーマの食い違いを無くすため。既存の記事（と既読・お気に入り）は
    // 失われるが、次の同期で入り直す。フィード・フィルタ・許可キーワード・
    // 取得状態・オンボーディング状態には一切触れない。
    //
    // テーブルを DROP すればそのインデックスも消えるが、移行が途中で中断した端末でも
    // 確実に消えるよう明示する（残ると挿入のたびに無駄なコストになる）。
    database.execSync('DROP INDEX IF EXISTS idx_articles_fetched_at_published_at');
    database.execSync('DROP TABLE IF EXISTS articles');

    // 記事を捨てたので、条件付きGET（ETag / Last-Modified）の状態も一緒に捨てる。
    //
    // これを怠ると、内容が変わっていないフィードは移行直後の同期で 304 を返し、
    // 記事が一件も戻ってこない。しかも後日そのフィードの内容が変わった瞬間に、
    // バックログが丸ごと「新規」として挿入され、一度に最上位を占有する。
    // 実機で発生: 移行後の初回取得が 1,143件（本来は約3,850件）にとどまり、
    // 数分後の更新で1フィードの過去記事が大量に積み上がった。
    //
    // feeds テーブルや etag 列がまだ無い状態（新規インストール・旧バージョンからの
    // 移行）でも失敗しないよう、存在する列だけを対象にする。
    const feedColumns = database.getAllSync<{ name: string }>('PRAGMA table_info(feeds)');
    const clearable = ['etag', 'last_modified'].filter((column) =>
      feedColumns.some((c) => c.name === column)
    );
    if (clearable.length > 0) {
      database.execSync(`UPDATE feeds SET ${clearable.map((c) => `${c} = NULL`).join(', ')}`);
    }

    return hadArticles;
  }
  // 想定外のバージョンで黙って先に進むと、スキーマと実装がずれたまま動いてしまう
  throw new Error(`No migration defined for user_version ${from}`);
}

/**
 * スキーマ移行を適用する。CREATE TABLE より前に呼ぶこと
 * （articles を DROP したあと、後段の CREATE TABLE IF NOT EXISTS が新しい定義で作り直す）。
 *
 * initDatabase() は多重実行の防止機構を持たず、UI とバックグラウンドタスクの
 * 両方から呼ばれうる。そのため user_version の読み取りを**トランザクションの中**で
 * 行い、SQLite の書き込みロックによって後発が先発のコミット結果を見るようにする。
 * トランザクション外で読んでから入ると、両方が 0 を見て二重適用しうる。
 *
 * @returns 既存の記事データを捨てたか。true なら呼び出し側が取得のやり直しを促す。
 */
function applyMigrations(database: SQLite.SQLiteDatabase): boolean {
  if (!isMigrationAllowed()) return false;

  let articlesDiscarded = false;

  // 1トランザクション＝1段。将来バージョンが増えても if の羅列にならないようループにする
  for (let guard = 0; guard <= CURRENT_DB_VERSION; guard++) {
    let applied = false;
    database.withTransactionSync(() => {
      const current =
        database.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
      if (current >= CURRENT_DB_VERSION) return;
      const discarded = migrateOneStep(database, current);
      // PRAGMA はパラメータ束縛できないため直接埋め込む（内部で決まる整数のみ）
      database.execSync(`PRAGMA user_version = ${current + 1}`);
      applied = true;
      // コミットが成功した段の分だけ立てる（例外が出た段はロールバックされる）
      if (discarded) articlesDiscarded = true;
    });
    if (!applied) break;
  }

  return articlesDiscarded;
}

/**
 * 直前の initDatabase の完了（成功・失敗を問わず）。同時実行の直列化に使う。
 *
 * initDatabase は openDatabase(true) で接続を作り直す。並行して呼ばれると
 * 後発が先発の使っている接続を閉じてしまい、先発の execSync が
 * 「NativeDatabase.execSync has been rejected → NullPointerException」で落ちる。
 *
 * expo-sqlite は同じパスの接続を**ネイティブ側で参照カウント付きで共有する**
 * （NativeDatabase の Constructor に "Try to find opened database for fast refresh"
 * とある）。closeSync は参照カウントが0になった時点で共有接続を閉じるため、
 * もう一方が持っている JS オブジェクトの isClosed は立たないまま ref だけが
 * 無効になり、閉鎖チェックをすり抜けて NPE になる。
 *
 * 呼び出し元は _layout.tsx（起動時・再試行時）と BackgroundSync（headless）の2つ。
 */
let initChain: Promise<void> = Promise.resolve();

/**
 * データベースを初期化（テーブル作成・インデックス作成）。
 * 同時に呼ばれても直列に実行される。
 */
export function initDatabase(): Promise<void> {
  // 前回が失敗していても必ず実行する（_layout.tsx の「再試行」を殺さないため、
  // 成功・失敗どちらのハンドラでも走らせる）
  const result = initChain.then(runInitDatabase, runInitDatabase);
  // 失敗が後続の呼び出しを止めないよう、握り潰した版を待ち合わせに使う
  initChain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function runInitDatabase(): Promise<void> {
  // 新しいDBインスタンスを強制的に作成
  const database = openDatabase(true);

  // スキーマ移行はテーブル作成より前。articles を作り直す移行があるため、
  // DROP → この後の CREATE TABLE IF NOT EXISTS で新しい定義が入る順序にする。
  // 移行のコミット直後にプロセスが落ちても、次回起動の CREATE TABLE で復旧する。
  // ===== 一時的な検証用スイッチ（マージ前に削除する） =====
  // true にすると起動のたびに user_version を 0 に戻し、移行を何度でも再現できる。
  // 移行は本来1端末につき1回しか起きないため、これが無いと再テストのたびに
  // アプリの再インストールが必要になる。
  const FORCE_REPLAY_MIGRATION = false;
  if (__DEV__ && FORCE_REPLAY_MIGRATION) {
    database.execSync('PRAGMA user_version = 0');
    console.log('[filto-debug] user_version を 0 に戻しました（移行の再実行）');
  }
  // ===== ここまで =====

  const articlesDiscarded = applyMigrations(database);

  // ===== 一時的な診断ログ（実機確認用・マージ前に削除する） =====
  console.log(
    '[filto-debug] migration',
    JSON.stringify({
      allowed: isMigrationAllowed(),
      dev: __DEV__,
      updatesEnabled: Updates.isEnabled,
      runtimeVersion: Updates.runtimeVersion,
      userVersion:
        database.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? null,
      articlesDiscarded,
    })
  );
  // ===== ここまで =====

  // filters テーブル作成
  database.execSync(`
    CREATE TABLE IF NOT EXISTS filters (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      block_keyword       TEXT NOT NULL,
      allow_keyword       TEXT,
      target_title        INTEGER NOT NULL DEFAULT 1,
      target_description  INTEGER NOT NULL DEFAULT 1,
      created_at          INTEGER NOT NULL,
      updated_at          INTEGER NOT NULL
    );
  `);

  // インデックス作成
  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_filters_created_at ON filters(created_at);
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_filters_updated_at ON filters(updated_at);
  `);

  // feeds テーブル作成
  database.execSync(`
    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      icon_url TEXT,
      order_no INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      hidden_from_home INTEGER NOT NULL DEFAULT 0
    );
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_feeds_order_no ON feeds(order_no);
  `);

  // 条件付きGET（ETag / Last-Modified）用の列。既存ユーザーのテーブルにも後付けする。
  // 変化が無ければ 304 で本文DL・パースを省けるため通信量を大きく削減できる。
  ensureColumn(database, 'feeds', 'etag', 'etag TEXT');
  ensureColumn(database, 'feeds', 'last_modified', 'last_modified TEXT');

  // ホームで非表示（ミュート）用の列。削除せずにホーム一覧から外すための非破壊フラグ。
  ensureColumn(database, 'feeds', 'hidden_from_home', 'hidden_from_home INTEGER NOT NULL DEFAULT 0');

  // articles テーブル作成（定義は移行後の再作成と共有する）
  database.execSync(ARTICLES_TABLE_DDL);

  // 移行が実行されなかった端末（isMigrationAllowed が false のケース）でも、
  // display_order を参照するクエリが「no such column」で全滅しないようにする保険。
  // 通常は移行で作り直した直後なので何もしない。
  // 保険が働いた場合、既存記事はすべて未採番（＝一時的に非表示）になり、
  // 次の同期で公開日時の降順に採番されて出てくる。そのため移行と同じく
  // 取得のやり直しが必要になる（下記 pendingInitialFetch）。
  // ※ display_order を参照するインデックスより前に実行すること。
  const displayOrderAdded = ensureColumn(
    database,
    'articles',
    'display_order',
    'display_order INTEGER'
  );

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
  `);

  // 保持期間の削除（fetched_at 基準）と、採番時の並び（published_at 基準）を支える
  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_articles_fetched_at ON articles(fetched_at);
  `);

  // listAll/listByFeed の ORDER BY display_order DESC, id DESC を支える。
  // ※ CREATE INDEX IF NOT EXISTS は「名前」だけで既存判定するため、定義を変えたい
  //   ときは必ず新しい名前で作ること（同名のまま定義を変えても既存端末には反映されない。
  //   過去にこれで修正が無効化された）。旧 idx_articles_fetched_at_published_at は
  //   移行で DROP 済み。
  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_articles_display_order ON articles(display_order DESC, id DESC);
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_articles_is_starred ON articles(is_starred);
  `);

  // 記事の手動非表示（スワイプで非表示）。ホーム一覧からは除外するが is_hidden で残し、
  // 「表示」トグルで淡色表示→スワイプで復元できる（完全に消さない）。
  // ※ articles テーブル作成後に実行すること（新規インストールでは作成前だと
  //   ALTER/CREATE INDEX が「no such table」で失敗し、初期化ごと落ちる）。
  ensureColumn(database, 'articles', 'is_hidden', 'is_hidden INTEGER NOT NULL DEFAULT 0');
  database.execSync('CREATE INDEX IF NOT EXISTS idx_articles_is_hidden ON articles(is_hidden)');

  // global_allow_keywords テーブル作成
  database.execSync(`
    CREATE TABLE IF NOT EXISTS global_allow_keywords (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword     TEXT NOT NULL UNIQUE,
      created_at  INTEGER NOT NULL
    );
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_global_allow_keyword ON global_allow_keywords(keyword);
  `);

  // 外部キーを有効化する前のバージョンでフィードを削除した端末には、
  // 親フィードを失った記事が残っている（CASCADE が働かなかったため）。
  // PRAGMA foreign_keys=ON は既存行を検証しないので、ここで一度だけ掃除する。
  // 有効化後は孤児が新たに生まれないため、以降このDELETEは0件で終わる。
  database.execSync('DELETE FROM articles WHERE feed_id NOT IN (SELECT id FROM feeds)');

  // 既存の記事が「表示できない状態」になった場合は、ホームの初回取得フラグを
  // 立てて取り直させる。該当するのは次の2つ。
  //   - 移行で記事を捨てた（articlesDiscarded）
  //   - 移行が実行されず、保険で列だけ足した（displayOrderAdded）＝全件が未採番
  // Filto は「起動のたびに同期」をしないため、これが無いとアップデート直後に
  // 記事0件のホームが出て、手動更新するかバックグラウンド更新（最短30分・iOSでは
  // 発火保証なし）を待つまで空のままになる。
  // ※ 新規インストールではどちらも false になる（オンボーディング側が取得するため）。
  // ※ ここで AsyncStorage が失敗すると initDatabase が失敗するが、呼び出し側は
  //   直後に isOnboardingComplete()（同じく AsyncStorage）を呼ぶため、
  //   新しい失敗経路が増えるわけではない。
  if (articlesDiscarded || displayOrderAdded) {
    await AsyncStorage.setItem(StorageKeys.pendingInitialFetch, '1');
  }
}

/**
 * このJSランタイムで一度だけ initDatabase() を実行する。
 *
 * initDatabase() は openDatabase(true) で毎回DB接続を作り直すため、定期実行される
 * バックグラウンドタスクからそのまま呼ぶと、30分ごとに接続の open/close と
 * 十数本の DDL を繰り返すことになる。成功を一度だけ記憶して以降は再利用する。
 * 失敗は記憶しない（次の機会に再試行できるようにする）。
 *
 * UI 側（_layout.tsx）は再試行のために initDatabase() を直接呼ぶこと。
 */
let initialized: Promise<void> | null = null;
export function ensureDatabaseInitialized(): Promise<void> {
  if (!initialized) {
    initialized = initDatabase().catch((error) => {
      initialized = null; // 失敗は記憶しない
      throw error;
    });
  }
  return initialized;
}

/**
 * デフォルトフィルタを初回起動時のみ登録する
 */
export async function seedDefaultFilters(): Promise<void> {
  const seeded = await AsyncStorage.getItem(FILTER_SEED_KEY);
  if (seeded) return;

  const database = openDatabase();
  const now = Math.floor(Date.now() / 1000);

  database.withTransactionSync(() => {
    for (const filter of DEFAULT_FILTERS) {
      database.runSync(
        'INSERT OR IGNORE INTO filters (block_keyword, allow_keyword, target_title, target_description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [filter.block_keyword, filter.allow_keyword, filter.target_title, filter.target_description, now, now]
      );
    }
  });

  await AsyncStorage.setItem(FILTER_SEED_KEY, 'true');
}

export const ONBOARDING_KEY = StorageKeys.onboardingCompleted;

/**
 * 指定したテーブルの全行を1トランザクションで削除する。
 * テーブル名は呼び出し側のリテラル定数のみを想定（外部入力を渡さないこと）。
 */
function deleteAllFromTables(tables: string[]): void {
  const database = openDatabase();
  database.withTransactionSync(() => {
    for (const table of tables) {
      database.execSync(`DELETE FROM ${table}`);
    }
  });
}

/**
 * DB上のユーザーデータ（フィード・フィルタ・許可キーワード・記事）を1トランザクションで全削除する。
 * AsyncStorage の設定には触れない。
 *
 * feeds を消せば記事は CASCADE で連動削除されるが、意図を明示するため articles も直接消す。
 */
export function clearUserDataTables(): void {
  deleteAllFromTables(['articles', 'feeds', 'filters', 'global_allow_keywords']);
}

/**
 * すべてのデータをリセットする（DB全テーブル削除 + AsyncStorage全クリア）
 *
 * AsyncStorage は個別列挙ではなくプレフィックス走査で消す。
 * 設定キーを増やすたびに列挙し忘れて「リセットしても残る」事故を防ぐため。
 */
export async function resetAllData(): Promise<void> {
  clearUserDataTables();
  const keys = await AsyncStorage.getAllKeys();
  const filtoKeys = keys.filter((key) => key.startsWith(STORAGE_KEY_PREFIX));
  if (filtoKeys.length > 0) {
    await AsyncStorage.multiRemove(filtoKeys);
  }
}

/**
 * 「初回設定をやり直す」用のスコープ付きリセット。
 * 初回設定で作られるフィード・フィルタと、それに紐づく記事を削除して選び直せる状態にする。
 * 表示設定などの AsyncStorage とグローバル許可キーワードは保持する（初回設定の対象外のため）。
 *
 * feeds を消せば記事は CASCADE で連動削除されるが、意図を明示するため articles も直接消す。
 * グローバル許可キーワードは残すため clearUserDataTables は使わない。
 */
export async function resetFeedsAndFilters(): Promise<void> {
  deleteAllFromTables(['articles', 'feeds', 'filters']);
  // 次回（初回設定やり直し＝FirstRunScreen）でデフォルトフィードを再投入できるよう、
  // seed 済み・オンボ完了フラグを消す。これが無いと seedDefaultFeeds がスキップして
  // フィードが空のままになる。
  await AsyncStorage.multiRemove([SEED_KEY, FILTER_SEED_KEY, ONBOARDING_KEY]);
}

/**
 * フィードだけをデフォルトに戻す（フィルタ・表示設定は残す）。
 * 現在のフィード（と記事）を削除し、デフォルトフィードを再投入する。
 * オンボは完了済みのままなので FirstRunScreen は出ない。取得は呼び出し側で行う。
 * @param lang 投入する言語（アプリの言語設定を渡す）
 */
export async function resetFeedsToDefault(lang?: 'ja' | 'en'): Promise<void> {
  deleteAllFromTables(['articles', 'feeds']);
  // SEED_KEY を消して seedDefaultFeeds を再実行可能にする（FILTER/ONBOARDING は保持）。
  await AsyncStorage.removeItem(SEED_KEY);
  await seedDefaultFeeds(lang);
}

/**
 * オンボーディング完了済みかどうかを判定する（既存ユーザーも含む）
 */
export async function isOnboardingComplete(): Promise<boolean> {
  const [onboardingDone, feedsSeeded] = await Promise.all([
    AsyncStorage.getItem(ONBOARDING_KEY),
    AsyncStorage.getItem(SEED_KEY),
  ]);
  return !!(onboardingDone || feedsSeeded);
}

/**
 * オンボーディングで選択されたフィードを登録する
 */
export async function seedFeedsFromSelection(
  feeds: { id: string; title: string; url: string; iconUrl?: string }[]
): Promise<void> {
  const database = openDatabase();
  const createdAt = Math.floor(Date.now() / 1000);

  database.withTransactionSync(() => {
    feeds.forEach((feed, index) => {
      database.runSync(
        'INSERT OR IGNORE INTO feeds (id, title, url, icon_url, order_no, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [feed.id, feed.title, feed.url, feed.iconUrl ?? null, index + 1, createdAt]
      );
    });
  });

  await AsyncStorage.setItem(SEED_KEY, 'true');
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

/**
 * オンボーディングで選択されたトピックのブロックキーワードを登録する
 */
export async function seedFiltersFromTopics(keywords: string[]): Promise<void> {
  if (keywords.length > 0) {
    const database = openDatabase();
    const now = Math.floor(Date.now() / 1000);

    database.withTransactionSync(() => {
      for (const keyword of keywords) {
        database.runSync(
          'INSERT OR IGNORE INTO filters (block_keyword, allow_keyword, target_title, target_description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [keyword, null, 1, 1, now, now]
        );
      }
    });
  }

  await AsyncStorage.setItem(FILTER_SEED_KEY, 'true');
}

/**
 * デフォルトフィードを初回起動時のみ登録する。
 * @param lang 投入する言語。未指定ならデバイスのロケールから判定（アプリの言語設定を
 *   反映させたい場合は呼び出し側から渡すこと）。
 */
export async function seedDefaultFeeds(lang?: 'ja' | 'en'): Promise<void> {
  const seeded = await AsyncStorage.getItem(SEED_KEY);
  if (seeded) return;

  const resolvedLang = lang ?? (isJapaneseLocale() ? 'ja' : 'en');
  const feeds = getDefaultFeedsFlat(resolvedLang);
  const database = openDatabase();
  const createdAt = Math.floor(Date.now() / 1000);

  database.withTransactionSync(() => {
    feeds.forEach((feed, index) => {
      // 旧オンボードと同様に Google ファビコンURLを付与する（null だと新聞プレースホルダになる）
      database.runSync(
        'INSERT OR IGNORE INTO feeds (id, title, url, icon_url, order_no, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [feed.id, feed.title, feed.url, getFaviconUrl(feed.url) || null, index + 1, createdAt]
      );
    });
  });

  await AsyncStorage.setItem(SEED_KEY, 'true');
}
