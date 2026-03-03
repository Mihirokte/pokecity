import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Preload, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  BOARD_HEXES,
  axialToWorld,
  hexCorners,
} from './hexUtils';
import {
  getTileConfig,
  TILE_TYPE_SEQUENCE,
  HOME_TILE_INDICES,
} from './catanData';
import type { House, Resident } from '../../types';

interface CatanCitySceneProps {
  entries: Array<{ resident: Resident; house: House }>;
  onSelectResident: (resident: Resident, house: House) => void;
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
  spriteTextures: Map<number, THREE.Texture>;
  isHomeTile: boolean;
}

function HexTile({
  q,
  r,
  bobOffset,
  typeLabel,
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

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const corners = hexCorners(q, r);
    const [x0, z0] = corners[0];
    shape.moveTo(x0, z0);
    for (let i = 1; i < 6; i++) {
      const [x, z] = corners[i];
      shape.lineTo(x, z);
    }
    shape.lineTo(x0, z0);

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.02,
    });
  }, [q, r]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: config.topColor,
        emissive: isOccupied ? config.emissiveColor : config.topColor,
        emissiveIntensity: isOccupied ? 0.4 : 0.15,
        metalness: 0.3,
        roughness: 0.6,
      }),
    [config, isOccupied]
  );

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y =
        0.2 + Math.sin(state.clock.elapsedTime * 0.5 + bobOffset) * 0.1;
    }
  });

  const [x, z] = axialToWorld(q, r);

  return (
    <group ref={groupRef} position={[x, 0, z]}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />

      {/* Type label */}
      <Html
        position={[0, 0.25, 0]}
        distanceFactor={1}
        scale={0.7}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            fontFamily: 'Dogica, monospace',
            fontSize: '10px',
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

      {/* Pokemon sprite (always shown) */}
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
            opacity={isOccupied ? 0.5 : 0.2}
          />
        </mesh>
      )}

      {/* Resident name label if occupied */}
      {isOccupied && residentName && (
        <Html
          position={[0, -0.3, 0]}
          distanceFactor={1}
          scale={0.6}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              fontFamily: 'VT323, monospace',
              fontSize: '9px',
              color: config.emissiveColor,
              textShadow: '0 0 4px rgba(0,0,0,0.9)',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {residentName}
          </div>
        </Html>
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
      groupRef.current.rotation.y += 0.0003;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 11;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 3 + Math.sin(i * 0.5) * 1.5;

        return (
          <mesh key={i} position={[x, y, z]} scale={0.05}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#FFD700" />
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
}

function CatanScene({ entries, onSelectResident }: CatanSceneProps) {
  const [spriteTextures, setSpriteTextures] = useState<Map<number, THREE.Texture>>(
    new Map()
  );

  // Load sprites for all house types
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    const pokemonIds = [251, 68, 235, 18, 57, 52];

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
      <OceanPlane />

      {/* Render all 19 hex tiles */}
      {BOARD_HEXES.map(([q, r], idx) => {
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

            {/* Clickable region for selecting resident */}
            {resident && (
              <Html
                position={[...axialToWorld(q, r), 1]}
                distanceFactor={1}
                scale={1}
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
                onClick={() => {
                  const house = entries.find((e) => e.resident.id === resident.id)?.house;
                  if (house) {
                    onSelectResident(resident, house);
                  }
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    background: 'transparent',
                  }}
                />
              </Html>
            )}
          </group>
        );
      })}

      <FloatingParticles />

      <OrbitControls
        autoRotate={false}
        enableDamping
        dampingFactor={0.08}
      />

      <Stars radius={100} depth={50} count={3000} factor={4} />
      <Preload all />
    </>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function CatanCityScene({
  entries,
  onSelectResident,
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
        background: 'linear-gradient(135deg, #1a2a4a 0%, #0a1a2e 60%, #050810 100%)',
      }}
    >
      <React.Suspense fallback={null}>
        <CatanScene entries={entries} onSelectResident={onSelectResident} />
      </React.Suspense>
    </Canvas>
  );
}
