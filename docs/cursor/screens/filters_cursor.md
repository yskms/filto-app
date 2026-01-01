# Filters Screen

## Component
- FiltersScreen
  - Header (deleteMode)
  - FilterList
    - FilterItem (edit button)
  - FloatingAddButton

## State
- filters: Filter[]
- deleteMode: boolean
- selectedIds: string[]

## Logic
- load filters on focus
- onDelete → FilterService.delete(ids)

## Navigation
- → FilterEdit(id?)
- Tab root

## Service
- FilterService.list()
- FilterService.delete(ids)

## Cursor指示
Implement filter list screen with edit and delete mode.
