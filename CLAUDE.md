# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint (TS + React Hooks rules)
npm run preview    # Preview production build locally
```

## Architecture

**PokéCity** is a gamified personal productivity suite styled as a Pokémon city. It's a client-side React SPA with no backend — Google Sheets serves as the database, accessed directly via the Sheets API v4.

### Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 19 + TypeScript 5.9 |
| Bundler | Vite 7 |
| State | Zustand 5 (3 stores) |
| Backend | Google Sheets API v4 (no server) |
| Auth | Google OAuth 2.0 (implicit flow) |
| Styling | Plain CSS (global.css, 1164 lines, pixel-art retro theme) |
| Fonts | Dogica (custom pixel), VT323 (Google Fonts) |
| Deploy | GitHub Pages via Actions (base: `/pokecity/`) |

### Data Flow

```
Google OAuth → access_token → Sheets API
                                  ↕
User → React UI → Zustand Store → SheetsService → Google Sheets (9 sheets)
         ↑                              (optimistic local update, async sync)
         └── Toast on sync failure
```

### Zustand Stores (`src/stores/`)

- **authStore** — OAuth token, user profile, spreadsheet ID, sheet GIDs. Persists to localStorage. Handles login/logout/callback/session restore. Scopes versioned (v4) to force re-login on change.
- **cityStore** — Houses (module instances), residents (agents), all module data. Each mutation does optimistic local update then syncs to Sheets.
- **uiStore** — Selected agent ID, toast notifications (auto-dismiss 3.5s).

### Google Sheets Schema (`src/config/sheets.ts`)

9 sheets auto-created on first login via `sheetsService.createSpreadsheet()`:

| Sheet | Purpose |
|---|---|
| Meta | City name, key-value settings |
| Houses | Module instances (id, type, name, gridX, gridY) |
| Residents | Agents in houses (name, role, emoji, avatarBg, bio) |
| CalendarEvents | Events with recurrence, color, Google Calendar sync |
| Tasks | Priority (low/normal/high/urgent), status (backlog/inProgress/done), projects, tags |
| Notes | Markdown content, versioning, auto-save with 2s debounce |
| TripPlans | Multi-leg itineraries + packing lists stored as JSON strings |
| HealthMetrics | Gym tracking — multiple metric types (weight, reps, duration, distance) |
| ShoppingItems | Lists with categories, quantities, estimated prices |

### SheetsService (`src/services/sheetsService.ts`)

All CRUD goes through this single service. Key methods: `createSpreadsheet()`, `readAll<T>()`, `append()`, `update()`, `deleteRow()`. Maps objects ↔ row arrays via `SHEET_HEADERS`. Uses Bearer token auth. `update()` does a read-then-write (finds row by ID).

### Component Structure

```
App.tsx (auth flow, bootstrap, routing by state)
├── LandingPage (OAuth login, Pikachu + speech bubble)
├── LoadingScreen (data fetch from Sheets)
└── ShopView (main hub)
    ├── AgentCard (resident card with mini-widget per module type)
    └── Modules/ (full expanded views)
        ├── CalendarModule (Google Calendar import, recurrence, color-coding)
        ├── TasksModule (priority, status cycling, project grouping, overdue highlighting)
        ├── NotesModule (markdown, auto-save debounce, search, versioning)
        ├── TravelModule (multi-leg JSON itineraries, packing lists, countdown)
        ├── GymModule (metric type tabs, sparkline chart, preset buttons)
        └── ShoppingModule (multi-list, category grouping, price totals)
```

### 6 Module Types (`src/config/houseTypes.ts`)

| Type | Pokemon | Sheet | Default Role |
|---|---|---|---|
| calendar | Celebi (251) | CalendarEvents | Scheduler |
| tasks | Machamp (68) | Tasks | Task Manager |
| notes | Smeargle (235) | Notes | Note Keeper |
| travel | Pidgeot (18) | TripPlans | Travel Agent |
| gym | Primeape (57) | HealthMetrics | Trainer |
| shopping | Meowth (52) | ShoppingItems | Shopkeeper |

Pokemon sprites fetched from PokeAPI CDN. 46 Pokemon in the resident pool.

### Cross-Device Sync

Manual spreadsheet ID sharing (no Drive API). Spreadsheet ID persists across logouts. User pastes ID on new device via "Link Devices" modal.

## Environment

Requires `VITE_GOOGLE_CLIENT_ID` in `.env` (see `.env.example`). Google Cloud project needs Sheets API + Calendar API enabled, with OAuth 2.0 web credentials pointing to dev origin (`http://localhost:5173`) and production origin.

## Deployment

Push to `main` triggers `.github/workflows/deploy.yml`: `npm ci` → `npm run build` (with `VITE_GOOGLE_CLIENT_ID` secret) → GitHub Pages. Output in `dist/`, served at `/pokecity/`.

## Key Patterns

- **Optimistic updates**: Local state changes immediately, Sheets sync is async. Failures show toast.
- **No router**: App state determines view (auth state → LandingPage vs LoadingScreen vs ShopView, selected agent → module view).
- **JSON-in-cells**: Complex nested data (trip legs, packing lists) serialized as JSON strings in Sheets cells.
- **Resident-centric data**: Module data keyed by `residentId`, not house. Residents own their data.
- **TypeScript strict mode**: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` all enabled.
