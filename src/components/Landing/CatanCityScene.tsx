import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Preload, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  BOARD_HEXES,
  axialToWorld,
  HEX_SIZE,
  getBoardEdges,
  getPerimeterEdges,
  getHomeSettlementPositions,
} from './hexUtils';
import {
  getTileConfig,
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
          style={{
            fontFamily: 'VT323, monospace',
            fontSize: 'clamp(12px, 2vw, 18px)',
            fontWeight: 'bold',
            color: '#fff',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            padding: '4px 10px',
            borderRadius: 4,
            background: `linear-gradient(180deg, ${glowRgba} 0%, rgba(0,0,0,0.4) 100%)`,
            boxShadow: `0 0 12px ${glowColor}44, 0 0 24px ${glowColor}22, inset 0 0 8px ${glowColor}33`,
            textShadow: `0 0 6px ${glowColor}, 0 0 12px ${glowColor}99, 0 0 4px rgba(0,0,0,0.9)`,
            border: `1px solid ${glowColor}88`,
          }}
        >
          {name}
        </div>
      </Html>
    </group>
  );
}

// Sprite: one size, clearly above the tile surface
const SPRITE_SIZE = 2.8;
const SPRITE_Y = 1.5;

// ============================================================================
// HEX TILE COMPONENT
// ============================================================================

interface HexTileProps {
  q: number;
  r: number;
  bobOffset: number;
  typeLabel: string;
  residentName?: string;
  spriteTextures: Map<number, THREE.Texture>;
  isHomeTile: boolean;
}

function HexTile({
  q,
  r,
  bobOffset,
  typeLabel: _typeLabel,
  residentName,
  spriteTextures,
  isHomeTile,
}: HexTileProps) {
  const groupRef = useRef<THREE.Group>(null);
  const hexIndex = BOARD_HEXES.findIndex(([hq, hr]) => hq === q && hr === r);
  const tileType = TILE_TYPE_SEQUENCE[hexIndex];
  const config = getTileConfig(tileType);

  // Only show pokemon if this is a home tile AND there's a resident
  const isOccupied = isHomeTile && !!residentName;
  const pokemonId = isOccupied ? config.pokemonId : null;
  const pokeTexture = pokemonId ? spriteTextures.get(pokemonId) || null : null;

  // Catan-style: chunky hex with distinct top (resource color) and sloped sides
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
      color: config.topColor,
      emissive: config.emissiveColor,
      emissiveIntensity: 0.18,
      metalness: 0.6,
      roughness: 0.35,
    });
    const bottom = new THREE.MeshStandardMaterial({
      color: config.sideColor,
      metalness: 0.5,
      roughness: 0.5,
    });
    const side = new THREE.MeshStandardMaterial({
      color: config.sideColor,
      metalness: 0.5,
      roughness: 0.5,
    });
    return [top, bottom, side];
  }, [config]);

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
          color={config.borderColor}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Sprite: one size, above surface */}
      {pokemonId && pokeTexture && (
        <group position={[0, SPRITE_Y, 0]}>
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
        </group>
      )}

      {isOccupied && residentName && (
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
}

function CatanScene({ entries, onSelectResident, onAddAgent }: CatanSceneProps) {
  const [spriteTextures, setSpriteTextures] = useState<Map<number, THREE.Texture>>(
    new Map()
  );

  // Load sprites: same as panel (left/top) — showdown animated, fallback official artwork
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    const pokemonIds = [...new Set(Object.values(ELEMENT_SPRITE_IDS))];

    pokemonIds.forEach((pokemonId) => {
      const primaryUrl = spriteAnimatedUrl(pokemonId);   // showdown — matches CityPanel
      const fallbackUrl = spriteArtworkUrl(pokemonId);

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
  }, []);

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

      {/* Catan-style settlements at home vertices + block roads along board perimeter */}
      <SettlementsAndRoads />

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
              spriteTextures={spriteTextures}
              isHomeTile={isHomeTile}
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
// SETTLEMENTS & ROADS (Catan-style: small 3D settlements at vertices, block roads along perimeter)
// ============================================================================

const ROAD_HEIGHT = 0.18;
const ROAD_WIDTH = 0.22;
const SETTLEMENT_BASE_Y = 0.72;

function SettlementsAndRoads() {
  const allEdges = useMemo(() => getBoardEdges(BOARD_HEXES), []);
  const perimeterEdges = useMemo(() => getPerimeterEdges(BOARD_HEXES, allEdges), [allEdges]);
  const homeIndices = useMemo(
    () => Array.from(HOME_TILE_INDICES).sort((a, b) => a - b),
    []
  );
  const settlementPositions = useMemo(
    () => getHomeSettlementPositions(BOARD_HEXES, homeIndices),
    [homeIndices]
  );

  return (
    <group>
      {/* Perimeter roads: 3D blocks along each edge */}
      {perimeterEdges.map((edge, i) => {
        const dx = edge.x2 - edge.x1;
        const dz = edge.z2 - edge.z1;
        const len = Math.sqrt(dx * dx + dz * dz);
        const midX = (edge.x1 + edge.x2) / 2;
        const midZ = (edge.z1 + edge.z2) / 2;
        const rotY = Math.atan2(dx, dz);
        return (
          <mesh
            key={`road-${i}`}
            position={[midX, SETTLEMENT_BASE_Y + ROAD_HEIGHT / 2, midZ]}
            rotation={[0, rotY, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[ROAD_WIDTH, ROAD_HEIGHT, len]} />
            <meshStandardMaterial
              color="#2d3748"
              roughness={0.85}
              metalness={0.2}
            />
          </mesh>
        );
      })}

      {/* Settlements: small 3D blocks beside each home tile vertex */}
      {settlementPositions.map(([x, z], i) => (
        <group key={`settlement-${i}`} position={[x, SETTLEMENT_BASE_Y, z]}>
          {/* Base block */}
          <mesh castShadow receiveShadow position={[0, 0.12, 0]}>
            <boxGeometry args={[0.28, 0.24, 0.28]} />
            <meshStandardMaterial
              color="#4a5568"
              roughness={0.7}
              metalness={0.15}
            />
          </mesh>
          {/* Roof / second tier (city-style for variety) */}
          <mesh castShadow position={[0, 0.3, 0]}>
            <boxGeometry args={[0.2, 0.14, 0.2]} />
            <meshStandardMaterial
              color="#718096"
              roughness={0.6}
              metalness={0.2}
            />
          </mesh>
        </group>
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
        <div style={{
          fontFamily: 'Dogica, monospace',
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#FFD700',
          textShadow: '0 0 8px rgba(0,0,0,0.9)',
          whiteSpace: 'nowrap',
        }}>
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
        <CatanScene entries={entries} onSelectResident={onSelectResident} onAddAgent={onAddAgent} />
      </React.Suspense>
    </Canvas>
  );
}
