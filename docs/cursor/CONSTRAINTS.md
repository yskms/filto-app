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
