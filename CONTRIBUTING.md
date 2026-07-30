# 開発ガイド / Contributing

Filto は個人開発プロジェクトです。このドキュメントには、開発時のプロジェクト構成・ルール・命名規約をまとめています。

---

## プロジェクト構成

```txt
FILTO-APP/
├─ filto/          # アプリ本体（Expo + React Native）
│  ├─ app/         # UI / Screens（Expo Router）
│  ├─ components/  # 共通UIコンポーネント
│  ├─ hooks/       # カスタムフック
│  ├─ constants/   # テーマなどの定数
│  └─ ...          # その他アプリ関連コード
└─ docs/           # 設計ドキュメント一式
```

---

## ドキュメント

- **要件定義**: [00_main_spec.md](docs/01_requirements/00_main_spec.md) - アプリ全体の仕様
- **開発計画**: [01_wbs.md](docs/03_dev_plan/01_wbs.md) - 開発スケジュール
- **基本設計**: [02_basic_design/](docs/02_basic_design/) - 画面遷移図・DB設計・API設計など
- **詳細設計**: [04_detail_design/](docs/04_detail_design/) - 各画面の詳細仕様
- **Cursor指示書**: [cursor/](docs/cursor/) - Cursor向け実装用プロンプト

詳細は [00_main_spec.md](docs/01_requirements/00_main_spec.md) の「ドキュメント構成」を参照してください。

---

## 開発ルール

### コミットメッセージ規約

- `feat`: 新機能・画面追加
- `fix`: バグ修正
- `refactor`: 挙動を変えない内部整理
- `docs`: 設計書・README修正
- `chore`: 設定・雑務（機能影響なし）

#### 方針

- 1コミット = 1意図
- UIのみでも feat とする
- 迷ったら feat を使う

---

## 命名規則

### ファイル名

| 種類 | 命名規則 | 例 |
|------|---------|-----|
| **画面** | snake_case.tsx | `filter_edit.tsx`, `feed_add.tsx` |
| **コンポーネント** | PascalCase.tsx | `FilterItem.tsx`, `Header.tsx` |
| **サービス** | PascalCase.ts | `FilterService.ts`, `FeedService.ts` |
| **リポジトリ** | PascalCase.ts | `FilterRepository.ts`, `FeedRepository.ts` |
| **ユーティリティ** | camelCase.ts | `dateUtils.ts`, `stringUtils.ts` |
| **型定義** | PascalCase.ts | `Filter.ts`, `Feed.ts` |

### 変数・関数名

| 種類 | 命名規則 | 例 |
|------|---------|-----|
| **変数** | camelCase | `filterList`, `isLoading` |
| **関数** | camelCase | `handleSave()`, `fetchData()` |
| **クラス** | PascalCase | `FilterService`, `DatabaseManager` |
| **定数** | UPPER_SNAKE_CASE | `MAX_FILTERS`, `API_URL` |

### ディレクトリ構造

```txt
docs/
filto/
├─ app/                    # 画面（snake_case）
├─ components/             # コンポーネント（PascalCase）
├─ services/               # サービス（PascalCase）
├─ repositories/           # リポジトリ（PascalCase）
├─ utils/                  # ユーティリティ（camelCase）
├─ types/                  # 型定義（PascalCase）
└─ constants/              # 定数（UPPER_SNAKE_CASE）
```

### データベース（SQLite）

- **テーブル名**: snake_case (`filters`, `global_allow_keywords`)
- **カラム名**: snake_case (`block_keyword`, `created_at`)
