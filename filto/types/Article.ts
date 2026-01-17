export interface Article {
  id: string;
  feedId: string;
  feedName: string;
  title: string;
  link: string;
  summary?: string;
  thumbnailUrl?: string;
  publishedAt: string;
  isRead: boolean;
}

