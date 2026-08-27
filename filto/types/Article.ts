export interface Article {
  id: string;
  feedId: string;
  feedName: string;
  title: string;
  link: string;
  summary?: string;
  thumbnailUrl?: string;
  publishedAt: string;
  /**
   * ホームの表示順。大きいほど上。保存時に一度だけ確定し、通常の同期では以後変えない
   * （バックアップ復元では振り直す）。
   * undefined は「未採番」＝まだ順番が決まっておらずホームに出ていない状態。
   */
  displayOrder?: number;
  isRead: boolean;
  isStarred: boolean;
}
