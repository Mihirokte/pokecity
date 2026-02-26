// ── TILE TYPES ──
export const T = {
  FLOOR: 0,
  WALL: 1,
  PC: 3,
  DESK: 4,
  NURSE: 5,
  HEAL: 6,
  PLANT: 7,
  BENCH: 8,
  MAT: 9,
  DOOR: 10,
  POKEBALL_WALL: 12,
  SHELF: 13,
  POSTER: 14,
  BULLETIN: 15,
  FILING: 16,    // Archivist filing cabinet
  TERMINAL: 17,  // Spark terminal
  BOOKSHELF: 18, // Knowledge base bookshelf
} as const;

// ── MAP DATA (20×16) ──
// PCs map to agents by discovery order (left-to-right, top-to-bottom)
// PC positions in row 2: cols 1,3,5,13,15,17 = 6 PCs
// Additional PCs on side walls for twitter/linkedin
export const MAP = [
  // Row 0: Top wall
  [1,1,1,1,1,1,1,13,1,12,12,1,13,1,1,1,1,1,1,1],
  // Row 1: Wall with posters/shelves/bulletin
  [1,14,1,1,1,1,1,13,1,12,12,1,13,1,1,1,15,1,18,1],
  // Row 2: PCs along back wall (6 main agents)
  [1,3,1,3,1,3,1,1,1,1,1,1,1,3,1,3,1,3,1,1],
  // Row 3: Space in front of PCs
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 4: Open floor + heal machine area + side PCs for bots
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,6,1],
  // Row 5: Twitter/LinkedIn bot PCs on left wall
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 6: Open floor
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 7: Reception desk
  [0,0,0,0,0,0,4,4,4,4,4,4,4,4,0,0,0,0,0,0],
  // Row 8: Nurse Joy behind desk
  [0,0,0,0,0,0,4,4,5,5,5,4,4,4,0,0,0,0,0,0],
  // Row 9: Open floor
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 10: Open floor
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,0,0],
  // Row 11: Open floor + furniture
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,0,0],
  // Row 12: Decorations row
  [0,7,0,0,0,0,0,0,0,0,0,0,0,0,7,0,8,8,0,0],
  // Row 13: Open floor
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 14: Mat area
  [0,0,0,0,0,0,0,0,9,9,9,9,0,0,0,0,0,0,0,0],
  // Row 15: Doors
  [1,1,1,1,1,1,1,10,10,10,10,10,10,1,1,1,1,1,1,1],
];

// ── COLLISION (true = can't walk here) ──
const SOLID_TILES = new Set<number>([T.WALL, T.PC, T.DESK, T.NURSE, T.HEAL, T.BENCH, T.POKEBALL_WALL, T.SHELF, T.POSTER, T.BULLETIN, T.DOOR, T.FILING, T.TERMINAL, T.BOOKSHELF]);

export const isBlocked = (x: number, y: number): boolean => {
  if (x < 0 || x >= 20 || y < 0 || y >= 16) return true;
  return SOLID_TILES.has(MAP[y][x]);
};

// ── PC POSITIONS (discovery order maps to agent index) ──
export function getPCPositions(): { x: number; y: number }[] {
  const pcs: { x: number; y: number }[] = [];
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 20; c++) {
      if (MAP[r][c] === T.PC) pcs.push({ x: c, y: r });
    }
  }
  return pcs;
}

// ── INTERACTION DETECTION ──
export type InteractionType =
  | { type: 'pc'; agentIndex: number }
  | { type: 'reception' }
  | { type: 'heal' }
  | { type: 'plant' }
  | { type: 'bench' }
  | { type: 'poster' }
  | { type: 'bulletin' }
  | { type: 'door' }
  | { type: 'bookshelf' }
  | { type: 'filing' }
  | { type: 'terminal' }
  | null;

export function getInteraction(x: number, y: number, dir: string): InteractionType {
  const fx = x + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0);
  const fy = y + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0);
  if (fx < 0 || fx >= 20 || fy < 0 || fy >= 16) return null;
  const tile = MAP[fy][fx];

  switch (tile) {
    case T.PC: {
      const pcs = getPCPositions();
      const idx = pcs.findIndex(p => p.x === fx && p.y === fy);
      return idx >= 0 ? { type: 'pc', agentIndex: idx } : null;
    }
    case T.NURSE:
    case T.DESK:
      return { type: 'reception' };
    case T.HEAL:
      return { type: 'heal' };
    case T.PLANT:
      return { type: 'plant' };
    case T.BENCH:
      return { type: 'bench' };
    case T.POSTER:
      return { type: 'poster' };
    case T.BULLETIN:
      return { type: 'bulletin' };
    case T.DOOR:
      return { type: 'door' };
    case T.BOOKSHELF:
      return { type: 'bookshelf' };
    case T.FILING:
      return { type: 'filing' };
    case T.TERMINAL:
      return { type: 'terminal' };
    default:
      return null;
  }
}
