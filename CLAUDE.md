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

- **authStore** — OAuth token, user profile, spreadsheet ID, sheet GIDs. Persists to localStorage. Handles login/logout/callback/session restore. Scopes versioned (v6) to force re-login on scope changes.
- **cityStore** — Houses (module instances), residents (agents), all module data. Each mutation does optimistic local update then syncs to Sheets.
- **uiStore** — Selected agent ID, toast notifications (auto-dismiss 3.5s).

### Google Sheets Schema (`src/config/sheets.ts`)

**Core 9 sheets** auto-created on first login (actively used by UI):

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

**Additional sheets** (future PokéCenter agent features, not yet in UI):
Session, Agents, AgentLogs, TwitterBot, LinkedInBot, CalendarSync, Notifications, AgentOutputs, CuratedTweets

### SheetsService (`src/services/sheetsService.ts`)

All CRUD goes through this single service. Key methods: `createSpreadsheet()`, `readAll<T>()`, `append()`, `update()`, `deleteRow()`. Maps objects ↔ row arrays via `SHEET_HEADERS`. Uses Bearer token auth. `update()` does a read-then-write (finds row by ID).

### Component Structure

```
App.tsx (auth flow, bootstrap, routing by state)
├── LandingPage (OAuth login, agents carousel, join instructions)
├── LoadingScreen (data fetch from Sheets)
└── CityView (main hub)
    ├── CatanCityScene (3D hexagonal board with residents)
    ├── CityPanel (module expanded view, slides up over 3D scene)
    └── Modules/ (full content displays)
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

### 3D City Scene (`src/components/Landing/CatanCityScene.tsx`)

The main CityView uses a Three.js hexagonal board (Catan-style) with:
- Hex tiles indexed in axial coordinates
- Resident Pokémon sprites rendered on assigned home tiles
- Click to select resident and open module view
- OrbitControls for camera panning/zooming
- Stars + fog for ambiance

Sprite textures preloaded from PokeAPI. Each resident has a home tile; unoccupied tiles available for new residents.

### Cross-Device Sync

Spreadsheet ID stored in authStore and synced via localStorage. Users can share their spreadsheet ID to access the same data on another device. No conflict resolution — last write wins.

## Environment

Requires `VITE_GOOGLE_CLIENT_ID` in `.env` (see `.env.example`). Google Cloud project needs Sheets API + Calendar API enabled, with OAuth 2.0 web credentials pointing to dev origin (`http://localhost:5173`) and production origin.

## Deployment

Push to `main` triggers `.github/workflows/deploy.yml`: `npm ci` → `npm run build` (with `VITE_GOOGLE_CLIENT_ID` secret) → GitHub Pages. Output in `dist/`, served at `/pokecity/`.

## Testing & Test Data

### Local Testing
1. `npm run dev` — Starts Vite dev server on http://localhost:5173
2. `npm run lint` — Check for TS errors before committing
3. `npm run build` — Full production build (validates TypeScript)

### Test Data Setup
For end-to-end testing with real Google Sheets:
1. Create a Google Cloud project with Sheets API + Calendar API enabled
2. Create OAuth 2.0 web credentials (authorized origins: `http://localhost:5173`, production domain)
3. Create `.env` with `VITE_GOOGLE_CLIENT_ID=your_client_id`
4. Log in via the app — spreadsheet auto-creates with all 9 sheets
5. Add test residents via the "+ ADD RESIDENT" button
6. Click hex tiles to open modules and add data

**Quick test data**:
- Create 3 residents with different module types (tasks, notes, calendar)
- Add a few items to each (tasks, notes, events) to verify CRUD and display
- Test sync failure toast by going offline and trying an operation

## Key Patterns

- **Optimistic updates**: Local state changes immediately, Sheets sync is async. Failures show toast.
- **No router**: App state determines view (auth state → LandingPage vs LoadingScreen vs CityView, selected agent → module view).
- **JSON-in-cells**: Complex nested data (trip legs, packing lists) serialized as JSON strings in Sheets cells.
- **Resident-centric data**: Module data keyed by `residentId`, not house. Residents own their data.
- **TypeScript strict mode**: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` all enabled.
