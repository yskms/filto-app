# Filto

**A lightweight RSS reader focused on local filtering**

Filto is a mobile RSS reader designed to give users full control over article filtering using local rules, without relying on paid cloud-based services.

---

## Overview

Many RSS readers today suffer from:

- Advanced filters locked behind paid plans
- Cloud-dependent processing
- Overly complex configuration

Filto aims to provide:

- **Fully local article filtering**
- **Simple yet expressive filter rules**
- **A quiet reading experience without notifications**

---

## Target Users

- People who regularly use RSS but feel overwhelmed by noise
- Users who want to filter tech, finance, or hobby-related articles
- Those interested in client-side filtering instead of cloud services
- Engineers and indie developers who value control and simplicity

---

## Key Features

- RSS feed management (add / remove / reorder)
- Local filtering rules
  - Keyword-based include / exclude
  - Exception rules (e.g. block A unless B exists)
- On-demand or low-frequency feed refresh
- Open articles in the system browser
- Light / Dark theme support
- Supports both Japanese and English RSS feeds
- Planned UI localization

---

## Tech Stack

- **Frontend**: React Native (Expo)
- **Language**: TypeScript
- **Local Database**: SQLite
- **Architecture**: UI / Service / Repository
- **Network**: RSS fetching only (no cloud backend)

---

## Project Structure (Simplified)

```txt
Filto/
├─ app/            # UI / Screens (React Native)
├─ services/       # Business logic (feeds, filtering)
├─ repositories/   # Data access layer
├─ db/             # SQLite / migrations
└─ docs/           # Design documents
```

---

## Documentation

The `docs/` directory contains detailed design documents:

- Requirements and specifications
- Screen flow and wireframes
- Database design and ER diagrams
- CRUD definitions and API design
- Architecture diagrams
- Development plan and task lists
- Detailed designs for UI, Service, and Repository layers
- Cursor-ready implementation prompts

---

## Development Status

- **Personal indie development project**
- **Currently in design and implementation phase**
- **Initial release planned for May 2025**

Note: Monetization features are not included in the initial release, but the architecture is designed to support them in the future.

---

## License

MIT License
