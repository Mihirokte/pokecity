# AGENTS.md

## Cursor Cloud specific instructions

### Overview

PokéCity is a client-side React SPA with no backend server. The only local process is the Vite dev server. All data persistence uses Google Sheets API v4 via OAuth tokens.

### Quick reference

- **Dev server**: `npm run dev` serves at `http://localhost:5173/pokecity/` (note the `/pokecity/` base path)
- **Lint**: `npm run lint` (has pre-existing errors in the codebase; 7 errors, 2 warnings as of initial setup)
- **Build**: `npm run build` (runs `tsc -b` then `vite build`)
- See `CLAUDE.md` for full architecture details, commands, and data flow.

### Caveats

- The Vite config sets `base: '/pokecity/'`, so the app is served at `/pokecity/` not `/`. A bare `curl http://localhost:5173` returns 302; use `http://localhost:5173/pokecity/`.
- Google OAuth requires `VITE_GOOGLE_CLIENT_ID` in `.env`. Without a valid client ID, the landing page renders but "Sign in with Google" won't complete the OAuth flow. Copy `.env.example` to `.env` and set the value.
- ESLint exits with code 1 due to pre-existing lint errors (e.g., `@typescript-eslint/no-explicit-any`, `react-hooks/set-state-in-effect`). These are not regressions.
