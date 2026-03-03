# Plan: PokéCity Catan 3D Landing Page

## Context
Replace the current retro title-screen `LandingPage.tsx` with a fully 3D floating Catan-style hex board rendered in Three.js (@react-three/fiber + @react-three/drei — already installed). The board is PokéCity-themed: each hex tile represents one of the 6 productivity modules, coloured by Pokémon type. Demo settlements (agents as cities) sit on tile corners with Gen-5 NDS animated billboard sprites floating above them. Roads drawn as glowing tube geometry connect settlements in creation order. A glassmorphism overlay describes the creator (Mihir) and provides the Google Sign-In CTA. All work happens on a new branch `feat/catan-landing-page`.

---

## Files Changed

| Action | Path |
|---|---|
| CREATE | `src/components/Landing/hexUtils.ts` |
| CREATE | `src/components/Landing/catanData.ts` |
| CREATE | `src/components/Landing/CatanBoard3D.tsx` |
| REPLACE | `src/components/Landing/LandingPage.tsx` |
| APPEND | `src/styles/global.css` |
| UNCHANGED | `src/App.tsx` (import name preserved) |

No new npm dependencies — three, @react-three/fiber, @react-three/drei are already installed.

---

## Step 1 — Branch

```bash
git checkout -b feat/catan-landing-page
```

---

## Step 2 — `hexUtils.ts` (hex grid math, no React/Three.js)

```ts
export const HEX_SIZE = 2.4; // radius center-to-vertex in world units

// All 19 board axial (q, r) pairs — radius-2 constraint: max(|q|,|r|,|q+r|) <= 2
export const BOARD_HEXES: [number, number][] = [
  [-2,0],[-2,1],[-2,2],
  [-1,-1],[-1,0],[-1,1],[-1,2],
  [0,-2],[0,-1],[0,0],[0,1],[0,2],
  [1,-2],[1,-1],[1,0],[1,1],
  [2,-2],[2,-1],[2,0],
];

// Flat-top hex: axial → world XZ
export function axialToWorld(q: number, r: number): [number, number] {
  const x = HEX_SIZE * (3/2) * q;
  const z = HEX_SIZE * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  return [x, z];
}

// 6 vertex offsets (flat-top, clockwise from right)
export function hexCorners(q: number, r: number): [number, number][] {
  const [cx, cz] = axialToWorld(q, r);
  return Array.from({ length: 6 }, (_, i) => {
    const ang = (Math.PI / 180) * (60 * i);
    return [cx + HEX_SIZE * Math.cos(ang), cz + HEX_SIZE * Math.sin(ang)] as [number,number];
  });
}
```

---

## Step 3 — `catanData.ts` (all static showcase data)

### Tile type → Pokémon type colour mapping (7 types, 19 tiles)

| Module | Pokémon type | Top colour | Emissive | Pokémon ID |
|---|---|---|---|---|
| calendar | Psychic | `#9b59b6` | `#d7bde2` | 251 (Celebi) |
| tasks | Fighting | `#c0392b` | `#f1948a` | 68 (Machamp) |
| notes | Normal | `#d4c5a9` | `#f5e6c8` | 235 (Smeargle) |
| travel | Flying | `#2980b9` | `#aed6f1` | 18 (Pidgeot) |
| gym | Rock | `#7f8c8d` | `#d5dbdb` | 57 (Primeape) |
| shopping | Fairy | `#e91e8c` | `#f9a8d4` | 52 (Meowth) |
| desert | Ground | `#d4a843` | `#f5deb3` | null |

### Tile distribution (TILE_TYPE_SEQUENCE — 19-element array)
Each of 6 module types gets 3 tiles; desert gets 1. Arranged to avoid same-type adjacency.

```ts
// Indices correspond to BOARD_HEXES order (row by row)
export const TILE_TYPE_SEQUENCE: TileType[] = [
  'travel','tasks','notes',           // row top (3)
  'gym','calendar','shopping','tasks', // (4)
  'notes','gym','desert','calendar','travel', // (5)
  'shopping','notes','gym','calendar', // (4)
  'travel','shopping','tasks',        // row bottom (3)
];
```

### Demo settlements — 6 hardcoded showcase agents

