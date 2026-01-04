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

1. Feeds
2. Filters
3. Preferences
4. Pro (disabled)

Each item should:
- Be a full-width touchable row
- Show a right arrow (› or >)
- Have consistent height and padding
- Follow the visual style used in Filters list items

## Navigation Behavior
- Feeds → console.log("go to feeds")
- Filters → router.push("/filters")
- Preferences → console.log("go to preferences")
- Pro:
  - Disabled (no navigation)
  - Visually muted (gray text)

## Constraints
- Do NOT implement Feeds / Preferences screens
- Do NOT add icons or external libraries
- Do NOT change routing or tab configuration
- No business logic

## Notes
This screen is intentionally minimal.
It will be extended later.
