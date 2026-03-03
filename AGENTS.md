# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

PokéCity is a client-side React 19 SPA (no backend) using Google Sheets API v4 as its database. The only local service needed is the Vite dev server. See `CLAUDE.md` for full architecture details.

### Running the app

- `npm run dev` starts the Vite dev server at `http://localhost:5173/pokecity/` (note the `/pokecity/` base path).
- The app has a built-in sample/demo mode: clicking "Sign in with Google" without a valid `VITE_GOOGLE_CLIENT_ID` loads sample data locally, so you can interact with the city view, residents, and modules without real OAuth credentials.

### Lint, build, test

- `npm run lint` — ESLint. There are 2 pre-existing `no-unused-vars` errors in `CatanBoard3D.tsx` and `CatanCityScene.tsx` (`_typeLabel`); these are not regressions.
- `npm run build` — TypeScript type-check + Vite production build. Font resolution warnings for `dogica.ttf`/`dogicabold.ttf` are expected (runtime-resolved).
- No automated test framework is configured in this repo.

### Environment variables

- `VITE_GOOGLE_CLIENT_ID` — required for real Google OAuth/Sheets integration. Create a `.env` file from `.env.example`. For local dev/demo purposes, the app works without a valid value.
