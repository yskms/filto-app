# FilterEdit Screen Implementation Guide

> IMPORTANT:
> This task MUST comply with cursor/CONSTRAINTS.md.
> No dependency or configuration changes are allowed.

---

## Component Path
```
filto/app/(tabs)/filters/edit.tsx
```

---

## Overview
Filter creation and editing screen with block/allow keyword logic.

---

## Screen Specifications

### Header
- Left: Back button (`router.back()`)
- Center: "Add Filter" (new) / "Edit Filter" (edit)
- Right: None

### Form Fields

#### 1. Block Keyword (Required)
- Label: "ブロックキーワード"
- Type: Single-line TextInput
- Placeholder: "例: FX"
- Validation: Cannot be empty
- **Single keyword only**

#### 2. Allow Keywords (Optional)
- Label: "許可キーワード（任意）"
- Type: Multi-line TextInput (3-4 lines)
- Placeholder:
  ```
  例:
  仮想通貨
  web3
  crypto
  ```
- Hint: "1行に1キーワード"
- **Newline-separated** for multiple keywords
- OR condition (any match = allow)
- Can be empty

#### 3. Target Scope (Checkboxes)
- Label: "対象"
- Two checkboxes:
  - ☑ タイトル (default: ON)
  - ☑ 概要 (default: ON)
- At least one must be ON
- Use simple checkbox UI (☑/☐)

#### 4. Buttons

**New Filter:**
```
[ 保存 ]
```

**Edit Filter:**
```
[ 保存 ]  [ 削除 ]
```

- Save button:
  - Text: "保存"
  - Disabled when:
    - block_keyword is empty
    - Both target_title and target_description are OFF
    - isSaving is true
  - Show "保存中..." or spinner when saving

- Delete button (edit mode only):
  - Text: "削除"
  - Red text color
  - Show confirmation dialog on tap
  - Navigate back to Filters after deletion

---

## Props / Route Params
```typescript
// From router
const { filterId } = useLocalSearchParams<{ filterId?: string }>();

// filterId:
// - undefined → New filter
// - number string → Edit existing filter
```

---

## State Management
```typescript
const [blockKeyword, setBlockKeyword] = useState('');
const [allowKeywords, setAllowKeywords] = useState(''); // Newline-separated
const [targetTitle, setTargetTitle] = useState(true);
const [targetDescription, setTargetDescription] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
```

---

## Data Flow

### Load Filter (Edit Mode)
```typescript
useEffect(() => {
  if (filterId) {
    loadFilter();
  }
}, [filterId]);

async function loadFilter() {
  try {
    const filter = await FilterService.get(parseInt(filterId));
    
    setBlockKeyword(filter.block_keyword);
    
    // Convert comma-separated to newline-separated
    setAllowKeywords(
      filter.allow_keyword
        ?.split(',')
        .map(k => k.trim())
        .join('\n') || ''
    );
    
    setTargetTitle(filter.target_title === 1);
    setTargetDescription(filter.target_description === 1);
  } catch (error) {
    Alert.alert('エラー', 'フィルタの読み込みに失敗しました');
    router.back();
  }
}
```

### Save Filter
```typescript
async function handleSave() {
  // Validation
  if (!blockKeyword.trim()) {
    Alert.alert('エラー', 'ブロックキーワードを入力してください');
    return;
  }

  if (!targetTitle && !targetDescription) {
    Alert.alert('エラー', 'タイトルまたは概要のいずれかを選択してください');
    return;
  }

  setIsSaving(true);

  try {
    // Convert newline-separated to comma-separated
    const allowKeywordsForDB = allowKeywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .join(',');

    const filter = {
      id: filterId ? parseInt(filterId) : undefined,
      block_keyword: blockKeyword.trim(),
      allow_keyword: allowKeywordsForDB || null,
      target_title: targetTitle ? 1 : 0,
      target_description: targetDescription ? 1 : 0,
      created_at: filterId ? undefined : Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    };

    await FilterService.save(filter);
    // FilterService.save() internally calls evaluateAll()
    
    router.back();
  } catch (error) {
    Alert.alert('エラー', '保存に失敗しました。もう一度お試しください。');
  } finally {
    setIsSaving(false);
  }
}
```

### Delete Filter
```typescript
async function handleDelete() {
  Alert.alert(
    'フィルタを削除',
    'このフィルタを削除しますか？',
    [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await FilterService.delete(parseInt(filterId));
            // FilterService.delete() internally calls evaluateAll()
            router.back();
          } catch (error) {
            Alert.alert('エラー', '削除に失敗しました。もう一度お試しください。');
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]
  );
}
```

---

## Filter Logic (Implemented in FilterService)

```typescript
// Pseudo-code for reference (DO NOT implement in UI)

// 1. Check global allow list first (highest priority)
if (globalAllowKeywords.some(kw => article contains kw)) {
  return false; // is_blocked = false (allow)
}

// 2. Normal filter evaluation
if (article contains block_keyword) {
  if (allow_keyword) {
    const allowKeywords = allow_keyword.split(',');
    if (allowKeywords.some(kw => article contains kw)) {
      return false; // is_blocked = false (allow as exception)
    }
  }
  return true; // is_blocked = true (block)
}

return false; // is_blocked = false (not blocked)
```

---

## DB Schema
```typescript
interface Filter {
  id?: number;
  block_keyword: string;
  allow_keyword: string | null; // Comma-separated: "仮想通貨,web3,crypto"
  target_title: number;          // 0 or 1
  target_description: number;    // 0 or 1
  created_at: number;            // UnixTime (seconds)
  updated_at: number;            // UnixTime (seconds)
}
```

