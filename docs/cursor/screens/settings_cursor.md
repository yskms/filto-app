> IMPORTANT:
> This task MUST comply with cursor/CONSTRAINTS.md.
> No dependency or configuration changes are allowed.
> UI-only implementation. No service / DB logic.

# Settings Screen

## Goal
Create a simple Settings screen that acts as a navigation hub.
This screen is required before implementing Feeds.

## Screen
- File: app/(tabs)/settings.tsx
- Component: SettingsScreen

## Layout & Style
- Use the same layout pattern as Home / Filters:
  - SafeAreaView (top)
  - Custom header inside the screen (NOT navigation header)
- Header:
  - Title: "Settings"
- Background: white
- FlatList or simple View-based list is acceptable

## Menu Items
Create a vertical menu list with the following items:

1. Global Allow Keywords
2. Display & Behavior
3. Data Management
4. Pro (disabled)
5. About

Each item should:
- Be a full-width touchable row
- Show a right arrow (› or >)
- Have consistent height and padding
- Follow the visual style used in Filters list items

## Navigation Behavior
- Global Allow Keywords → router.push("/global_allow_keywords")
- Display & Behavior → router.push("/display_behavior")
- Data Management → router.push("/data_management")
- Pro:
  - Disabled (no navigation)
  - Visually muted (gray text)

## Constraints
- Do NOT implement Feeds / Display & Behavior / Data Management の実装は別タスク
- Do NOT add icons or external libraries
- Do NOT change routing or tab configuration
- No business logic

## Notes
This screen is intentionally minimal.
It will be extended later.
