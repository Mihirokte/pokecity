// Hex grid utilities for flat-top hexagons
export const HEX_SIZE = 2.0; // radius (center to vertex) in world units - sized to eliminate gaps

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
