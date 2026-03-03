import type { HouseModuleType } from '../../types';
import { axialToWorld } from './hexUtils';

export type TileType = HouseModuleType | 'desert';

/** Pastel VIBGYOR (Violet → Red) for radial hex coloring */
export const PASTEL_VIBGYOR = [
  '#E6D9F5', // Violet
  '#C4B5FD', // Indigo
  '#BFDBFE', // Blue
  '#BBF7D0', // Green
  '#FEF08A', // Yellow
  '#FED7AA', // Orange
  '#FECACA', // Red
] as const;

/** Boost saturation by factor (e.g. 1.3 = 30% more), in HSL */
function boostSaturation(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  s = Math.min(1, s * factor);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r2 = 0, g2 = 0, b2 = 0;
  if (h < 1/6) { r2 = c; g2 = x; b2 = 0; }
  else if (h < 2/6) { r2 = x; g2 = c; b2 = 0; }
  else if (h < 3/6) { r2 = 0; g2 = c; b2 = x; }
  else if (h < 4/6) { r2 = 0; g2 = x; b2 = c; }
  else if (h < 5/6) { r2 = x; g2 = 0; b2 = c; }
  else { r2 = c; g2 = 0; b2 = x; }
  const R = Math.round((r2 + m) * 255);
  const G = Math.round((g2 + m) * 255);
  const B = Math.round((b2 + m) * 255);
  return '#' + [R, G, B].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
}

/** Darker variant for hex sides (same hue, lower lightness) */
function darkenPastel(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * factor));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * factor));
  const b = Math.max(0, Math.round((n & 255) * factor));
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const SATURATION_BOOST = 1.3;

/** Radial pastel color for a hex by position (angle from center → VIBGYOR), ~30% more saturation */
export function getPastelColorForHex(q: number, r: number): {
  topColor: string;
  sideColor: string;
  borderColor: string;
} {
  const [x, z] = axialToWorld(q, r);
  const angle = Math.atan2(z, x);
  const norm = (angle + Math.PI) / (2 * Math.PI);
  const index = Math.floor(norm * PASTEL_VIBGYOR.length) % PASTEL_VIBGYOR.length;
  const topColor = boostSaturation(PASTEL_VIBGYOR[index], SATURATION_BOOST);
  const sideColor = darkenPastel(topColor, 0.55);
  const borderColor = darkenPastel(topColor, 0.75);
  return { topColor, sideColor, borderColor };
}

/** 6 agent elements: water, fire, lightning, grass, rock, ghost */
export type TileElement = 'water' | 'fire' | 'grass' | 'lightning' | 'rock' | 'ghost';

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

import { ELEMENT_SPRITE_IDS } from '../../config/pokemon';

// Futuristic: same base color for all tiles; element drives sprite + surrounding effect
const TILE_BASE = {
  topColor: '#1e293b',
  emissiveColor: '#0ea5e9',
  sideColor: '#0f172a',
  borderColor: '#38bdf8',
};

const TILE_CONFIGS: Record<TileType, TileConfig> = {
  calendar: { type: 'calendar', ...TILE_BASE, pokemonId: ELEMENT_SPRITE_IDS.grass, element: 'grass' },
  tasks:    { type: 'tasks',    ...TILE_BASE, pokemonId: ELEMENT_SPRITE_IDS.fire, element: 'fire' },
  notes:    { type: 'notes',    ...TILE_BASE, pokemonId: ELEMENT_SPRITE_IDS.lightning, element: 'lightning' },
  travel:   { type: 'travel',   ...TILE_BASE, pokemonId: ELEMENT_SPRITE_IDS.water, element: 'water' },
  gym:      { type: 'gym',      ...TILE_BASE, pokemonId: ELEMENT_SPRITE_IDS.rock, element: 'rock' },
  shopping: { type: 'shopping', ...TILE_BASE, pokemonId: ELEMENT_SPRITE_IDS.ghost, element: 'ghost' },
  desert:   { type: 'desert',   ...TILE_BASE, pokemonId: null, element: null },
};

export function getTileConfig(type: TileType): TileConfig {
  return TILE_CONFIGS[type];
}

/** Element color for surrounding effect (glow, particles) */
export const ELEMENT_COLORS: Record<TileElement, string> = {
  water: '#3b82f6',
  fire: '#ef4444',
  grass: '#22c55e',
  lightning: '#eab308',
  rock: '#78716c',
  ghost: '#a78bfa',
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

/** Ordered list of the 6 home hex board indices (slot 0..5 → hex index) */
export const ORDERED_HOME_HEX_INDICES: number[] = Array.from(HOME_TILE_INDICES).sort((a, b) => a - b);

/** Number of hexes on the board (e.g. 19 for Catan) */
export const BOARD_HEX_COUNT = TILE_TYPE_SEQUENCE.length;

/** Resolve house position to board hex index. Handles legacy gridX 0..5 (slot) and direct hex index 0..BOARD_HEX_COUNT-1. */
export function getHexIndexForHouse(gridX: number, boardLength: number = BOARD_HEX_COUNT): number {
  if (gridX >= 0 && gridX < boardLength) return gridX;
  const slot = Math.max(0, Math.min(5, Math.floor(gridX)));
  return ORDERED_HOME_HEX_INDICES[slot] ?? ORDERED_HOME_HEX_INDICES[0];
}

/** Default board slot (0..5) for a house type — used when gridX is unset or invalid */
export function defaultSlotForType(type: TileType): number {
  const hexIdx = TILE_TYPE_SEQUENCE.indexOf(type);
  const slot = ORDERED_HOME_HEX_INDICES.indexOf(hexIdx);
  return slot >= 0 ? slot : 0;
}

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
