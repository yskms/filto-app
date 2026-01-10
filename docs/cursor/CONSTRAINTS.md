# Cursor Development Constraints (IMPORTANT)

This document defines **strict constraints** for Cursor-assisted development.
Cursor MUST follow these rules.

---

## 🚫 Forbidden Actions

Cursor MUST NOT do the following without explicit user instruction:

- Run or suggest any of these commands:
  - `npm install`
  - `yarn install`
  - `pnpm install`
  - `npx install`
  - `npx create-*`
  - `expo init`
  - `create-expo-app`
- Modify `package.json`, `package-lock.json`, or `node_modules`
- Add, remove, or update dependencies
- Change project folder structure
- Reinitialize Expo or React Native project
- Introduce new libraries or frameworks
- Change TypeScript / Babel / Metro / Expo configuration

---

## ✅ Allowed Actions

Cursor MAY do the following:

- Create or edit source files **inside existing folders only**
- Implement UI components using **existing dependencies**
- Implement logic strictly according to provided design documents
- Refactor code **only when explicitly requested**
- Ask clarification questions if unsure

---

## 📐 Design Authority

Cursor MUST treat the following documents as the single source of truth:

- `docs/README.md`
- `docs/01_requirements/*`
- `docs/02_basic_design/*`
- `docs/04_detail_design/*`
- `cursor/*_cursor.md`

If there is any conflict between code and documents,
**documents always take precedence**.

---

## 🛑 Default Behavior

When uncertain, Cursor MUST:

1. Stop
2. Ask the user
3. Wait for confirmation

---

## 🧠 Goal

The goal is to implement **Filto** exactly as designed:
- Local-first
- No account
- No background polling
- No overengineering

---

## 📛 命名規則

### ファイル名

| 種類 | 命名規則 | 例 |
|------|---------|-----|
| **画面** | snake_case.tsx | `filter_edit.tsx`, `feed_add.tsx` |
| **コンポーネント** | PascalCase.tsx | `FilterItem.tsx`, `Header.tsx` |
| **サービス** | PascalCase.ts | `FilterService.ts`, `FeedService.ts` |
| **リポジトリ** | PascalCase.ts | `FilterRepository.ts`, `FeedRepository.ts` |
| **ユーティリティ** | camelCase.ts | `dateUtils.ts`, `stringUtils.ts` |
| **型定義** | PascalCase.ts | `Filter.ts`, `Feed.ts` |
| **定数** | UPPER_SNAKE_CASE.ts | `API_CONSTANTS.ts` |

### 変数・関数名

| 種類 | 命名規則 | 例 |
|------|---------|-----|
| **変数** | camelCase | `filterList`, `isLoading` |
| **定数** | UPPER_SNAKE_CASE | `MAX_FILTERS`, `API_URL` |
| **関数** | camelCase | `handleSave()`, `fetchData()` |
| **クラス** | PascalCase | `FilterService`, `DatabaseManager` |
| **インターフェース** | PascalCase | `Filter`, `FeedItem` |
| **型エイリアス** | PascalCase | `FilterId`, `Timestamp` |

### React コンポーネント
```typescript
// ✅ 推奨
export default function FilterEditScreen() { }
const FilterItem: React.FC<Props> = ({ ... }) => { }

// ❌ 非推奨
export default function filterEditScreen() { }
const filter_item = ({ ... }) => { }
```

### インポート
```typescript
// ✅ 推奨
import { FilterService } from '@/services/FilterService';
import { Filter } from '@/types/Filter';
import { formatDate } from '@/utils/dateUtils';

// ❌ 非推奨
import FilterService from '@/services/filter_service';
```

### ディレクトリ構造
```
filto/
├─ app/                    # 画面（snake_case）
│  ├─ (tabs)/
│  │  ├─ index.tsx
│  │  ├─ filters.tsx
│  │  └─ settings.tsx
│  ├─ filter_edit.tsx
│  └─ feed_add.tsx
├─ components/             # コンポーネント（PascalCase）
│  ├─ FilterItem.tsx
│  └─ Header.tsx
├─ services/               # サービス（PascalCase）
│  ├─ FilterService.ts
│  └─ FeedService.ts
├─ repositories/           # リポジトリ（PascalCase）
│  ├─ FilterRepository.ts
│  └─ FeedRepository.ts
├─ utils/                  # ユーティリティ（camelCase）
│  ├─ dateUtils.ts
│  └─ stringUtils.ts
├─ types/                  # 型定義（PascalCase）
│  ├─ Filter.ts
│  └─ Feed.ts
└─ constants/              # 定数（UPPER_SNAKE_CASE）
   └─ API_CONSTANTS.ts
```

### データベース（SQLite）
```sql
-- テーブル名: snake_case
CREATE TABLE filters ( ... );
CREATE TABLE global_allow_keywords ( ... );

-- カラム名: snake_case
block_keyword
allow_keyword
target_title
created_at
```

### 理由

- **一貫性**: プロジェクト全体で統一
- **可読性**: 種類によって命名規則を変えることで、ファイルの役割が一目で分かる
- **TypeScript慣習**: 業界標準に準拠
- **React Native慣習**: Expoプロジェクトの一般的なパターン
