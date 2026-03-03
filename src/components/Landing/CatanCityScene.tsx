import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Preload, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  BOARD_HEXES,
  axialToWorld,
  HEX_SIZE,
  getAgentBuildingPositions,
} from './hexUtils';
import {
  getTileConfig,
  getPastelColorForHex,
  TILE_TYPE_SEQUENCE,
  HOME_TILE_INDICES,
} from './catanData';
import { spriteAnimatedUrl, spriteArtworkUrl, ELEMENT_SPRITE_IDS } from '../../config/pokemon';
import type { House, Resident } from '../../types';

/**
 * POST-LOGIN CITY SCENE ONLY.
 * Used by CityView when user is signed in and data is loaded.
 * - Resident tiles (occupied hexes) have an invisible clickable mesh: click → onSelectResident → CityPanel opens.
 * - Central pit: click to add a new resident (onAddAgent).
 * - Pre-login equivalent is CatanBoard3D (display-only, no selection).
 */
interface CatanCitySceneProps {
  entries: Array<{ resident: Resident; house: House }>;
  onSelectResident: (resident: Resident, house: House) => void;
  onAddAgent?: () => void;
  /** When true, hide floating nameplates so they don't layer on top of the side panel */
  panelOpen?: boolean;
}

// ============================================================================
// FLOATING AGENT NAME (above sprite, zoom-responsive size, gentle float, glow)
// ============================================================================

