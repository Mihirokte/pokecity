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

      {/* 3D token base for type label */}
      <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 0.95, 0.12, 6]} />
        <meshStandardMaterial
          color={config.sideColor}
          metalness={0.2}
          roughness={0.7}
        />
      </mesh>

      <Html
        position={[0, 0.72, 0]}
        distanceFactor={1}
        scale={0.8}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            fontFamily: 'Dogica, monospace',
            fontSize: '11px',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '0 0 8px rgba(0,0,0,0.9)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            letterSpacing: '0.05em',
          }}
        >
          {typeLabel}
        </div>
      </Html>

      {/* Agent base glow when demo agent on tile */}
      {pokemonId && <AgentBaseGlow emissiveColor={config.emissiveColor} />}

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

// ============================================================================
// GRASSY GROUND
// ============================================================================

function GrassyGround() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 0]}
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
// MOUNTAINS
// ============================================================================

function Mountains() {
  const mountains = useMemo(() => {
    const positions: { x: number; z: number; scale: number; height: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 18 + Math.random() * 8;
      positions.push({
        x: Math.cos(angle) * distance,
        z: Math.sin(angle) * distance,
        scale: 0.8 + Math.random() * 1.2,
        height: 4 + Math.random() * 6,
      });
    }
    return positions;
  }, []);

  return (
    <group>
      {mountains.map((mountain, i) => (
        <mesh
          key={i}
          position={[mountain.x, mountain.height / 2 - 0.5, mountain.z]}
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
  const orbitControlsRef = useRef<any>(null);
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
      <SkyGradient />
      <GrassyGround />
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
