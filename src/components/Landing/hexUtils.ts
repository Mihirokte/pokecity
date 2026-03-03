// Hex grid utilities for flat-top hexagons
export const HEX_SIZE = 2.6; // radius (center to vertex) in world units — larger futuristic tiles

// All 19 board axial (q, r) pairs — radius-2 constraint
export const BOARD_HEXES: [number, number][] = [
  [-2, 0], [-2, 1], [-2, 2],
  [-1, -1], [-1, 0], [-1, 1], [-1, 2],
  [0, -2], [0, -1], [0, 0], [0, 1], [0, 2],
  [1, -2], [1, -1], [1, 0], [1, 1],
  [2, -2], [2, -1], [2, 0],
];

// Flat-top hex: axial → world XZ coordinates
export function axialToWorld(q: number, r: number): [number, number] {
  const x = HEX_SIZE * (3 / 2) * q;
  const z = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return [x, z];
}

// 6 vertex offsets (flat-top hex, clockwise from right)
export function hexCorners(q: number, r: number): [number, number][] {
  const [cx, cz] = axialToWorld(q, r);
  return Array.from({ length: 6 }, (_, i) => {
    const ang = (Math.PI / 180) * (60 * i);
    return [
      cx + HEX_SIZE * Math.cos(ang),
      cz + HEX_SIZE * Math.sin(ang),
    ] as [number, number];
  });
}

// Get world position for a settlement at a specific corner
export function getSettlementWorldPos(
  hexQ: number,
  hexR: number,
  cornerIndex: number
): [number, number, number] {
  const corners = hexCorners(hexQ, hexR);
  const [x, z] = corners[cornerIndex];
  return [x, 0, z]; // y = 0 base height
}

const PREC = 100;
function vertexKey(x: number, z: number): string {
  return `${Math.round(x * PREC)},${Math.round(z * PREC)}`;
}

export interface BoardVertex {
  key: string;
  x: number;
  z: number;
}

export interface BoardEdge {
  key1: string;
  key2: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

/** All unique vertices from the 19 hexes (corners merged) */
export function getBoardVertices(hexList: [number, number][]): BoardVertex[] {
  const map = new Map<string, { x: number; z: number }>();
  for (const [q, r] of hexList) {
    const corners = hexCorners(q, r);
    for (const [x, z] of corners) {
      const key = vertexKey(x, z);
      if (!map.has(key)) map.set(key, { x, z });
    }
  }
  return Array.from(map.entries()).map(([key, { x, z }]) => ({ key, x, z }));
}

/** All edges (each edge once), with world coords */
export function getBoardEdges(hexList: [number, number][]): BoardEdge[] {
  const set = new Set<string>();
  const list: BoardEdge[] = [];
  for (const [q, r] of hexList) {
    const corners = hexCorners(q, r);
    for (let i = 0; i < 6; i++) {
      const [x1, z1] = corners[i];
      const [x2, z2] = corners[(i + 1) % 6];
      const k1 = vertexKey(x1, z1);
      const k2 = vertexKey(x2, z2);
      const edgeKey = k1 < k2 ? `${k1}-${k2}` : `${k2}-${k1}`;
      if (!set.has(edgeKey)) {
        set.add(edgeKey);
        list.push({ key1: k1, key2: k2, x1, z1, x2, z2 });
      }
    }
  }
  return list;
}

/** Edges that belong to exactly one hex (perimeter of the board) */
export function getPerimeterEdges(
  hexList: [number, number][],
  allEdges: BoardEdge[]
): BoardEdge[] {
  const count = new Map<string, number>();
  for (const [q, r] of hexList) {
    const corners = hexCorners(q, r);
    for (let i = 0; i < 6; i++) {
      const [x1, z1] = corners[i];
      const [x2, z2] = corners[(i + 1) % 6];
      const k1 = vertexKey(x1, z1);
      const k2 = vertexKey(x2, z2);
      const edgeKey = k1 < k2 ? `${k1}-${k2}` : `${k2}-${k1}`;
      count.set(edgeKey, (count.get(edgeKey) ?? 0) + 1);
    }
  }
  return allEdges.filter((e) => {
    const edgeKey = e.key1 < e.key2 ? `${e.key1}-${e.key2}` : `${e.key2}-${e.key1}`;
    return count.get(edgeKey) === 1;
  });
}

/** Settlement position (x, z) for each home tile; corner varies (i % 6) so they spread around the board */
export function getHomeSettlementPositions(
  hexList: [number, number][],
  homeIndices: number[]
): [number, number][] {
  return homeIndices.map((idx, i) => {
    const [q, r] = hexList[idx];
    const corners = hexCorners(q, r);
    const cornerIndex = i % 6;
    const [x, z] = corners[cornerIndex];
    return [x, z];
  });
}

/** Three building positions (x, z) per hex: triangle of corners 0, 2, 4 for settlements + city */
export function getAgentBuildingPositions(q: number, r: number): [number, number][] {
  const corners = hexCorners(q, r);
  return [corners[0], corners[2], corners[4]].map(([x, z]) => [x, z]);
}