```ts
export interface DemoSettlement {
  id: string;
  name: string;
  moduleType: TileType;
  pokemonId: number;
  hexQ: number; hexR: number;
  cornerIndex: number; // 0-5, vertex of that hex
  createdOrder: number;
}

export const DEMO_SETTLEMENTS: DemoSettlement[] = [
  { id:'s0', name:"Mihir's Calendar", moduleType:'calendar', pokemonId:251, hexQ: 0, hexR:-2, cornerIndex:0, createdOrder:0 },
  { id:'s1', name:'Task HQ',          moduleType:'tasks',    pokemonId:68,  hexQ: 1, hexR:-1, cornerIndex:2, createdOrder:1 },
  { id:'s2', name:'Note Atelier',     moduleType:'notes',    pokemonId:235, hexQ: 0, hexR: 0, cornerIndex:4, createdOrder:2 },
  { id:'s3', name:'Travel Bureau',    moduleType:'travel',   pokemonId:18,  hexQ:-1, hexR: 1, cornerIndex:0, createdOrder:3 },
  { id:'s4', name:'Iron Gym',         moduleType:'gym',      pokemonId:57,  hexQ:-2, hexR: 0, cornerIndex:2, createdOrder:4 },
  { id:'s5', name:'Market District',  moduleType:'shopping', pokemonId:52,  hexQ: 0, hexR: 1, cornerIndex:1, createdOrder:5 },
];
```

Roads: s0→s1, s1→s2, s2→s3, s3→s4, s4→s5 (5 roads total, in creation order).

---

## Step 4 — `CatanBoard3D.tsx` (all Three.js — largest file)

### Component tree
```
CatanBoard3D (exported)
  <Canvas> camera=[0,18,22] fov=50 shadows
    <Suspense>
      CatanScene
        CatanLighting
        OceanPlane        ← pulsing semi-transparent blue disc
        HexTile × 19      ← ExtrudeGeometry, 2-material, slow bob useFrame
        Road × 5          ← CatmullRomCurve3 → TubeGeometry, opacity pulse
        Settlement × 6    ← cylinder base + Billboard sprite + Html label
        FloatingParticles ← 20 gold octahedra (copy ThreeCityScene pattern)
      <OrbitControls> autoRotate, stops on first user touch
      <Stars>
      <Preload>
  HTML overlay (.catan-overlay)
    .catan-title-block   top-center
    .catan-info-panel    right side
    .catan-bottom-bar    legend + signin CTA
    .catan-hint          orbit hint
```

### Key implementation details

