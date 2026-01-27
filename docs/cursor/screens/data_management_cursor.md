> IMPORTANT:
> This task MUST comply with cursor/CONSTRAINTS.md.
> No dependency or configuration changes are allowed.

# Data Management Screen

## Goal
Create a settings screen for data management preferences.
This screen is accessible from Settings → Data Management.

## Screen
- File: app/data_management.tsx
- Component: DataManagementScreen

## Layout & Style
- Use the same layout pattern as other settings screens:
  - SafeAreaView (top)
  - Custom header with back button
  - ScrollView for content
- Header:
  - Left: Back button (←) → router.back()
  - Center: Title "Data Management"
- Background: #f8f8f8
- Sections: Use SettingSection component pattern

## Settings Items

### 1. 記事保持期間 (Article Retention Period)
- Dropdown selector
- Options: "7日" / "30日" / "90日" / "無制限"
- Storage: `@filto/data_management/articleRetentionDays`
- Toggle: "お気に入りも削除" (Delete starred articles too)
  - Storage: `@filto/data_management/deleteStarredInAutoDelete`
- Description: "設定した期間より古い記事は同期時に自動的に削除されます"

### 2. 手動削除オプション (Manual Delete Option)
- Button: "記事を今すぐ削除" → Opens modal
- ManualDeleteModal:
  - Radio buttons for period selection:
    - "全て削除" (-1)
    - "1日より古い記事" (1)
    - "3日より古い記事" (3)
    - "7日より古い記事" (7)
    - "14日より古い記事" (14)
  - Stats display: 未読/既読/お気に入り件数
  - Checkbox: "お気に入りも削除"
  - Buttons: キャンセル / 削除
- Uses ArticleRepository.getOldArticlesStats() and deleteOldArticles()

### 3. WiFi時のみ取得 (WiFi Only Fetch)
- Coming soon placeholder: "WiFi接続時のみRSSを取得" with badge "今後対応予定"

### 4. 最低更新間隔 (Minimum Update Interval)
- Coming soon placeholder: "連打防止の最低更新間隔" with badge "今後対応予定"

### 5. (将来) OPML Import/Export
- Coming soon placeholder with badge "今後対応予定"

### 6. (将来) データのバックアップ/復元
- Coming soon placeholder with badge "今後対応予定"

## Components
- DataManagementHeader: Header with back button
- SettingSection: Section wrapper with title
- Dropdown: Dropdown selector component
- DropdownModal: Modal for selecting retention period
- ManualDeleteModal: Modal for manual article deletion
- ComingSoonRow: Placeholder row for future features

## State
- articleRetentionDays: number (7 | 30 | 90 | 0)
- deleteStarredInAuto: boolean
- Retention dropdown visibility
- Manual delete modal visibility
- Manual delete selected days
- Manual delete include starred flag
- Manual delete stats
- isDeleting: boolean (for loading overlay)

## Logic
- Load settings from AsyncStorage on mount (useFocusEffect)
- Save to AsyncStorage on change
- Manual delete: Get stats → Show modal → Confirm → Delete → Show result alert
- Show loading overlay during deletion

## Navigation
- Back button → router.back() → Settings

## Storage Keys
- `@filto/data_management/articleRetentionDays`
- `@filto/data_management/deleteStarredInAutoDelete`

## Service Integration
- ArticleRepository.getOldArticlesStats(days, includeStarred)
- ArticleRepository.deleteOldArticles(days, includeStarred)
- SyncService uses these keys for auto-deletion

## Cursor指示例
Implement DataManagementScreen with retention settings and manual delete modal.
Load and save settings using AsyncStorage.
Integrate with ArticleRepository for manual deletion.
Show coming soon placeholders for future features.
