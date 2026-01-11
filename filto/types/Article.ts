export interface Article {
  id: string;
  feedId: string;
  feedName: string;
  title: string;
  link: string;
  summary?: string;
  publishedAt: string;
  isRead: boolean;
}

