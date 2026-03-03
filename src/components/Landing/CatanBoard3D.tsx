import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Preload, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  BOARD_HEXES,
  axialToWorld,
  HEX_SIZE,
} from './hexUtils';
import {
  getTileConfig,
  TILE_TYPE_SEQUENCE,
  HOME_TILE_INDICES,
  DEMO_AGENT_BY_TYPE,
} from './catanData';
import { spriteAnimatedUrl, spriteArtworkUrl } from '../../config/pokemon';
import { POKEMON_TYPES } from '../../config/pokemonTypes';

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

// ============================================================================
// AGENT BASE GLOW (3D glow under agent tile for distinction)
// ============================================================================

function AgentBaseGlow({ emissiveColor }: { emissiveColor: string }) {
  const glowRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.08);
    }
    if (ringRef.current && ringRef.current.material instanceof THREE.MeshBasicMaterial) {
      ringRef.current.material.opacity = Math.max(0.35, Math.min(0.7, 0.5 + Math.sin(t * 1.5) * 0.15));
    }
  });

  return (
    <group ref={glowRef} position={[0, 0.56, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.85, 0.35, 6]} />
        <meshBasicMaterial
          color={emissiveColor}
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.75, 32]} />
        <meshBasicMaterial
          color={emissiveColor}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// HEX TILE COMPONENT (max 3D: token, glow, sprite fix)
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
  typeLabel,
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
      emissiveIntensity: 0.25,
      metalness: 0.2,
      roughness: 0.65,
    });
    const bottom = new THREE.MeshStandardMaterial({
      color: config.sideColor,
      metalness: 0.15,
      roughness: 0.8,
    });
    const side = new THREE.MeshStandardMaterial({
      color: config.sideColor,
      metalness: 0.15,
      roughness: 0.8,
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

      {/* Catan-style token: hex base + type disc (Pokémon type = sprite) */}
      <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 0.95, 0.12, 6]} />
        <meshStandardMaterial
          color={config.sideColor}
          metalness={0.2}
          roughness={0.7}
        />
      </mesh>
      {config.tokenType && POKEMON_TYPES[config.tokenType] && (
        <mesh position={[0, 0.75, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <circleGeometry args={[0.72, 32]} />
          <meshStandardMaterial
            color={POKEMON_TYPES[config.tokenType].color}
            metalness={0.15}
            roughness={0.7}
          />
        </mesh>
      )}
      {!config.tokenType && (
        <mesh position={[0, 0.75, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <circleGeometry args={[0.72, 32]} />
          <meshStandardMaterial color={config.sideColor} metalness={0.15} roughness={0.7} />
        </mesh>
      )}

      {/* Token face: type symbol + type name — scale with zoom for visibility */}
      <Html position={[0, 0.78, 0]} distanceFactor={12} transform style={{ pointerEvents: 'none' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Dogica, monospace',
            color: '#fff',
            textShadow: '0 0 6px rgba(0,0,0,0.95), 0 0 12px rgba(255,255,255,0.2)',
            textAlign: 'center',
          }}
        >
          {config.tokenType && POKEMON_TYPES[config.tokenType] ? (
            <>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{POKEMON_TYPES[config.tokenType].emoji}</span>
              <span style={{ fontSize: '8px', fontWeight: 'bold', letterSpacing: '0.04em', marginTop: 2 }}>
                {POKEMON_TYPES[config.tokenType].name.toUpperCase()}
              </span>
            </>
          ) : (
            <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.05em' }}>{typeLabel}</span>
          )}
        </div>
      </Html>

      {/* Agent base glow when demo agent on tile */}
      {pokemonId && <AgentBaseGlow emissiveColor={config.emissiveColor} />}

      {/* Demo agent name floating above sprite — zoom-responsive, float, glow */}
      {pokemonId && agentName && (
        <FloatingAgentName
          name={agentName}
          glowColor={config.emissiveColor}
          baseY={1.55}
        />
      )}

      {/* Pokemon sprite: 2D texture in 3D with correct depth/visibility */}
      {pokemonId && pokeTexture && (
        <group position={[0, 1.3, 0]}>
          <Billboard follow={true}>
            <mesh renderOrder={1} castShadow={false}>
              <planeGeometry args={[1.5, 1.5]} />
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
          <pointLight
            intensity={1.2}
            distance={4}
            decay={2}
            color={config.emissiveColor}
          />
        </group>
      )}
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

  // Load sprites: same as panel (left/top) — showdown animated, fallback official artwork
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    const pokemonIds = [251, 68, 235, 18, 57, 52];

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
