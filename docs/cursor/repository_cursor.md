
---

# 🤖 Cursor用 Repository / DAO層 実装指示（Markdown）

```md
# Cursor Prompt: Implement Repository / DAO Layer

You are implementing the Repository and DAO layer for a React Native + Expo app.
Use TypeScript and expo-sqlite.
Follow the design below strictly.

---

## Directory Structure

/db
  - database.ts        // sqlite open & helper
  - migrations.ts      // create tables

/dao
  - FeedDao.ts
  - ArticleDao.ts
  - FilterDao.ts
  - SettingsDao.ts
  - MetaDao.ts

/repositories
  - FeedRepository.ts
  - ArticleRepository.ts
  - FilterRepository.ts
  - SettingsRepository.ts
  - MetaRepository.ts

---

## database.ts

- export getDb(): SQLiteDatabase
- open DB named "sff.db"
- helper execute(sql, params?) returning Promise

---

## migrations.ts

Create tables if not exist:

### feeds
- id TEXT PK
- title TEXT
- url TEXT
- icon_url TEXT
- order_no INTEGER
- created_at TEXT

### articles
- id TEXT PK
- feed_id TEXT
- feed_name TEXT
- title TEXT
- link TEXT UNIQUE
- summary TEXT
- published_at TEXT
- is_read INTEGER

### filters
- id TEXT PK
- name TEXT
- conditions TEXT
- created_at TEXT

### settings
- id INTEGER PK (always 1)
- refresh_on_launch INTEGER
- fetch_mode TEXT
- wifi_only INTEGER
- read_display TEXT
- language TEXT
- theme TEXT
- is_pro INTEGER

### meta
- key TEXT PK
- value TEXT

---

## DAO Requirements

Each DAO should:
- import getDb()
- implement raw SQL for CRUD
- map rows to JS objects
- all methods async

Example methods per DAO:

### FeedDao
- findAll()
- findById(id)
- insert(feed)
- update(feed)
- deleteByIds(ids)
- updateOrders(feeds)

### ArticleDao
- findAll()
- findByFeed(feedId)
- insertMany(articles)
- markRead(id)
- markAllRead(feedId?)
- deleteOld(before)
- existsByLink(link)

### FilterDao
- findAll()
- findById(id)
- upsert(filter)
- deleteByIds(ids)

### SettingsDao
- get()
- save(partial)

### MetaDao
- get(key)
- set(key, value)

---

## Repository Requirements

Each Repository:
- wraps corresponding DAO
- exposes domain-friendly API
- no SQL inside repositories

### FeedRepository API
- list()
- get(id)
- insert(feed)
- update(feed)
- delete(ids)
- bulkUpdateOrder(feeds)

### ArticleRepository API
- listAll()
- listByFeed(feedId)
- insertMany(articles)
- markRead(id)
- markAllRead(feedId?)
- deleteOld(before)
- existsByLink(link)

### FilterRepository API
- list()
- get(id)
- upsert(filter)
- delete(ids)

### SettingsRepository API
- get()
- save(partial)

### MetaRepository API
- get(key)
- set(key, value)

---

## Additional Rules

- Use transactions for bulk operations
- Convert INTEGER <-> boolean
- Parse JSON for filter.conditions
- No UI code
- Only implement DB access logic

Implement all files accordingly.
