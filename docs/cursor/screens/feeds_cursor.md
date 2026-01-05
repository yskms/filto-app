> IMPORTANT:
> This task MUST comply with cursor/CONSTRAINTS.md.
> No dependency or configuration changes are allowed.

# Feeds Screen（Phase 1）

## Goal
Implement Feeds management screen UI only.
This phase focuses on layout and interaction, not persistence.

## Component Structure
- FeedsScreen
  - Header
    - title: "Feeds"
    - delete mode toggle (🗑)
  - DraggableFlatList
    - FeedItem
  - Floating Add Button（＋）

## Data
- Use dummy data only
- Feed object example:
  - id
  - title
  - url
  - icon (emoji or placeholder)

## State
- feeds: Feed[]
- deleteMode: boolean
- selectedIds: number[]

## UI Behavior
- Normal mode:
  - Long press on handle → drag to reorder
- Delete mode:
  - Row tap toggles selection
  - Selected rows are highlighted
  - Dragging is disabled
- Add button:
  - console.log("add feed")

## Constraints
- UI only (no DB / no Service calls)
- Do NOT implement FeedAdd screen
- Do NOT persist reorder result
- Follow existing Header and List styles used in Home / Filters
- Header height must be 48px (per UI conventions)
- SafeAreaView usage only (StatusBar handled in Root)

## Navigation
- No actual navigation yet
- console.log is sufficient

## Notes
- This is Phase 1.
- Future phases will connect services and persistence.

UI only. Do not connect services or add new dependencies.
