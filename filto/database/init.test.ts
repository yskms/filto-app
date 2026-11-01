import { beforeEach, describe, expect, it, vi } from 'vitest';

// v1.5.6 の Play Console に出た exsqlite3_step / getColumnNames の SIGSEGV 対策の回帰テスト。
// 初期化が成功済みのランタイムで、後から来た初期化要求が接続を閉じ直さないことを守る
// （閉じ直すと、ホームの実行中クエリの下でステートメントが finalize されてネイティブで落ちる）。

const { openDatabaseSyncMock, getItemMock, setItemMock } = vi.hoisted(() => ({
  openDatabaseSyncMock: vi.fn(),
  getItemMock: vi.fn(),
  setItemMock: vi.fn(),
}));

vi.mock('expo-sqlite', () => ({ openDatabaseSync: openDatabaseSyncMock }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: getItemMock, setItem: setItemMock, removeItem: vi.fn() },
}));
vi.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'ja' }] }));
vi.mock('expo-updates', () => ({ runtimeVersion: '1.5.7' }));

function createFakeDatabase() {
  return {
    execSync: vi.fn(),
    closeSync: vi.fn(),
    withTransactionSync: vi.fn((callback: () => void) => callback()),
    // user_version を現行版にして移行を走らせない
    getFirstSync: vi.fn(() => ({ user_version: 1 })),
    // テーブルが無い扱い（ensureColumn は何もしない）
    getAllSync: vi.fn(() => []),
  };
}

type FakeDatabase = ReturnType<typeof createFakeDatabase>;

async function loadInit() {
  vi.resetModules();
  return import('./init');
}

describe('ensureDatabaseInitialized', () => {
  let databases: FakeDatabase[];

  beforeEach(() => {
    vi.stubGlobal('__DEV__', true);
    getItemMock.mockReset();
    setItemMock.mockReset();
    openDatabaseSyncMock.mockReset();
    databases = [];
    openDatabaseSyncMock.mockImplementation(() => {
      const database = createFakeDatabase();
      databases.push(database);
      return database;
    });
  });

  it('初期化が成功済みなら、再度呼ばれても接続を作り直さない', async () => {
    const { ensureDatabaseInitialized, openDatabase } = await loadInit();

    await ensureDatabaseInitialized();
    const connection = openDatabase();
    // 実行中の初期化への合流ではなく「成功済み」の判定を検証するため、
    // 初期化の後始末（microtask）が終わるまで待ってから呼ぶ
    await new Promise((resolve) => setTimeout(resolve, 0));
    // BackgroundSync の初回実行に相当する、UI 初期化後の2回目の呼び出し
    await ensureDatabaseInitialized();

    expect(openDatabaseSyncMock).toHaveBeenCalledOnce();
    expect(databases[0].closeSync).not.toHaveBeenCalled();
    expect(openDatabase()).toBe(connection);
  });

  it('実行中の初期化には合流し、後発として再実行しない', async () => {
    const { ensureDatabaseInitialized } = await loadInit();

    // UI と BackgroundSync がほぼ同時に呼ぶ場合
    await Promise.all([ensureDatabaseInitialized(), ensureDatabaseInitialized()]);

    expect(openDatabaseSyncMock).toHaveBeenCalledOnce();
    expect(databases[0].closeSync).not.toHaveBeenCalled();
  });

  it('失敗は記憶せず、次の呼び出しで初期化をやり直す（再試行ボタンを殺さない）', async () => {
    openDatabaseSyncMock.mockImplementationOnce(() => {
      const database = createFakeDatabase();
      database.execSync.mockImplementation(() => {
        throw new Error('disk I/O error');
      });
      databases.push(database);
      return database;
    });
    const { ensureDatabaseInitialized } = await loadInit();

    await expect(ensureDatabaseInitialized()).rejects.toThrow('disk I/O error');
    await expect(ensureDatabaseInitialized()).resolves.toBeUndefined();

    expect(openDatabaseSyncMock).toHaveBeenCalledTimes(2);
    // 失敗した接続は、再試行の openDatabase(true) で閉じられる（実行中のクエリは無い）
    expect(databases[0].closeSync).toHaveBeenCalledOnce();
    expect(databases[1].closeSync).not.toHaveBeenCalled();

    // 成功したあとは再実行しない
    await ensureDatabaseInitialized();
    expect(openDatabaseSyncMock).toHaveBeenCalledTimes(2);
  });

  it('失敗中に同時に来た呼び出しは、同じ失敗を受け取る', async () => {
    openDatabaseSyncMock.mockImplementationOnce(() => {
      const database = createFakeDatabase();
      database.execSync.mockImplementation(() => {
        throw new Error('disk I/O error');
      });
      databases.push(database);
      return database;
    });
    const { ensureDatabaseInitialized } = await loadInit();

    const results = await Promise.allSettled([
      ensureDatabaseInitialized(),
      ensureDatabaseInitialized(),
    ]);

    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(openDatabaseSyncMock).toHaveBeenCalledOnce();
  });
});
