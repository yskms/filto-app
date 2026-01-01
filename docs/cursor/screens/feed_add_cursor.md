> IMPORTANT:
> This task MUST comply with cursor/CONSTRAINTS.md.
> No dependency or configuration changes are allowed.

# FeedAdd Screen

## Component
- FeedAddScreen
  - TextInput(url)
  - Preview (title, icon)
  - Button(fetch)
  - Button(add)

## State
- url: string
- loading: boolean
- meta: { title, icon } | null
- error: string | null

## Logic
- onFetch():
  - validate url
  - meta = RssService.fetchMeta(url)
- onAdd():
  - FeedService.create(meta)

## Navigation
- goBack()

## Service
- RssService.fetchMeta(url)
- FeedService.create()

## Cursor指示
Create RSS add screen with URL paste input, fetch preview, and save.
