import type { HouseModuleType } from '../../types';

export type TileType = HouseModuleType | 'desert';

/** 6 agent elements for surrounding effect (water, fire, wind, grass, lightning, rock) */
export type TileElement = 'water' | 'fire' | 'wind' | 'grass' | 'lightning' | 'rock';

export interface TileConfig {
  type: TileType;
  topColor: string;
  emissiveColor: string;
  sideColor: string;
  borderColor: string;
  pokemonId: number | null;
  element: TileElement | null;
}

export interface DemoSettlement {
  id: string;
  name: string;
  moduleType: TileType;
  pokemonId: number;
  hexQ: number;
  hexR: number;
  cornerIndex: number; // 0-5, vertex of that hex
  createdOrder: number;
}

// Futuristic: same base color for all tiles; element drives agent surrounding effect
const TILE_BASE = {
  topColor: '#1e293b',
  emissiveColor: '#0ea5e9',
  sideColor: '#0f172a',
  borderColor: '#38bdf8',
};

const TILE_CONFIGS: Record<TileType, TileConfig> = {
  calendar: { type: 'calendar', ...TILE_BASE, pokemonId: 251, element: 'grass' },
  tasks:    { type: 'tasks',    ...TILE_BASE, pokemonId: 68,  element: 'fire' },
  notes:    { type: 'notes',    ...TILE_BASE, pokemonId: 235, element: 'lightning' },
  travel:   { type: 'travel',   ...TILE_BASE, pokemonId: 18,  element: 'wind' },
  gym:      { type: 'gym',      ...TILE_BASE, pokemonId: 57,  element: 'rock' },
  shopping: { type: 'shopping', ...TILE_BASE, pokemonId: 52,  element: 'water' },
  desert:   { type: 'desert',   ...TILE_BASE, pokemonId: null, element: null },
};

export function getTileConfig(type: TileType): TileConfig {
  return TILE_CONFIGS[type];
}

/** Element color for surrounding effect (glow, particles) */
export const ELEMENT_COLORS: Record<TileElement, string> = {
  water: '#3b82f6',
  fire: '#ef4444',
  wind: '#94a3b8',
  grass: '#22c55e',
  lightning: '#eab308',
  rock: '#78716c',
};

// 19-element sequence: 6 types × 3 tiles + 1 desert
// Arranged to avoid same-type adjacency where possible
export const TILE_TYPE_SEQUENCE: TileType[] = [
  'travel', 'tasks', 'notes', // row top (3)
  'gym', 'calendar', 'shopping', 'tasks', // (4)
  'notes', 'gym', 'desert', 'calendar', 'travel', // (5)
  'shopping', 'notes', 'gym', 'calendar', // (4)
  'travel', 'shopping', 'tasks', // row bottom (3)
];

// Pre-computed: index in TILE_TYPE_SEQUENCE where each type first appears (the "home tile")
export const HOME_TILE_INDICES: Set<number> = new Set(
  Object.keys(TILE_CONFIGS)
    .map((type) => TILE_TYPE_SEQUENCE.indexOf(type as TileType))
    .filter((i) => i !== -1)
);

// 6 hardcoded demo settlements
export const DEMO_SETTLEMENTS: DemoSettlement[] = [
  {
    id: 's0',
    name: "Mihir's Calendar",
    moduleType: 'calendar',
    pokemonId: 251, // Celebi
    hexQ: 0,
    hexR: -2,
    cornerIndex: 0,
    createdOrder: 0,
  },
  {
    id: 's1',
    name: 'Task HQ',
    moduleType: 'tasks',
    pokemonId: 68, // Machamp
    hexQ: 1,
    hexR: -1,
    cornerIndex: 2,
    createdOrder: 1,
  },
  {
    id: 's2',
    name: 'Note Atelier',
    moduleType: 'notes',
    pokemonId: 235, // Smeargle
    hexQ: 0,
    hexR: 0,
    cornerIndex: 4,
    createdOrder: 2,
  },
  {
    id: 's3',
    name: 'Travel Bureau',
    moduleType: 'travel',
    pokemonId: 18, // Pidgeot
    hexQ: -1,
    hexR: 1,
    cornerIndex: 0,
    createdOrder: 3,
  },
  {
    id: 's4',
    name: 'Iron Gym',
    moduleType: 'gym',
    pokemonId: 57, // Primeape
    hexQ: -2,
    hexR: 0,
    cornerIndex: 2,
    createdOrder: 4,
  },
  {
    id: 's5',
    name: 'Market District',
    moduleType: 'shopping',
    pokemonId: 52, // Meowth
    hexQ: 0,
    hexR: 1,
    cornerIndex: 1,
    createdOrder: 5,
  },
];

// Demo agent name by module type (for landing page home tiles)
export const DEMO_AGENT_BY_TYPE: Record<TileType, string> = {
  calendar: "Mihir's Calendar",
  tasks: 'Task HQ',
  notes: 'Note Atelier',
  travel: 'Travel Bureau',
  gym: 'Iron Gym',
  shopping: 'Market District',
  desert: '', // Desert has no agent
};

// Road connections (settlement pairs in creation order)
export const ROADS: [number, number][] = [
  [0, 1], // s0 → s1
  [1, 2], // s1 → s2
  [2, 3], // s2 → s3
  [3, 4], // s3 → s4
  [4, 5], // s4 → s5
];

export function mixColors(color1: string, color2: string): string {
  // Simple RGB midpoint
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);

  const r1 = (c1 >> 16) & 255;
  const g1 = (c1 >> 8) & 255;
  const b1 = c1 & 255;

  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;

  const r = Math.round((r1 + r2) / 2);
  const g = Math.round((g1 + g2) / 2);
  const b = Math.round((b1 + b2) / 2);

  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