---

## Service Methods

### FilterService.get()
```typescript
async get(id: number): Promise<Filter>
```

### FilterService.save()
```typescript
async save(filter: Filter): Promise<void>
// After saving, automatically calls evaluateAll()
```

### FilterService.delete()
```typescript
async delete(id: number): Promise<void>
// After deleting, automatically calls evaluateAll()
```

### FilterService.evaluateAll()
```typescript
async evaluateAll(): Promise<void>
// Re-evaluates all articles with:
// 1. Global allow list (priority)
// 2. Normal filters
// Updates is_blocked for all articles
```

---

## Pro Version Limit

### Free Version
- Max filters: **100**
- Regex: **Not supported**

### Pro Version
- Max filters: **Unlimited**
- Regex: **Supported** (future)

### Limit Reached Behavior
```typescript
// On Filters screen (NOT in FilterEdit)
// When tapping + button with 100 filters:

const filterCount = await FilterService.count();

if (filterCount >= 100 && !isPro) {
  Alert.alert(
    'フィルタの上限',
    '無料版では100個までフィルタを作成できます。',
    [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'Pro版を見る',
        onPress: () => router.push('/settings/pro'),
      },
    ]
  );
  return; // Don't navigate to FilterEdit
}

router.push('/filters/edit');
```

---

## Duplicate Keywords

### Specification
- **Duplicates are fully allowed**
- No warnings
- No checks

### Reason
```
Same keyword with different allow conditions:

Filter 1: FX → allow if contains "仮想通貨"
Filter 2: FX → allow if contains "web3"
Filter 3: FX → allow if contains "投資"

→ Manage different contexts separately
```

---

## UI/UX Details

### Input Field Styling
- Follow existing Home/Filters/Feeds design
- Use `<TextInput>` from React Native
- Apply theme colors via ThemeContext
- Padding: 12-16px
- Border radius: 8px
- Border: 1px solid (theme border color)

### Checkbox Styling
- Use simple text-based checkbox: "☑" / "☐"
- Or use `<Pressable>` with conditional icon
- Align horizontally: `[☑ タイトル] [☑ 概要]`

### Button Styling
- Save: Primary button style
- Delete: Red text color, outlined style
- Disabled: Opacity 0.5, no interaction

### Loading State
- Show spinner or "保存中..." text
- Disable all inputs during save/delete

---

## Error Handling

### Save Error
```typescript
catch (error) {
  Alert.alert(
    'エラー',
    '保存に失敗しました。もう一度お試しください。'
  );
  setIsSaving(false);
}
```

### Delete Error
```typescript
catch (error) {
  Alert.alert(
    'エラー',
    '削除に失敗しました。もう一度お試しください。'
  );
  setIsDeleting(false);
}
```

### Load Error
```typescript
catch (error) {
  Alert.alert('エラー', 'フィルタの読み込みに失敗しました');
  router.back();
}
```

---

## Navigation

### From
- **New filter**: Filters screen → FilterEdit (filterId: undefined)
  - Tap + button
- **Edit filter**: Filters screen → FilterEdit (filterId: number)
  - **Tap filter row (in normal mode)**
  - Swipe delete is for deletion only (does not navigate to edit screen)

### To
- Save success → Back to Filters (`router.back()`)
- Delete success → Back to Filters (`router.back()`)
- Back button → Back to Filters (`router.back()`)

### Notes
- Filters screen automatically reloads data when focused (via `useFocusEffect`)
- Delete mode is automatically disabled when navigating to other tabs

---

## Examples

### Example 1: Simple Block
```
Block Keyword: FX
Allow Keywords: (empty)
Target: ☑タイトル ☑概要
→ Block all articles containing "FX"
```

### Example 2: Block with Exceptions
```
Block Keyword: 新卒
Allow Keywords:
  react
  typescript
Target: ☑タイトル ☑概要
→ Block "新卒" but allow if contains "react" OR "typescript"
```

### Example 3: Multiple Allow Keywords
```
Block Keyword: FX
Allow Keywords:
  仮想通貨
  web3
  crypto
  ビットコイン
Target: ☑タイトル ☑概要
→ Block "FX" but allow if contains any crypto-related keyword
```

---

## Implementation Notes

### Why Newline-Separated Input?
- Simple to implement
- Easy to edit
- Intuitive for users
- Tag UI is reserved for future improvement

### Why Single Block Keyword?
- 1 filter = 1 block target
- For multiple block keywords, create multiple filters
- Benefits:
  - Clear filter list
  - Individual edit/disable capability
  - Simple logic

### Global Allow List Relationship
- Global allow list keywords override ALL filters
- Managed in Global Allow Keywords screen (Settings 配下). Not in FilterEdit.
- FilterService automatically checks global allow list first

---

## Testing Checklist

- [ ] New filter creation works
- [ ] Edit existing filter works
- [ ] Delete filter works (with confirmation)
- [ ] Save button disabled when block_keyword is empty
- [ ] Save button disabled when both checkboxes are OFF
- [ ] Allow keywords conversion (newline ↔ comma) works correctly
- [ ] Validation errors show appropriate alerts
- [ ] Navigation back to Filters works
- [ ] Loading state shows spinner/text
- [ ] Error handling shows alerts
- [ ] Filters are re-evaluated after save/delete

---

## References
- Detail Design: `docs/04_detail_design/screens/filter_edit.md`
- DB Design: `docs/02_basic_design/03_db_design.md`
- API Design: `docs/02_basic_design/06_api_design.md`
- CRUD Matrix: `docs/02_basic_design/05_crud_matrix.md`