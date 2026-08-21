/**
 * purchases.ts / purchases.native.ts で共有する型定義。
 * 型のみなので、web版からimportしてもネイティブモジュールの実行時crashは起きない。
 */
export type PurchaseResult =
  | { success: true }
  | { success: false; cancelled: true }
  | { success: false; cancelled: false; errorMessage: string };
