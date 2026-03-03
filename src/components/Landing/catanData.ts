import type { HouseModuleType } from '../../types';

export type TileType = HouseModuleType | 'desert';

/** Pokémon type key for Catan-style token (matches sprite's primary type) */
export type TileTokenType =
  | 'psychic'   // Celebi
  | 'fighting'  // Machamp, Primeape
  | 'normal'    // Smeargle, Meowth
  | 'flying';   // Pidgeot

export interface TileConfig {
  type: TileType;
  topColor: string;
  emissiveColor: string;
  sideColor: string;
  pokemonId: number | null;
  /** Catan-style token: Pokémon type for symbol on tile (matches sprite) */
  tokenType: TileTokenType | null;
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

// Tile type → color + Pokémon-type token (Catan-style: type matches sprite)
const TILE_CONFIGS: Record<TileType, TileConfig> = {
  calendar: {
    type: 'calendar',
    topColor: '#9b59b6',
    emissiveColor: '#d7bde2',
    sideColor: '#6c3a73',
    pokemonId: 251, // Celebi — Psychic/Grass
    tokenType: 'psychic',
  },
  tasks: {
    type: 'tasks',
    topColor: '#c0392b',
    emissiveColor: '#f1948a',
    sideColor: '#7e2722',
    pokemonId: 68, // Machamp
    tokenType: 'fighting',
  },
  notes: {
    type: 'notes',
    topColor: '#d4c5a9',
    emissiveColor: '#f5e6c8',
    sideColor: '#8b7d6b',
    pokemonId: 235, // Smeargle
    tokenType: 'normal',
  },
  travel: {
    type: 'travel',
    topColor: '#2980b9',
    emissiveColor: '#aed6f1',
    sideColor: '#1b5170',
    pokemonId: 18, // Pidgeot
    tokenType: 'flying',
  },
  gym: {
    type: 'gym',
    topColor: '#7f8c8d',
    emissiveColor: '#d5dbdb',
    sideColor: '#566573',
    pokemonId: 57, // Primeape
    tokenType: 'fighting',
  },
  shopping: {
    type: 'shopping',
    topColor: '#e91e8c',
    emissiveColor: '#f9a8d4',
    sideColor: '#971a58',
    pokemonId: 52, // Meowth
    tokenType: 'normal',
  },
  desert: {
    type: 'desert',
    topColor: '#d4a843',
    emissiveColor: '#f5deb3',
    sideColor: '#8b7340',
    pokemonId: null,
    tokenType: null,
  },
};

export function getTileConfig(type: TileType): TileConfig {
  return TILE_CONFIGS[type];
}

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
