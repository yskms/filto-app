> IMPORTANT:
> This task MUST comply with cursor/CONSTRAINTS.md.
> No dependency or configuration changes are allowed.

# Preferences Screen

## Component
- PreferencesScreen
  - ToggleItem / SelectItem list

## State
- settings: Settings

## Fields
- refreshOnLaunch: boolean
- fetchMode: 'manual' | 'low'
- wifiOnly: boolean
- readDisplay: 'dim' | 'hide'
- language: 'ja' | 'en'
- theme: 'light' | 'dark'

## Logic
- load settings on mount
- update on change → SettingsService.save()

## Service
- SettingsService.get()
- SettingsService.save()

## Cursor指示
Implement preferences screen with toggles and persistence.
