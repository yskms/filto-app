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
