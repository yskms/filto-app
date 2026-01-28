import { Translation } from './ja';

export const en: Translation = {
  // Tab bar
  tabs: {
    home: 'Home',
    filters: 'Filters',
    feeds: 'Feeds',
    settings: 'Settings',
  },

  // Settings screen
  settings: {
    title: 'Settings',
    globalAllowKeywords: 'Global Allow Keywords',
    displayBehavior: 'Display & Behavior',
    dataManagement: 'Data Management',
    pro: 'Pro',
    about: 'About',
  },

  // Display & Behavior screen
  displayBehavior: {
    title: 'Display & Behavior',
    readDisplayMode: 'Read Display Mode',
    displayMethod: 'Display Method',
    dimDisplay: 'Dim Display',
    hideDisplay: 'Hide',
    theme: 'Theme',
    themeLabel: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    language: 'Language',
    languageLabel: 'Language',
    japanese: '日本語',
    english: 'English',
    startupBehavior: 'Startup Behavior',
    autoSyncDescription: 'Automatically update RSS feeds on app startup (only if more than 30 minutes have passed)',
    selectDisplayMethod: 'Select Display Method',
    selectTheme: 'Select Theme',
    selectLanguage: 'Select Language',
  },

  // Data Management screen
  dataManagement: {
    title: 'Data Management',
    cachePeriod: 'Cache Period',
    days: 'days',
    selectCachePeriod: 'Select Cache Period',
    unlimited: 'Unlimited',
    deleteStarredOption: 'Also delete starred articles',
    manualDelete: 'Manually Delete Articles',
    deleteButton: 'Delete',
    deleting: 'Deleting...',
    selectDays: 'Select articles to delete',
    deleteAll: 'Delete All',
    olderThan: 'Older than',
    deleteConfirmTitle: 'Delete Articles',
    deleteConfirmAll: 'Delete all articles?',
    deleteConfirmOlder: 'Delete articles older than',
    deleteSuccess: 'articles deleted',
  },

  // About screen
  about: {
    title: 'About',
    version: 'Version',
    description: 'RSS Reader with Keyword Filter',
  },

  // Global Allow Keywords screen
  globalAllowKeywords: {
    title: 'Global Allow Keywords',
    remaining: 'Remaining',
    add: 'Add',
    inputPlaceholder: 'Enter keyword',
    description: 'Global allow keywords will display articles with priority over all filters.',
    freeLimit: 'Free version is limited to 3 keywords. Upgrade to Pro for unlimited.',
    emptyMessage: 'No keywords',
    emptyHint: 'Add important keywords',
    errorEmpty: 'Please enter a keyword',
    errorDuplicate: 'This keyword is already registered',
    errorLimit: 'Free version is limited to 3 keywords. Please upgrade to Pro.',
    errorFailed: 'Failed to register',
    addSuccess: 'Keyword added successfully',
    deleteConfirmTitle: 'Delete Keyword',
    deleteConfirmMessage: '?',
    deleteError: 'Failed to delete',
  },

  // Filter Edit screen
  filterEdit: {
    titleAdd: 'Add Filter',
    titleEdit: 'Edit Filter',
    blockKeyword: 'Block Keyword',
    blockKeywordPlaceholder: 'e.g. spam',
    allowKeywords: 'Allow Keywords (optional)',
    allowKeywordsHint: 'One keyword per line',
    allowKeywordsPlaceholder: 'e.g.:\nimportant\nurgent\npriority',
    searchTarget: 'Search Target',
    targetTitle: 'Title',
    targetDescription: 'Description',
    save: 'Save',
    delete: 'Delete',
    loading: 'Loading...',
    errorLoad: 'Failed to load filter',
    errorBlockKeywordRequired: 'Please enter a block keyword',
    errorTargetRequired: 'Please select at least title or description',
    errorSaveFailed: 'Failed to save. Please try again.',
    deleteConfirmTitle: 'Delete Filter',
    deleteConfirmMessage: 'Delete this filter?',
    errorDeleteFailed: 'Failed to delete. Please try again.',
  },

  // Feed Add screen
  feedAdd: {
    title: 'Add Feed',
    feedUrl: 'Feed URL',
    feedUrlPlaceholder: 'https://example.com/feed.xml',
    paste: '📋 Paste',
    fetchMeta: '🔍 Fetch Feed Info',
    fetching: 'Fetching...',
    feedName: 'Feed Name',
    optional: '(optional)',
    feedNamePlaceholder: 'My Favorite Blog',
    feedNameHint: 'If empty, URL will be used as title',
    add: 'Add',
    adding: 'Adding...',
    errorUrlRequired: 'Please enter URL',
    errorUrlInvalid: 'Please enter a valid URL',
    errorUrlProtocol: 'Please enter URL starting with http or https',
    errorFetchFailed: 'Failed to fetch feed information',
    fetchSuccess: 'Feed information fetched successfully',
  },

  // Home screen
  home: {
    all: 'ALL',
    loading: 'Loading...',
    emptyIcon: '📭',
    emptyMessage: 'No articles',
    selectFeed: 'Select Feed',
    close: 'Close',
  },

  // Filters screen
  filters: {
    title: 'Filters',
    cancel: 'Cancel',
    delete: 'Delete',
    selected: ' selected',
    deleteConfirm: ' filters?',
    deleteConfirmTitle: 'Delete Filter',
    deleteConfirmMessage: 'Delete this filter?',
    emptyIcon: '🔍',
    emptyMessage: 'No filters',
  },

  // Feeds screen
  feeds: {
    title: 'Feeds',
    cancel: 'Cancel',
    selected: ' selected',
    deleteConfirm: ' feeds?',
    deleteOneConfirm: '?',
    confirmTitle: 'Confirm',
    sortTitle: 'Sort',
    sortNameAsc: 'Name (A-Z)',
    sortNameDesc: 'Name (Z-A)',
    sortDateAsc: 'Date Added (Oldest)',
    sortDateDesc: 'Date Added (Newest)',
    emptyIcon: '📡',
    emptyMessage: 'No feeds',
    errorDelete: 'Delete Feed',
  },

  // Common
  common: {
    back: '←',
    cancel: 'Cancel',
    delete: 'Delete',
    save: 'Save',
    add: 'Add',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    limit: 'Limit',
  },
};