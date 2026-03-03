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
  DEMO_AGENT_BY_TYPE,
} from './catanData';
import { spriteAnimatedUrl, spriteArtworkUrl, ELEMENT_SPRITE_IDS } from '../../config/pokemon';

/**
 * PRE-LOGIN LANDING SCENE ONLY.
 * Used by LandingPage when user is not signed in.
 * - Hex tiles are display-only (demo labels from DEMO_AGENT_BY_TYPE). No selection, no panel.
 * - Only interactive element is the overlay "SIGN IN WITH GOOGLE" button.
 * - Do not add onSelectResident or clickable resident meshes here; that belongs to CatanCityScene (post-login).
 */
interface CatanBoard3DProps {
  onLogin: () => void;
}

// ============================================================================
// FLOATING AGENT NAME (above sprite, zoom-responsive, gentle float, glow)
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

// Sprite: sized to fit within hex (match CatanCityScene)
const SPRITE_SIZE = HEX_SIZE * 0.92;
const HEX_TOP_Y = 0.65;
const SPRITE_Y = HEX_TOP_Y + SPRITE_SIZE / 2 + 0.15;

// ============================================================================
// HEX TILE COMPONENT
// ============================================================================

interface HexTileProps {
  q: number;
  r: number;
  bobOffset: number;
  typeLabel: string;
  agentName?: string;
  spriteTextures: Map<number, THREE.Texture>;
}

function HexTile({
  q,
  r,
  bobOffset,
  typeLabel: _typeLabel,
  agentName,
  spriteTextures,
}: HexTileProps) {
  const groupRef = useRef<THREE.Group>(null);
  const hexIndex = BOARD_HEXES.findIndex(([hq, hr]) => hq === q && hr === r);
  const tileType = TILE_TYPE_SEQUENCE[hexIndex];
  const config = getTileConfig(tileType);

  // Only show pokemon if this is a home tile AND there's an agent
  const pokemonId = agentName ? config.pokemonId : null;
  const pokeTexture = pokemonId ? spriteTextures.get(pokemonId) || null : null;

  // Catan-style: chunky hex with distinct top and sloped sides
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

  // Bob animation
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

      {pokemonId && agentName && (
        <FloatingAgentName
          name={agentName}
          glowColor={config.emissiveColor}
          baseY={SPRITE_Y + SPRITE_SIZE / 2 + 0.25}
        />
      )}

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
    </group>
  );
}

// ============================================================================
// SETTLEMENTS & ROADS (visible light blue settlements + white perimeter roads)
// ============================================================================

const ROAD_HEIGHT = 0.36;
const ROAD_WIDTH = 0.42;
const SETTLEMENT_BASE_Y = 0.72;
const ROAD_COLOR = '#f0f4f8';
const SETTLEMENT_BASE_COLOR = '#93c5fd';
const SETTLEMENT_ROOF_COLOR = '#bfdbfe';

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
              color={ROAD_COLOR}
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>
        );
      })}
      {settlementPositions.map(([x, z], i) => (
        <group key={`settlement-${i}`} position={[x, SETTLEMENT_BASE_Y, z]}>
          <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
            <boxGeometry args={[0.48, 0.4, 0.48]} />
            <meshStandardMaterial color={SETTLEMENT_BASE_COLOR} roughness={0.6} metalness={0.1} />
          </mesh>
          <mesh castShadow position={[0, 0.52, 0]}>
            <boxGeometry args={[0.34, 0.24, 0.34]} />
            <meshStandardMaterial color={SETTLEMENT_ROOF_COLOR} roughness={0.5} metalness={0.15} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Ground and platform height (platform = board, ground = below)
const GROUND_Y = -1.8;
const PLATFORM_HEIGHT = 0.9;
const PLATFORM_TOP_Y = 0;

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
      groupRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const radius = 10 + (i % 3) * 1.5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 4 + Math.sin(i * 0.7) * 2;

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
// CATAN SCENE
// ============================================================================

function CatanScene() {
  const orbitControlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [spriteTextures, setSpriteTextures] = useState<Map<number, THREE.Texture>>(
    new Map()
  );

  // Load sprites: HD official artwork; ref for disposal on unmount
  const texturesRef = useRef<Map<number, THREE.Texture>>(new Map());
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    const pokemonIds = [...new Set(Object.values(ELEMENT_SPRITE_IDS))];

    pokemonIds.forEach((pokemonId) => {
      const primaryUrl = spriteArtworkUrl(pokemonId);
      const fallbackUrl = spriteAnimatedUrl(pokemonId);
      const onLoad = (texture: THREE.Texture) => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texturesRef.current.set(pokemonId, texture);
        setSpriteTextures((prev) => new Map(prev).set(pokemonId, texture));
      };
      textureLoader.load(
        primaryUrl,
        onLoad,
        undefined,
        () => {
          textureLoader.load(fallbackUrl, (texture) => {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texturesRef.current.set(pokemonId, texture);
            setSpriteTextures((prev) => new Map(prev).set(pokemonId, texture));
          });
        }
      );
    });
    return () => {
      texturesRef.current.forEach((t) => t.dispose());
      texturesRef.current.clear();
    };
  }, []);

  const handleOrbitStart = () => {
    setAutoRotate(false);
  };

  return (
    <>
      <CatanLighting />
      {/* Do not remove: sky and mountains background must always be present */}
      <SkyGradient />
      <GrassyGround />
      <BoardPlatform />
      <Mountains />
      <Sun />

      <SettlementsAndRoads />

      {/* Render all 19 hex tiles */}
      {BOARD_HEXES.map(([q, r], idx) => {
        const tileType = TILE_TYPE_SEQUENCE[idx];
        const isHomeTile = HOME_TILE_INDICES.has(idx);
        const agentName = isHomeTile ? DEMO_AGENT_BY_TYPE[tileType] : undefined;

        return (
          <HexTile
            key={`hex-${q}-${r}`}
            q={q}
            r={r}
            bobOffset={idx * 0.15}
            typeLabel={tileType === 'desert' ? 'DESERT' : tileType.toUpperCase()}
            agentName={agentName}
            spriteTextures={spriteTextures}
          />
        );
      })}

      <FloatingParticles />

      <OrbitControls
        ref={orbitControlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={0.3}
        enableDamping
        dampingFactor={0.08}
        onStart={handleOrbitStart}
        maxPolarAngle={Math.PI * 0.82}
        minPolarAngle={0.1}
      />

      <Preload all />
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CatanBoard3D({ onLogin }: CatanBoard3DProps) {
  return (
    <div className="catan-root">
      <Canvas
        shadows
        camera={{ position: [0, 16, 20], fov: 50 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
        }}
      >
        <React.Suspense fallback={null}>
          <CatanScene />
        </React.Suspense>
      </Canvas>

      {/* Overlay UI */}
      <div className="catan-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="catan-title-block">
          <h1 className="catan-title">POKÉCITY</h1>
          <p className="catan-subtitle">Your City Awaits</p>
        </div>

        <div className="catan-info-panel">
          <h2 className="catan-info-title">WHAT IS POKÉCITY?</h2>
          <p className="catan-info-body">
            Your life, gamified. Six Pokémon modules manage your productivity: calendar,
            tasks, notes, travel, gym, and shopping. Built by Mihir on Google Sheets.
          </p>
          <p className="catan-info-footer">
            No server. No fees. Just you and your city.
          </p>
          <button className="catan-signin-btn" onClick={onLogin}>
            SIGN IN WITH GOOGLE
          </button>
        </div>

        <div className="catan-hint">DRAG TO EXPLORE • CLICK TO SIGN IN</div>
      </div>
    </div>
  );
}
