# Plan: Fix Catan Board Hexagon Geometry (Vertical → Flat Platforms)

## Context
The hex tiles appear as vertical rectangular slabs instead of flat horizontal platforms. User's sketch shows proper 3D isometric hexagon blocks (flat top face visible, sides visible from the side). The current code creates hexagons in the XY plane (vertical) and extrudes along Z (horizontal depth), making tall thin slabs.

## Root Cause (confirmed by exploration)
- `hexCorners()` returns `[worldX, worldZ]` pairs
- `shape.moveTo(x0, z0)` — THREE.Shape treats 2nd arg as Y, so worldZ becomes shapeY
- Result: hex face is in XY plane (vertical), extrusion goes in Z (horizontal)
- **Fix**: build shape at origin in local space, `geo.rotateX(-Math.PI / 2)` to lay flat
- This is exactly how `OceanPlane` in the same file does it with `rotation={[-Math.PI / 2, 0, 0]}`

## Files to Modify
1. `src/components/Landing/CatanBoard3D.tsx`
2. `src/components/Landing/CatanCityScene.tsx`

## Implementation

### 1. Import HEX_SIZE in both files
```tsx
import { BOARD_HEXES, axialToWorld, HEX_SIZE } from './hexUtils';
// Remove hexCorners import — no longer needed for tile geometry
```

### 2. Fix hex geometry useMemo (identical change in both files)

Replace the current `geometry = useMemo(...)` block with:

```tsx
const geometry = useMemo(() => {
  // Build local hex shape at origin (flat-top: corner 0 at 0°)
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i;
    const lx = HEX_SIZE * Math.cos(ang);
    const ly = HEX_SIZE * Math.sin(ang);
    if (i === 0) shape.moveTo(lx, ly);
    else shape.lineTo(lx, ly);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.55,
    bevelEnabled: true,
    bevelSize: 0.06,
    bevelThickness: 0.04,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2); // lay flat: hex face → XZ plane, extrusion → Y up
  return geo;
}, []); // no q,r dependency — group position handles world placement
```

After this:
- Top hexagonal face visible from above ✓
- Sides visible from isometric angle ✓
- Extrusion (height) = 0.55 gives solid-looking blocks ✓

### 3. Fix Y positions for all Html/sprite children (both files)

After rotation, tile top face is at y = 0.55. Update positions:

| Element | Before | After |
|---|---|---|
| Type label (Html) | `[0, 0.25, 0]` | `[0, 0.65, 0]` |
| Pokemon sprite group | `[0, 1.2, 0]` | `[0, 1.3, 0]` |
| Glow circle | `[0, 0.15, 0]` | `[0, 0.58, 0]` |
| Resident name (CityScene only) | `[0, -0.3, 0]` | `[0, 0.35, 0]` |

### 4. Improve lighting (CatanBoard3D.tsx — landing page)

The current directional light at `[10, 14, 10]` is fine. Add a fill light from below to reveal underside of tiles:

No lighting changes needed — the existing setup should work once tiles are horizontal.

### 5. Camera tweak (optional, CatanBoard3D only)

Current: `position: [0, 16, 20], fov: 50`
Suggested: `position: [0, 12, 22], fov: 48` — lower angle reveals more tile sides

## Validation: 3 Parallel Agents Post-Implementation

After implementing all changes, spawn 3 agents in parallel:

1. **Build Agent**: Run `npm run build`, report any TypeScript errors
2. **Logic Agent**: Read the modified files and verify: (a) geometry rotation is correct, (b) all Y position values are updated, (c) HEX_SIZE import is present, (d) no unused imports remain
3. **Diff Agent**: Run `git diff` and produce a clean summary of all changes made, checking nothing unrelated was touched

## What Does NOT Change
- `hexUtils.ts` — HEX_SIZE already exported, no changes needed
- `catanData.ts` — no changes (home tile logic from previous session remains)
- CSS — no changes
- `TILE_TYPE_SEQUENCE`, `BOARD_HEXES` — same
