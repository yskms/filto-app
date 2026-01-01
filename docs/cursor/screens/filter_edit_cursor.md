> IMPORTANT:
> This task MUST comply with cursor/CONSTRAINTS.md.
> No dependency or configuration changes are allowed.

# FilterEdit Screen

## Component
- FilterEditScreen
  - TextInput(name)
  - ConditionBuilder
    - rows of { type: include|exclude, keyword }
    - operator AND/OR
  - SaveButton

## Props
- route.params.filterId? (undefined = new)

## State
- name: string
- conditions: Condition[]
- operator: 'AND' | 'OR'

## Logic
- if filterId:
  - load filter and init state
- onSave():
  - build JSON
  - FilterService.save()

## Condition JSON例
{
  "operator": "AND",
  "rules": [
    { "type": "include", "keyword": "新卒" },
    { "type": "exclude", "keyword": "react" }
  ]
}

## Service
- FilterService.get(id)
- FilterService.save(filter)

## Cursor指示
Implement filter edit screen with dynamic condition builder and save logic.
