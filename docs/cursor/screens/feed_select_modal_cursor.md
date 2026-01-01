> IMPORTANT:
> This task MUST comply with cursor/CONSTRAINTS.md.
> No dependency or configuration changes are allowed.

# FeedSelect Modal

## Component
- FeedSelectModal
  - FeedListItem

## Props
- visible: boolean
- selectedFeedId
- onSelect(feedId | null)
- onClose()

## State
- feeds: Feed[]

## Logic
- load feeds on open

## UI
- Modal
- Touchable list
- highlight selected

## Service
- FeedService.list()

## Cursor指示
Create modal component listing ALL + feeds.
Return selected feedId on press.
