# Plan: Fix Catan Board — One Pokemon Per Tile, Agent Per Tile

## Context

**The Bug:** `TILE_TYPE_SEQUENCE` has 3 tiles per module type (e.g. 3 calendar tiles, 3 tasks tiles). The current code shows the Pokemon sprite on EVERY tile of that type, so Celebi appears on all 3 calendar tiles, Machamp on all 3 tasks tiles, etc. This produces the cluttered mess in the screenshot.

**What the user wants:**
- Each tile has exactly ONE associated agent (or null if none)
- Each tile shows its type label and solid color
- The Pokemon for that module type hovers above the tile **only if there is an agent on it**
- Landing page: 6 tiles have demo agents (one per module type), 13 tiles are empty (just label + color)
- City view: tiles with real residents show the resident's Pokemon + name; tiles without residents are empty tiles
- Desert tile: always empty (no pokemon, no agent)

## Root Cause

Both `CatanBoard3D.tsx` and `CatanCityScene.tsx` look up `pokemonId` from `getTileConfig(tileType)` and render it on every tile of that type. There is no "one pokemon per tile" logic.

## Solution Design

### Core Concept: "Home Tile" per module type

`TILE_TYPE_SEQUENCE` has 3 copies of each module type. Each module type gets exactly ONE designated "home tile" — the first occurrence in the sequence:

| Type | Home tile index | Hex (q, r) |
|---|---|---|
| travel | 0 | [-2, 0] |
| tasks | 1 | [-2, 1] |
| notes | 2 | [-2, 2] |
| gym | 3 | [-1, -1] |
| calendar | 4 | [-1, 0] |
| shopping | 5 | [-1, 1] |
| desert | 9 | [0, 0] — always empty |

The 12 remaining tiles (2 per module type) are just decorative colored tiles with a type label, no Pokemon.

### Landing Page Logic
- Demo agents are ONE per module type (from `DEMO_SETTLEMENTS` in catanData)
- Home tile for each type: show Pokemon sprite + demo agent name floating above
- Non-home tiles: just solid color + type label, no sprite
- Desert: just sandy color + "DESERT" label

### City View Logic
- `entries` (real residents) are grouped by `house.type`
- For each module type, take the FIRST resident with that type as the occupant of the home tile
- Home tile with resident: show Pokemon + resident name, clickable to open module
- Home tile without resident: show Pokemon + type label (Pokemon always visible on home tile)
- Non-home tiles: just solid color + type label
- Desert: empty

Wait — re-reading user: **"if there are no then keep it null"** — meaning if no agent for a type, DON'T show the Pokemon either. Show only the color + label. Pokemon appears ONLY when there's an agent.

### Revised: Pokemon shown only with an agent

**Landing Page:**
- Home tile (first occurrence of type): if module has a demo agent → show Pokemon + agent name. Always shows for all 6 module types since DEMO_SETTLEMENTS covers all 6.
- Non-home tiles: just color + label only

**City View:**
- Home tile: if a resident has that `house.type` → show Pokemon + resident name
- Home tile: if NO resident has that type → just color + label (NO Pokemon)
- Non-home tiles: just color + label always

---

## Files to Modify

### 1. `src/components/Landing/catanData.ts`

Add a computed set of "home tile" indices — first occurrence of each module type:

```ts
// Pre-computed: index in BOARD_HEXES where each type first appears
export const HOME_TILE_INDICES: Set<number> = new Set(
  Object.keys(TILE_CONFIGS).map(type =>
    TILE_TYPE_SEQUENCE.indexOf(type as TileType)
  ).filter(i => i !== -1)
);
```

Also export a `DEMO_AGENT_BY_TYPE` map (from DEMO_SETTLEMENTS) for landing page:

```ts
export const DEMO_AGENT_BY_TYPE: Map<TileType, string> = new Map(
  DEMO_SETTLEMENTS.map(s => [s.moduleType, s.name])
);
```

### 2. `src/components/Landing/CatanBoard3D.tsx` — Landing Page

`HexTile` component changes:
- Remove `pokemonId` and `pokeTexture` props (now determined inside from `isHomeTile`)
- Add `agentName?: string` prop — demo agent name from `DEMO_AGENT_BY_TYPE`
- Only render sprite when `agentName` is truthy (landing: always true for 6 module types)
- Sprite floats above tile center, not at hex corner

In `CatanScene`:
```tsx
const isHomeTile = HOME_TILE_INDICES.has(idx);
const agentName = isHomeTile ? DEMO_AGENT_BY_TYPE.get(tileType) : undefined;
```

### 3. `src/components/Landing/CatanCityScene.tsx` — City View

Same pattern:
```tsx
const occupiedByType = new Map(entries.map(({ resident, house }) => [house.type, resident]));

// For each tile:
const isHomeTile = HOME_TILE_INDICES.has(idx);
const resident = isHomeTile ? occupiedByType.get(tileType) : undefined;
// Show pokemon only when resident exists
// Clickable only when resident exists
```

---

## Critical Files

- `src/components/Landing/catanData.ts` — add `HOME_TILE_INDICES`, `DEMO_AGENT_BY_TYPE`
- `src/components/Landing/CatanBoard3D.tsx` — HexTile: agent-gated sprite
- `src/components/Landing/CatanCityScene.tsx` — HexTile: resident-gated sprite + click

---

## What Does NOT Change

- `hexUtils.ts` — no changes
- `TILE_TYPE_SEQUENCE` / `BOARD_HEXES` — same 19 tiles
- `catanData.ts` color/pokemon config — same
- CSS — no changes

---

## Verification

1. `npm run build` → passes TypeScript strict mode
2. Landing page: exactly 6 Pokemon visible (one per module type on home tiles), 13 tiles empty
3. City view (logged in, no residents): all 19 tiles show color + label, NO Pokemon
4. City view (with residents): Pokemon + name appears on home tile per occupied module type
5. Click occupied tile → opens CityPanel module