**HexTile — ExtrudeGeometry with 2 materials:**
- Build a `THREE.Shape` hex (6 vertices, flat-top) via `useMemo`
- `extrudeGeometry args={[shape, { depth:0.45, bevelEnabled:true, bevelSize:0.06 }]}`
- Pass `material={[sideMat, topMat]}` array to `<mesh>` (R3F multi-material syntax)
- `sideMat = useMemo(() => new THREE.MeshStandardMaterial({ color: cfg.sideColor, ... }), [...])`
- Bob: `useFrame(s => group.position.y = baseY + sin(s.clock.elapsedTime*0.6 + bobOffset)*0.15)`
- `<Html>` tile label (VT323, pointer-events none)
- Reduce per-tile point lights: 1 light per unique type (6 lights total, positioned at centroid of each type's 3 tiles) instead of 19 individual lights

**Settlement — Billboard sprite:**
- Position = `axialToWorld(hexQ, hexR)` + corner offset from `hexCorners()`, Y = 0.5
- Sprite: `THREE.TextureLoader` loads Gen-5 BW animated GIF URL first, static PNG fallback:
  ```
  .../generation-v/black-white/animated/{id}.gif
  .../pokemon/{id}.png  (fallback)
  ```
  Note: TextureLoader renders only first frame of GIF (Three.js limitation) — this is fine, sprite is still the correct Pokémon art
- `<Billboard>` wraps a `<mesh planeGeometry args={[1.2,1.2]}> <meshBasicMaterial map={tex} transparent alphaTest={0.08} />`
- Float: `useFrame(s => floatGroup.position.y = baseY + sin(s.clock.elapsedTime*1.5 + createdOrder)*0.2)`
- Html label pill: dark bg, coloured border matching tile type
- Cylinder base + glow ring + pointLight per settlement (6 total)

**Road — TubeGeometry:**
- `getSettlementWorldPos(s)` helper: `axialToWorld(s.hexQ, s.hexR)` + `hexCorners()[s.cornerIndex]`
- Curve: `CatmullRomCurve3([start(y=0.6), mid(y=1.0), end(y=0.6)])`
- `tubeGeometry args={[curve, 20, 0.06, 6, false]}`
- `meshBasicMaterial` with pulsing opacity via `useFrame`
- Road colour = `mixColors(fromTileColor, toTileColor)` (simple RGB midpoint)

**OceanPlane:**
- `<mesh rotation={[-PI/2,0,0]} position={[0,-0.6,0]}>`
- `circleGeometry args={[22, 64]}`
- `meshBasicMaterial color="#0c4a6e" transparent` opacity pulsing 0.20–0.33

**Canvas setup (mirror ThreeCityScene.tsx):**
- `shadows`, `camera={{ position:[0,18,22], fov:50 }}`, `gl={{ antialias:true, powerPreference:'high-performance' }}`
- Background gradient via `style` prop on Canvas

**OrbitControls:**
- `autoRotate autoRotateSpeed={0.4}` until first `onStart` event → set `autoRotate=false` via ref

---

## Step 5 — Replace `LandingPage.tsx`

Thin 5-line wrapper (named export preserved so App.tsx needs no changes):
```tsx
import { useAuthStore } from '../../stores/authStore';
import { CatanBoard3D } from './CatanBoard3D';

export function LandingPage() {
  const login = useAuthStore(s => s.login);
  return <CatanBoard3D onLogin={login} />;
}
```

---

## Step 6 — Append CSS to `global.css`

New `.catan-*` section appended at bottom. Key rules:

```css
.catan-root { position: relative; width: 100vw; height: 100dvh; overflow: hidden; }
.catan-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 10; }
.catan-title { font-family: 'Dogica'; color: #FFD700; text-shadow: gold glow; animation: catan-title-glow 2.5s infinite; }
.catan-info-panel { position: absolute; top: 80px; right: 20px; width: min(280px,30vw);
  background: rgba(5,5,20,0.82); border: 1px solid rgba(129,140,248,0.25); backdrop-filter: blur(10px); }
.catan-signin-btn { background: #FFD700; font-family: 'Dogica'; box-shadow: 4px 4px 0 #b8a000;
  pointer-events: auto; }
.catan-signin-btn:hover { transform: translate(-1px,-1px); }
.catan-legend__swatch { width: 10px; height: 10px; border-radius: 2px; }
.catan-hint { position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
  font-family: 'VT323'; color: #475569; letter-spacing: 1px; }
@keyframes catan-title-glow {
  0%,100% { text-shadow: 0 0 12px #FFD700, 0 0 30px #FFD700, 0 0 60px #FFA500; }
  50% { text-shadow: 0 0 20px #FFD700, 0 0 50px #FFD700, 0 0 90px #FFA500; }
}
/* Mobile: stack info panel below title on < 768px */
@media (max-width: 768px) {
  .catan-info-panel { position: static; width: 100%; top: auto; right: auto; }
  .catan-overlay { flex-direction: column; padding: 12px; }
}
```

---

## Step 7 — Creator description text (in info panel)

The right-side `.catan-info-panel` shows:
- **Header**: "WHAT IS POKÉCITY?"
- **Body**: "Your life, gamified as a Pokémon city. Each module is run by a Pokémon resident — calendar, tasks, notes, travel, gym, and shopping. Built by Mihir, powered by Google Sheets."
- **Module pills**: rendered from `HOUSE_TYPE_LIST` (imported from houseTypes config)
- **Footer**: "No server. No fees. Just you and your city."

---

## Step 8 — Commit & push to branch

```bash
git add -A
git commit -m "feat: PokéCity Catan 3D landing page"
git push -u origin feat/catan-landing-page
```

---

## Verification

1. `npm run dev` → open http://localhost:5173/pokecity/ while logged out
2. Should see full 3D hex board auto-rotating with floating sprites
3. Drag/scroll → orbit controls take over, auto-rotate stops
4. Click "SIGN IN WITH GOOGLE" → triggers Google OAuth
5. `npm run build` → TypeScript must pass (strict mode)
6. Check mobile at 375px width → info panel stacks, board still visible

---

## Known Caveats

- `THREE.TextureLoader` renders only first GIF frame — Gen-5 sprites are static (acceptable, still correct art)
- ExtrudeGeometry multi-material in R3F: pass `material={[mat0, mat1]}` array as prop, not `attach` syntax
- `useRef<any>` for OrbitControls ref (drei doesn't export clean imperative type) — add eslint-disable comment
- Keep total point lights ≤ 8 (6 type lights + 2 global fill) for WebGL performance
- `noUnusedLocals` strict — every declared variable must be used
