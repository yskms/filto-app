# Feeds Screen

## Component
- FeedsScreen
  - Header (deleteMode toggle)
  - DraggableFlatList
    - FeedItem
  - FloatingAddButton

## State
- feeds: Feed[]
- deleteMode: boolean
- selectedIds: string[]

## Logic
- load feeds on focus
- onDragEnd → FeedService.reorder()
- onDelete → FeedService.delete(ids)

## UI
- long press to drag
- delete mode shows checkbox or highlight

## Navigation
- → FeedAdd

## Service
- FeedService.list()
- FeedService.reorder(list)
- FeedService.delete(ids)

## Cursor指示
Implement feed management screen with draggable list and delete mode.
