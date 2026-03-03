import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Preload, Billboard, Html } from '@react-three/drei';
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

interface CatanBoard3DProps {
  onLogin: () => void;
}

// ============================================================================
// HEX TILE COMPONENT (SOLID COLOR + TYPE LABEL)
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

  // Create hex geometry: local shape at origin, rotated flat
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Build hex centered at origin (local coordinates)
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 3) * i;
      const lx = HEX_SIZE * Math.cos(ang);
      const ly = HEX_SIZE * Math.sin(ang);
      if (i === 0) shape.moveTo(lx, ly);
      else shape.lineTo(lx, ly);
    }

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.55,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.04,
      bevelSegments: 2,
    });
    geo.rotateX(-Math.PI / 2); // lay flat: hex face → XZ plane, extrusion → Y up
    return geo;
  }, []);

  // Solid color material
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: config.topColor,
        emissive: config.emissiveColor,
        emissiveIntensity: 0.25,
        metalness: 0.3,
        roughness: 0.6,
      }),
    [config]
  );

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
      {/* Hexagon tile */}
      <mesh geometry={geometry} material={material} castShadow receiveShadow />

      {/* Type label centered on tile */}
      <Html
        position={[0, 0.65, 0]}
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

      {/* Pokemon sprite floating above tile */}
      {pokemonId && pokeTexture && (
        <group position={[0, 1.2, 0]}>
          <Billboard>
            <mesh castShadow>
              <planeGeometry args={[1.4, 1.4]} />
              <meshBasicMaterial
                map={pokeTexture}
                transparent
                alphaTest={0.05}
                color="#ffffff"
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

      {/* Glow circle under sprite */}
      {pokemonId && (
        <mesh position={[0, 0.15, 0]}>
          <circleGeometry args={[0.5, 16]} />
          <meshBasicMaterial
            color={config.emissiveColor}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// LIGHTING
// ============================================================================

function CatanLighting() {
  return (
    <>
      <ambientLight intensity={0.6} color="#e8e8ff" />
      <directionalLight
        position={[10, 14, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-6, 8, -6]} intensity={0.5} color="#ffd700" />
    </>
  );
}

// ============================================================================
// OCEAN PLANE
// ============================================================================

function OceanPlane() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && meshRef.current.material instanceof THREE.MeshBasicMaterial) {
      const opacity = 0.15 + Math.sin(state.clock.elapsedTime * 0.7) * 0.05;
      meshRef.current.material.opacity = opacity;
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 0]}
      receiveShadow
    >
      <circleGeometry args={[20, 64]} />
      <meshBasicMaterial color="#0a3a52" transparent opacity={0.2} />
    </mesh>
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
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const radius = 12;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 4 + Math.sin(i * 0.4) * 2;

        return (
          <mesh key={i} position={[x, y, z]} scale={0.06}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#FFD700" />
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

  // Load all pokemon sprites
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    const pokemonIds = [251, 68, 235, 18, 57, 52]; // From catanData

    pokemonIds.forEach((pokemonId) => {
      const animatedUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemonId}.gif`;
      const fallbackUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;

      textureLoader.load(
        animatedUrl,
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
      <OceanPlane />

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

      <Stars radius={100} depth={50} count={4000} factor={4} />
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
        style={{
          background: 'linear-gradient(135deg, #1a2a4a 0%, #0a1a2e 60%, #050810 100%)',
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
