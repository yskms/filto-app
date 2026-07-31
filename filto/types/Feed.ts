export interface Feed {
  id: string;
  title: string;
  url: string;
  iconUrl?: string;
  orderNo: number;
  createdAt: string;
  /** ホームの記事一覧から除外する（ミュート）。削除ではなく非表示。 */
  hiddenFromHome: boolean;
}

