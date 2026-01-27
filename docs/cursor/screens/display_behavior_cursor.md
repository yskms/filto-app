> IMPORTANT:
> This task MUST comply with cursor/CONSTRAINTS.md.
> No dependency or configuration changes are allowed.

# Display & Behavior Screen

## Goal
Create a settings screen for display and behavior preferences.
This screen is accessible from Settings → Display & Behavior.

## Screen
- File: app/display_behavior.tsx
- Component: DisplayBehaviorScreen

## Layout & Style
- Use the same layout pattern as other settings screens:
  - SafeAreaView (top)
  - Custom header with back button
  - ScrollView for content
- Header:
  - Left: Back button (←) → router.back()
  - Center: Title "Display & Behavior"
- Background: #f8f8f8
- Sections: Use SettingSection component pattern

## Settings Items

### 1. 既読の表示方法 (Read Display Mode)
- Dropdown selector
- Options: "薄く表示" (dim) / "非表示" (hide)
- Storage: `@filto/display_behavior/readDisplay`
- Type: `ReadDisplayMode = 'dim' | 'hide'` (export this type for Home to use)

### 2. テーマ (Theme)
- Dropdown selector
- Options: "Light" / "Dark" / "System"
- Storage: `@filto/display_behavior/theme`

### 3. 言語 (Language)
- Dropdown selector
- Options: "日本語" (ja) / "English" (en)
- Storage: `@filto/display_behavior/language`

### 4. 起動時の挙動 (Launch Behavior)
- Toggle switch
- Label: "アプリ起動時に自動的にRSSフィードを更新します（30分以上経過時のみ）"
- Storage: `@filto/display_behavior/autoSyncOnStartup`
- Default: ON (true)

## Components
- DisplayBehaviorHeader: Header with back button
- SettingSection: Section wrapper with title
- Dropdown: Dropdown selector component
- DropdownModal: Modal for selecting options

## State
- readDisplay: ReadDisplayMode ('dim' | 'hide')
- autoSyncOnStartup: boolean
- theme: string ('light' | 'dark' | 'system')
- language: string ('ja' | 'en')
- Modal visibility states for each dropdown

## Logic
- Load settings from AsyncStorage on mount (useFocusEffect)
- Save to AsyncStorage on change
- Show error alert if save fails

## Navigation
- Back button → router.back() → Settings

## Storage Keys
- `@filto/display_behavior/readDisplay`
- `@filto/display_behavior/autoSyncOnStartup`
- `@filto/display_behavior/theme`
- `@filto/display_behavior/language`

## Cursor指示例
Implement DisplayBehaviorScreen with dropdown selectors and toggle.
Load and save settings using AsyncStorage.
Export ReadDisplayMode type for Home screen to import.
