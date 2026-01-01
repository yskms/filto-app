> IMPORTANT:
> This task MUST comply with cursor/CONSTRAINTS.md.
> No dependency or configuration changes are allowed.

# Home Screen

## Component構成
- HomeScreen
  - Header
    - FeedSelectorButton
    - RefreshButton
  - ArticleList
    - ArticleItem
  - TabBar（共通）

## State
- selectedFeedId: string | null ("ALL" = null)
- articles: Article[]
- loading: boolean
- error: string | null

## Effect / Logic
- useEffect:
  - 初期表示時:
    - if settings.refreshOnLaunch → SyncService.refresh()
    - load articles
  - selectedFeedId変更時:
    - ArticleService.getArticles(feedId)

- onRefresh():
  - set loading
  - SyncService.refresh()
  - reload articles

- onPressArticle(article):
  - openLink(article.link)
  - ArticleService.markRead(id)

## Props (ArticleItem)
- article: Article
  - title
  - feedName
  - publishedAt
  - thumbnail?
  - isRead

## UI要件
- FlatList使用
- pull-to-refresh対応
- 既読は薄く表示 or 非表示（settings）

## Navigation
- open FeedSelect modal

## Service
- ArticleService.getArticles(feedId?)
- ArticleService.markRead(id)
- SyncService.refresh()

## Cursor指示例
Implement HomeScreen with FlatList showing articles.
Include header with feed selector modal and refresh button.
Apply filters and read-state styles based on settings.
Use ArticleService and SyncService as described.