function FloatingAgentName({
  name,
  glowColor,
  baseY,
}: {
  name: string;
  glowColor: string;
  baseY: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = baseY + Math.sin(t * 0.8) * 0.06;
    }
  });

  const rgb = useMemo(() => {
    const hex = glowColor.replace('#', '');
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ] as [number, number, number];
  }, [glowColor]);
  const glowRgba = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.85)`;

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Html
        position={[0, 0, 0]}
        distanceFactor={14}
        transform
        center
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="floating-nameplate"
          style={{
            background: `linear-gradient(180deg, ${glowRgba} 0%, rgba(0,0,0,0.4) 100%)`,
            boxShadow: `0 0 12px ${glowColor}44, 0 0 24px ${glowColor}22, inset 0 0 8px ${glowColor}33`,
            textShadow: `0 0 6px ${glowColor}, 0 0 12px ${glowColor}99, 0 0 4px rgba(0,0,0,0.9)`,
            borderColor: `${glowColor}88`,
          }}
        >
          {name}
        </div>
      </Html>
    </group>
  );
}

// Sprite: sized to fit within hex (proportional to tile)
const SPRITE_SIZE = HEX_SIZE * 0.92;
const HEX_TOP_Y = 0.65;
const SPRITE_Y = HEX_TOP_Y + SPRITE_SIZE / 2 + 0.15;

/** Wraps sprite in a group that bobs up/down to match panel's sprite-float animation */
function SpriteWithFloat({ baseY, children }: { baseY: number; children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime * 1.8;
      groupRef.current.position.y = baseY + Math.sin(t) * 0.18;
    }
  });
  return <group ref={groupRef} position={[0, baseY, 0]}>{children}</group>;
}

// ============================================================================
// HEX TILE COMPONENT
// ============================================================================

interface HexTileProps {
  q: number;
  r: number;
  bobOffset: number;
  typeLabel: string;
  residentName?: string;
  /** When set, use this sprite on the board (matches panel / second-photo style) */
  residentSpriteId?: number;
  spriteTextures: Map<number, THREE.Texture>;
  isHomeTile: boolean;
  /** When true, hide floating nameplate (e.g. when side panel is open) */
  hideNameplate?: boolean;
}

function HexTile({
  q,
  r,
  bobOffset,
  typeLabel: _typeLabel,
  residentName,
  residentSpriteId,
  spriteTextures,
  isHomeTile,
  hideNameplate,
}: HexTileProps) {
  const groupRef = useRef<THREE.Group>(null);
  const hexIndex = BOARD_HEXES.findIndex(([hq, hr]) => hq === q && hr === r);
  const tileType = TILE_TYPE_SEQUENCE[hexIndex];
  const config = getTileConfig(tileType);

  const isOccupied = isHomeTile && !!residentName;
  const pokemonId = isOccupied
    ? (residentSpriteId && Number.isInteger(residentSpriteId) ? residentSpriteId : config.pokemonId)
    : null;
  const pokeTexture = pokemonId ? spriteTextures.get(pokemonId) || null : null;

  const pastel = useMemo(() => getPastelColorForHex(q, r), [q, r]);

  // Catan-style: chunky hex with pastel VIBGYOR radial top and darker sides
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 3) * i;
      const lx = HEX_SIZE * Math.cos(ang);
      const ly = HEX_SIZE * Math.sin(ang);
      if (i === 0) shape.moveTo(lx, ly);
      else shape.lineTo(lx, ly);
    }
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.65,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.06,
      bevelSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const materials = useMemo(() => {
    const top = new THREE.MeshStandardMaterial({
      color: pastel.topColor,
      emissive: pastel.topColor,
      emissiveIntensity: 0.08,
      metalness: 0.15,
      roughness: 0.6,
    });
    const bottom = new THREE.MeshStandardMaterial({
      color: pastel.sideColor,
      metalness: 0.2,
      roughness: 0.65,
    });
    const side = new THREE.MeshStandardMaterial({
      color: pastel.sideColor,
      metalness: 0.2,
      roughness: 0.65,
    });
    return [top, bottom, side];
  }, [pastel]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y =
        0.2 + Math.sin(state.clock.elapsedTime * 0.5 + bobOffset) * 0.1;
    }
  });

  const [x, z] = axialToWorld(q, r);

  return (
    <group ref={groupRef} position={[x, 0, z]}>
      <mesh geometry={geometry} material={materials} castShadow receiveShadow />

      {/* Border ring */}
      <mesh position={[0, 0.68, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[HEX_SIZE * 0.88, HEX_SIZE * 1.0, 6]} />
        <meshBasicMaterial
          color={pastel.borderColor}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Sprite: same as side panel (showdown GIF) with matching float/bob */}
      {pokemonId && pokeTexture && (
        <SpriteWithFloat baseY={SPRITE_Y}>
          <Billboard follow={true}>
            <mesh renderOrder={1} castShadow={false}>
              <planeGeometry args={[SPRITE_SIZE, SPRITE_SIZE]} />
              <meshBasicMaterial
                map={pokeTexture}
                transparent
                alphaTest={0.02}
                depthWrite={false}
                side={THREE.DoubleSide}
                color="#ffffff"
                toneMapped={false}
              />
            </mesh>
          </Billboard>
        </SpriteWithFloat>
      )}

      {isOccupied && residentName && !hideNameplate && (
        <FloatingAgentName
          name={residentName}
          glowColor={config.emissiveColor}
          baseY={SPRITE_Y + SPRITE_SIZE / 2 + 0.25}
        />
      )}
    </group>
  );
}

// Ground and platform height (platform = board, ground = below)
const GROUND_Y = -1.8;
const PLATFORM_HEIGHT = 0.9;
const PLATFORM_TOP_Y = 0; // hexes sit on this

// ============================================================================
// GRASSY GROUND (below platform)
// ============================================================================

function GrassyGround() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, GROUND_Y, 0]}
      receiveShadow
    >
      <circleGeometry args={[30, 64]} />
      <meshStandardMaterial
        color="#2d5a27"
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}

// ============================================================================
// BOARD PLATFORM (raised stage the hexes sit on)
// ============================================================================

function BoardPlatform() {
  return (
    <mesh
      position={[0, PLATFORM_TOP_Y - PLATFORM_HEIGHT / 2, 0]}
      castShadow
      receiveShadow
    >
      <cylinderGeometry args={[14, 14.5, PLATFORM_HEIGHT, 32]} />
      <meshStandardMaterial
        color="#3d5a3a"
        roughness={0.85}
        metalness={0.1}
      />
    </mesh>
  );
}

// ============================================================================
// MOUNTAINS
// ============================================================================

function Mountains() {
  const mountains = useMemo(() => {
    const positions: { x: number; z: number; scale: number; height: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const seed = (i * 7 + 13) % 100;
      const distance = 18 + (seed / 100) * 8;
      const scale = 0.8 + ((seed * 3) % 100) / 100 * 1.2;
      const height = 4 + ((seed * 11) % 100) / 100 * 6;
      positions.push({
        x: Math.cos(angle) * distance,
        z: Math.sin(angle) * distance,
        scale,
        height,
      });
    }
    return positions;
  }, []);

  return (
    <group>
      {mountains.map((mountain, i) => (
        <mesh
          key={i}
          position={[mountain.x, mountain.height / 2 + GROUND_Y, mountain.z]}
          scale={[mountain.scale * 2, mountain.height, mountain.scale * 2]}
          castShadow
        >
          <coneGeometry args={[1, 1, 6]} />
          <meshStandardMaterial
            color="#4a5568"
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// SUN
// ============================================================================

function Sun() {
  const sunRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (sunRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
      sunRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={[8, 8, -15]}>
      <mesh ref={sunRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#fcd34d" />
      </mesh>
      <mesh scale={1.3}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#fef08a" transparent opacity={0.3} />
      </mesh>
      <pointLight intensity={2} distance={50} color="#fef08a" />
    </group>
  );
}

// ============================================================================
// SKY GRADIENT
// ============================================================================

function SkyGradient() {
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[50, 32, 32]} />
      <meshBasicMaterial side={THREE.BackSide}>
        <primitive
          attach="map"
          object={(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 2;
            canvas.height = 256;
            const ctx = canvas.getContext('2d')!;
            const gradient = ctx.createLinearGradient(0, 0, 0, 256);
            gradient.addColorStop(0, '#0ea5e9');
            gradient.addColorStop(0.4, '#7dd3fc');
            gradient.addColorStop(0.7, '#bae6fd');
            gradient.addColorStop(1, '#fcd34d');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 2, 256);
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
          })()}
        />
      </meshBasicMaterial>
    </mesh>
  );
}

// ============================================================================
// LIGHTING
// ============================================================================

function CatanLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#ffffff" />
      <hemisphereLight args={['#7dd3fc', '#2d5a27', 0.5]} />
      <directionalLight
        position={[8, 10, -10]}
        intensity={1.5}
        color="#fef08a"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-6, 8, 6]} intensity={0.3} color="#7dd3fc" />
      <fog attach="fog" args={['#bae6fd', 15, 45]} />
    </>
  );
}

// ============================================================================
// PARTICLES
// ============================================================================

function FloatingParticles() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0003;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const radius = 10 + (i % 3) * 1.5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 3.5 + Math.sin(i * 0.7) * 2;

        return (
          <mesh key={i} position={[x, y, z]} scale={0.06} castShadow>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color="#FFD700"
              emissive="#b8860b"
              emissiveIntensity={0.25}
              metalness={0.3}
              roughness={0.6}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================================
// CATAN CITY SCENE
// ============================================================================

interface CatanSceneProps {
  entries: Array<{ resident: Resident; house: House }>;
  onSelectResident: (resident: Resident, house: House) => void;
  onAddAgent?: () => void;
  panelOpen?: boolean;
}

function CatanScene({ entries, onSelectResident, onAddAgent, panelOpen }: CatanSceneProps) {
  const [spriteTextures, setSpriteTextures] = useState<Map<number, THREE.Texture>>(
    new Map()
  );

  // Load sprites: panel-style (showdown) for residents + element fallbacks for unoccupied tiles
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    const residentIds = entries
      .map((e) => parseInt(e.resident.emoji, 10))
      .filter((n) => !Number.isNaN(n) && n > 0);
    const pokemonIds = [...new Set([...Object.values(ELEMENT_SPRITE_IDS), ...residentIds])];

    pokemonIds.forEach((pokemonId) => {
      const primaryUrl = spriteArtworkUrl(pokemonId);   // HD official artwork
      const fallbackUrl = spriteAnimatedUrl(pokemonId);

      textureLoader.load(
        primaryUrl,
        (texture) => {
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          setSpriteTextures((prev) => new Map(prev).set(pokemonId, texture));
        },
        undefined,
        () => {
          textureLoader.load(fallbackUrl, (texture) => {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            setSpriteTextures((prev) => new Map(prev).set(pokemonId, texture));
          });
        }
      );
    });
  }, [entries]);

  // Map of house type → resident (for highlighting occupied tiles)
  const occupiedTiles = useMemo(() => {
    const map = new Map<string, Resident>();
    entries.forEach(({ resident, house }) => {
      map.set(house.type, resident);
    });
    return map;
  }, [entries]);

  return (
    <>
      <CatanLighting />
      {/* Do not remove: sky and mountains background must always be present */}
      <SkyGradient />
      <GrassyGround />
      <BoardPlatform />
      <Mountains />
      <Sun />

      {/* Central pit replaces center hex when onAddAgent provided (Catan-style spawn) */}
      {onAddAgent && <CentralPit onAddAgent={onAddAgent} />}

      {/* Per-agent: 2 settlements (houses) + 1 city (duplex), connected by smooth white roads */}
      <SettlementsAndRoads entries={entries} />

      {/* Render hex tiles (skip center 0,0 when pit is shown) */}
      {BOARD_HEXES.map(([q, r], idx) => {
        if (onAddAgent && q === 0 && r === 0) return null; // center = pit
        const tileType = TILE_TYPE_SEQUENCE[idx];
        const isHomeTile = HOME_TILE_INDICES.has(idx);
        const resident = isHomeTile ? occupiedTiles.get(tileType) : undefined;

        return (
          <group key={`hex-${q}-${r}`}>
            <HexTile
              q={q}
              r={r}
              bobOffset={idx * 0.15}
              typeLabel={tileType === 'desert' ? 'DESERT' : tileType.toUpperCase()}
              residentName={resident?.name}
              residentSpriteId={resident ? parseInt(resident.emoji, 10) : undefined}
              spriteTextures={spriteTextures}
              isHomeTile={isHomeTile}
              hideNameplate={panelOpen}
            />

            {/* Post-login only: invisible clickable mesh for this resident (never on landing) */}
            {resident && (() => {
              const [wx, wz] = axialToWorld(q, r);
              const house = entries.find((e) => e.resident.id === resident.id)?.house;
              if (!house) return null; // no panel without a house
              return (
                <mesh
                  position={[wx, 1.35, wz]}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectResident(resident, house);
                  }}
                  onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
                  onPointerOut={() => { document.body.style.cursor = 'default'; }}
                >
                  <cylinderGeometry args={[1.85, 1.85, 2.4, 6]} />
                  <meshBasicMaterial visible={false} />
                </mesh>
              );
            })()}
          </group>
        );
      })}

      <FloatingParticles />

      <OrbitControls
        autoRotate={false}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI * 0.82}
        minPolarAngle={0.1}
      />

      <Preload all />
    </>
  );
}

// ============================================================================
// SETTLEMENTS & ROADS — per agent: 2 houses + 1 duplex, smooth white roads
// ============================================================================

const BUILDING_BASE_Y = 0.72;
// Building, road and Pokéball sizes derived from tile (HEX_SIZE) for proper proportion
const B = HEX_SIZE * 0.38; // base unit for building dimensions
const HOUSE_BASE_W = B * 1.26;
const HOUSE_BASE_H = B * 1.05;
const HOUSE_ROOF_W = B * 0.9;
const HOUSE_ROOF_H = B * 0.63;
const DUPLEX_BASE_W = B * 1.58;
const DUPLEX_BASE_H = B * 1.32;
const DUPLEX_MID_W = B * 1.32;
const DUPLEX_MID_H = B * 1.05;
const DUPLEX_ROOF_W = B * 1.1;
const DUPLEX_ROOF_H = B * 0.66;
const ROAD_RADIUS = HEX_SIZE * 0.1;
const ROAD_COLOR = '#f0f4f8';
const ROAD_Y = BUILDING_BASE_Y + 0.1;

/** Shared curve for road mesh and Pokéball path (identical geometry). */
function createRoadCurve(x1: number, z1: number, x2: number, z2: number): THREE.QuadraticBezierCurve3 {
  const y = ROAD_Y;
  const A = new THREE.Vector3(x1, y, z1);
  const B = new THREE.Vector3(x2, y, z2);
  const mid = new THREE.Vector3((x1 + x2) / 2, y, (z1 + z2) / 2);
  const perp = new THREE.Vector3(-(z2 - z1), 0, x2 - x1).normalize().multiplyScalar(0.9);
  const control = mid.clone().add(perp);
  return new THREE.QuadraticBezierCurve3(A, control, B);
}

/** Get position and tangent on the full agent path (forward 0→1→2→0, then back 0→2→1→0). t in [0,1]. */
function getPointOnAgentPath(
  positions: [number, number][],
  t: number
): { point: THREE.Vector3; tangent: THREE.Vector3 } {
  const curves = [
    createRoadCurve(positions[0][0], positions[0][1], positions[1][0], positions[1][1]),
    createRoadCurve(positions[1][0], positions[1][1], positions[2][0], positions[2][1]),
    createRoadCurve(positions[2][0], positions[2][1], positions[0][0], positions[0][1]),
  ];
  const seg = Math.floor(t * 6);
  const localT = (t * 6) % 1;
  const forward = seg < 3;
  const curveIndex = forward ? seg : 5 - seg;
  const u = forward ? localT : 1 - localT;
  const curve = curves[curveIndex];
  const point = curve.getPoint(u);
  const tangent = curve.getTangent(u).normalize();
  if (!forward) tangent.negate();
  return { point, tangent };
}

const BUILDING_PALETTE = [
  '#93c5fd', '#fde68a', '#fecaca', '#bbf7d0', '#e9d5ff', '#fed7aa',
  '#a5f3fc', '#fbcfe8', '#d9f99d',
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function getColorsForAgent(residentId: string): [string, string, string] {
  const h = hashId(residentId);
  const i0 = h % BUILDING_PALETTE.length;
  const i1 = (h + 3) % BUILDING_PALETTE.length;
  const i2 = (h + 7) % BUILDING_PALETTE.length;
  return [
    BUILDING_PALETTE[i0],
    BUILDING_PALETTE[i1],
    BUILDING_PALETTE[i2],
  ];
}

function SmoothRoad({ x1, z1, x2, z2 }: { x1: number; z1: number; x2: number; z2: number }) {
  const curve = useMemo(() => createRoadCurve(x1, z1, x2, z2), [x1, z1, x2, z2]);
  const tubeGeo = useMemo(
    () => new THREE.TubeGeometry(curve, 20, ROAD_RADIUS, 10, false),
    [curve]
  );
  return (
    <mesh geometry={tubeGeo} castShadow receiveShadow>
      <meshStandardMaterial color={ROAD_COLOR} roughness={0.7} metalness={0.1} />
    </mesh>
  );
}

// Pokéball: proportional to road/tile
const POKEBALL_RADIUS = HEX_SIZE * 0.065;
const POKEBALL_LOOP_DURATION = 14;
const POKEBALL_TEXTURE = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  // Top half red, bottom half white, black band at equator, center button
  ctx.fillStyle = '#e53935';
  ctx.fillRect(0, 0, 64, 28);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 28, 64, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 36, 64, 28);
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(32, 32, 6, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
})();

function PokeballOnRoad({
  positions,
  phase = 0,
}: {
  positions: [number, number][];
  phase?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const prevPointRef = useRef(new THREE.Vector3());
  const rollAngleRef = useRef(0);
  const initializedRef = useRef(false);

  useFrame((state) => {
    if (!meshRef.current || positions.length !== 3) return;
    const t = ((state.clock.elapsedTime + phase) / POKEBALL_LOOP_DURATION) % 1;
    const { point, tangent } = getPointOnAgentPath(positions, t);
    meshRef.current.position.copy(point);

    if (!initializedRef.current) {
      prevPointRef.current.copy(point);
      initializedRef.current = true;
    }
    const dist = prevPointRef.current.distanceTo(point);
    prevPointRef.current.copy(point);
    // Roll: axis perpendicular to path (in horizontal plane); set rotation from angle to avoid drift
    const up = new THREE.Vector3(0, 1, 0);
    const axis = new THREE.Vector3().crossVectors(tangent, up).normalize();
    if (axis.lengthSq() > 0.001) {
      rollAngleRef.current += dist / POKEBALL_RADIUS;
      meshRef.current.quaternion.setFromAxisAngle(axis, rollAngleRef.current);
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <sphereGeometry args={[POKEBALL_RADIUS, 24, 24]} />
      <meshStandardMaterial
        map={POKEBALL_TEXTURE}
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  );
}

function House({ x, z, baseColor }: { x: number; z: number; baseColor: string }) {
  const darker = (hex: string, f: number) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * f);
    const g = Math.round(((n >> 8) & 255) * f);
    const b = Math.round((n & 255) * f);
    return '#' + [r, g, b].map((c) => Math.min(255, c).toString(16).padStart(2, '0')).join('');
  };
  return (
    <group position={[x, BUILDING_BASE_Y, z]}>
      <mesh castShadow receiveShadow position={[0, HOUSE_BASE_H / 2, 0]}>
        <boxGeometry args={[HOUSE_BASE_W, HOUSE_BASE_H, HOUSE_BASE_W]} />
        <meshStandardMaterial color={baseColor} roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Pointed roof (pyramid) */}
      <mesh castShadow position={[0, HOUSE_BASE_H + HOUSE_ROOF_H / 2, 0]}>
        <coneGeometry args={[HOUSE_ROOF_W / 2, HOUSE_ROOF_H, 4]} />
        <meshStandardMaterial color={darker(baseColor, 0.85)} roughness={0.5} metalness={0.15} />
      </mesh>
    </group>
  );
}

function Duplex({ x, z, baseColor }: { x: number; z: number; baseColor: string }) {
  const darker = (hex: string, f: number) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * f);
    const g = Math.round(((n >> 8) & 255) * f);
    const b = Math.round((n & 255) * f);
    return '#' + [r, g, b].map((c) => Math.min(255, c).toString(16).padStart(2, '0')).join('');
  };
  return (
    <group position={[x, BUILDING_BASE_Y, z]}>
      <mesh castShadow receiveShadow position={[0, DUPLEX_BASE_H / 2, 0]}>
        <boxGeometry args={[DUPLEX_BASE_W, DUPLEX_BASE_H, DUPLEX_BASE_W]} />
        <meshStandardMaterial color={baseColor} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, DUPLEX_BASE_H + DUPLEX_MID_H / 2, 0]}>
        <boxGeometry args={[DUPLEX_MID_W, DUPLEX_MID_H, DUPLEX_MID_W]} />
        <meshStandardMaterial color={darker(baseColor, 0.9)} roughness={0.55} metalness={0.1} />
      </mesh>
      {/* Pointed roof (pyramid) */}
      <mesh castShadow position={[0, DUPLEX_BASE_H + DUPLEX_MID_H + DUPLEX_ROOF_H / 2, 0]}>
        <coneGeometry args={[DUPLEX_ROOF_W / 2, DUPLEX_ROOF_H, 4]} />
        <meshStandardMaterial color={darker(baseColor, 0.75)} roughness={0.5} metalness={0.15} />
      </mesh>
    </group>
  );
}

interface SettlementsAndRoadsProps {
  entries: Array<{ resident: Resident; house: House }>;
}

function SettlementsAndRoads({ entries }: SettlementsAndRoadsProps) {
  const agentData = useMemo(() => {
    return entries.map(({ resident, house }) => {
      const homeIndex = TILE_TYPE_SEQUENCE.indexOf(house.type);
      const [q, r] = BOARD_HEXES[homeIndex];
      const positions = getAgentBuildingPositions(q, r);
      const colors = getColorsForAgent(resident.id);
      return {
        resident,
        positions,
        colors,
      };
    });
  }, [entries]);

  return (
    <group>
      {agentData.map((agent, ai) => (
        <React.Fragment key={agent.resident.id}>
          {/* Roads connecting the 3 buildings (smooth curve) */}
          <SmoothRoad
            x1={agent.positions[0][0]}
            z1={agent.positions[0][1]}
            x2={agent.positions[1][0]}
            z2={agent.positions[1][1]}
          />
          <SmoothRoad
            x1={agent.positions[1][0]}
            z1={agent.positions[1][1]}
            x2={agent.positions[2][0]}
            z2={agent.positions[2][1]}
          />
          <SmoothRoad
            x1={agent.positions[2][0]}
            z1={agent.positions[2][1]}
            x2={agent.positions[0][0]}
            z2={agent.positions[0][1]}
          />
          {/* 2 settlements (houses) + 1 city (duplex) */}
          <House x={agent.positions[0][0]} z={agent.positions[0][1]} baseColor={agent.colors[0]} />
          <House x={agent.positions[1][0]} z={agent.positions[1][1]} baseColor={agent.colors[1]} />
          <Duplex x={agent.positions[2][0]} z={agent.positions[2][1]} baseColor={agent.colors[2]} />
          {/* Pokéball rolls along this agent's road loop (forward then trace back) */}
          <PokeballOnRoad positions={agent.positions} phase={ai * 2.5} />
        </React.Fragment>
      ))}
    </group>
  );
}

// ============================================================================
// CENTRAL PIT (max 3D: stepped well, raised rim, harbor feel)
// ============================================================================

const NEON_GOLD = '#FFD700';

function NeonPlusSign() {
  const groupRef = useRef<THREE.Group>(null);
  const barThick = 0.12;
  const barLength = 0.7;

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = 1.1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={[0, 1.1, 0]}>
      <pointLight color={NEON_GOLD} intensity={1.5} distance={3} decay={2} />
      {/* Vertical bar */}
      <mesh>
        <boxGeometry args={[barThick, barLength, barThick]} />
        <meshStandardMaterial
          color={NEON_GOLD}
          emissive={NEON_GOLD}
          emissiveIntensity={0.9}
          metalness={0.1}
          roughness={0.3}
        />
      </mesh>
      {/* Horizontal bar */}
      <mesh>
        <boxGeometry args={[barLength, barThick, barThick]} />
        <meshStandardMaterial
          color={NEON_GOLD}
          emissive={NEON_GOLD}
          emissiveIntensity={0.9}
          metalness={0.1}
          roughness={0.3}
        />
      </mesh>
      {/* Glow: slightly larger, transparent */}
      <mesh>
        <boxGeometry args={[barThick + 0.08, barLength + 0.12, barThick + 0.08]} />
        <meshBasicMaterial
          color={NEON_GOLD}
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[barLength + 0.12, barThick + 0.08, barThick + 0.08]} />
        <meshBasicMaterial
          color={NEON_GOLD}
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function CentralPit({ onAddAgent }: { onAddAgent: () => void }) {
  const pitRef = useRef<THREE.Group>(null);
  const innerRadius = 1.2;
  const rimRadius = 1.6;

  const hexShape = useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 3) * i;
      const lx = rimRadius * Math.cos(ang);
      const ly = rimRadius * Math.sin(ang);
      if (i === 0) shape.moveTo(lx, ly);
      else shape.lineTo(lx, ly);
    }
    return shape;
  }, []);

  const pitWallsGeometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(hexShape, {
      depth: 0.7,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.06,
      bevelSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -0.35, 0);
    return geo;
  }, [hexShape]);

  return (
    <group ref={pitRef} position={[0, 0, 0]}>
      {/* Floating 3D neon plus sign above the pit */}
      <NeonPlusSign />
      {/* Raised hexagonal rim (stone edge) */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[rimRadius, rimRadius + 0.05, 0.15, 6]} />
        <meshStandardMaterial
          color="#4a5568"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      {/* Stepped inner walls (two tiers) */}
      <mesh position={[0, -0.22, 0]} geometry={pitWallsGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#3d4a5c"
          roughness={0.85}
          metalness={0.1}
          emissive="#1a2332"
        />
      </mesh>
      {/* Inner floor (deepest level) */}
      <mesh
        position={[0, -0.42, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[innerRadius * 0.9, 6]} />
        <meshStandardMaterial
          color="#2a3544"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
      {/* Golden ring + label plane */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.8, 32]} />
        <meshStandardMaterial
          color="#b8860b"
          metalness={0.4}
          roughness={0.5}
          emissive="#FFD700"
          emissiveIntensity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Html position={[0, 0.02, 0]} center distanceFactor={1.2} style={{ pointerEvents: 'none' }}>
        <div className="pit-label">
          + ADD RESIDENT
        </div>
      </Html>
      {/* Invisible clickable area */}
      <mesh
        position={[0, 0.3, 0]}
        onClick={(e) => { e.stopPropagation(); onAddAgent(); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <cylinderGeometry args={[rimRadius, rimRadius, 0.8, 6]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function CatanCityScene({
  entries,
  onSelectResident,
  onAddAgent,
  panelOpen,
}: CatanCitySceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 16, 20], fov: 50 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
      }}
      style={{
        position: 'absolute',
        inset: 0,
      }}
    >
      <React.Suspense fallback={null}>
        <CatanScene entries={entries} onSelectResident={onSelectResident} onAddAgent={onAddAgent} panelOpen={panelOpen} />
      </React.Suspense>
    </Canvas>
  );
}
