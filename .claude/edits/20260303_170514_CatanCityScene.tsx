import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Preload, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  BOARD_HEXES,
  axialToWorld,
  hexCorners,
  getSettlementWorldPos,
} from './hexUtils';
import {
  getTileConfig,
  TILE_TYPE_SEQUENCE,
  ROADS,
  mixColors,
} from './catanData';
import { HOUSE_TYPES } from '../../config/houseTypes';
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
  pointLightRef?: React.RefObject<THREE.PointLight | null>;
}

function HexTile({ q, r, bobOffset, pointLightRef }: HexTileProps) {
  const groupRef = useRef<THREE.Group>(null);
  const hexIndex = BOARD_HEXES.findIndex(([hq, hr]) => hq === q && hr === r);
  const tileType = TILE_TYPE_SEQUENCE[hexIndex];
  const config = getTileConfig(tileType);

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

    const extrudeGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.45,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.04,
    });

    return extrudeGeometry;
  }, [q, r]);

  const topMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: config.topColor,
        emissive: config.emissiveColor,
        emissiveIntensity: 0.3,
        metalness: 0.2,
        roughness: 0.7,
      }),
    [config]
  );

  const sideMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: config.sideColor,
        metalness: 0.1,
        roughness: 0.8,
      }),
    [config]
  );

  const baseY = 0.3;
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y =
        baseY + Math.sin(state.clock.elapsedTime * 0.6 + bobOffset) * 0.15;
    }
  });

  const [x, z] = axialToWorld(q, r);
  return (
    <group ref={groupRef} position={[x, 0, z]}>
      <mesh geometry={geometry} material={[sideMat, topMat]} castShadow receiveShadow />

      <Html
        position={[0, 0.3, 0]}
        distanceFactor={1}
        scale={0.6}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            fontFamily: 'VT323, monospace',
            fontSize: '12px',
            color: '#fff',
            textShadow: '0 0 4px rgba(0,0,0,0.8)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {tileType === 'desert' ? 'DESERT' : tileType.toUpperCase()}
        </div>
      </Html>

      {pointLightRef && (
        <pointLight
          ref={pointLightRef}
          intensity={1.2}
          distance={8}
          decay={2}
          color={config.emissiveColor}
        />
      )}
    </group>
  );
}

// ============================================================================
// SETTLEMENT COMPONENT (CITY RESIDENTS)
// ============================================================================

interface CitySettlementProps {
  resident: Resident;
  house: House;
  spriteTexture: THREE.Texture | null;
  onSelect: () => void;
}

function CitySettlement({
  resident,
  house,
  spriteTexture,
  onSelect,
}: CitySettlementProps) {
  const floatGroupRef = useRef<THREE.Group>(null);

  // Find which hex this house type maps to
  const tileIndex = TILE_TYPE_SEQUENCE.findIndex(t => t === house.type);
  const hexData = BOARD_HEXES[tileIndex] || [0, 0];
  const [hexQ, hexR] = hexData;
  const cornerIndex = Math.floor(Math.random() * 6); // Random corner on the tile

  const config = getTileConfig(house.type);
  const [x, y, z] = getSettlementWorldPos(hexQ, hexR, cornerIndex);

  useFrame((state) => {
    if (floatGroupRef.current) {
      floatGroupRef.current.position.y =
        0.5 + Math.sin(state.clock.elapsedTime * 1.5 + resident.id.charCodeAt(0)) * 0.2;
    }
  });

  return (
    <group position={[x, y, z]} onClick={onSelect}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.15, 8]} />
        <meshStandardMaterial color={config.topColor} metalness={0.4} roughness={0.6} />
      </mesh>

      <mesh position={[0, 0.08, 0]}>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color={config.emissiveColor} transparent opacity={0.4} />
      </mesh>

      <group ref={floatGroupRef} position={[0, 0, 0]}>
        {spriteTexture && (
          <Billboard>
            <mesh castShadow>
              <planeGeometry args={[1.2, 1.2]} />
              <meshBasicMaterial
                map={spriteTexture}
                transparent
                alphaTest={0.08}
                color="#ffffff"
              />
            </mesh>
          </Billboard>
        )}

        <pointLight
          intensity={1.5}
          distance={5}
          decay={2}
          color={config.emissiveColor}
        />
      </group>

      <Html position={[0, 1.2, 0]} distanceFactor={1} scale={0.5} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            background: 'rgba(5, 5, 20, 0.85)',
            border: `2px solid ${config.topColor}`,
            borderRadius: '4px',
            padding: '4px 8px',
            fontFamily: 'VT323, monospace',
            fontSize: '10px',
            color: config.emissiveColor,
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(4px)',
            cursor: 'pointer',
          }}
        >
          {resident.name}
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// ROAD COMPONENT
// ============================================================================

interface RoadProps {
  from: [number, number];
  to: [number, number];
  roadIndex: number;
  fromColor: string;
  toColor: string;
}

function Road({ from, to, roadIndex, fromColor, toColor }: RoadProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const roadColor = mixColors(fromColor, toColor);

  const curve = useMemo(() => {
    const start = new THREE.Vector3(from[0], 0.6, from[1]);
    const end = new THREE.Vector3(to[0], 0.6, to[1]);
    const mid = new THREE.Vector3((start.x + end.x) / 2, 1.0, (start.z + end.z) / 2);

    return new THREE.CatmullRomCurve3([start, mid, end]);
  }, [from, to]);

  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 20, 0.06, 6, false);
  }, [curve]);

  useFrame((state) => {
    if (meshRef.current && meshRef.current.material instanceof THREE.MeshBasicMaterial) {
      const opacity = 0.6 + Math.sin(state.clock.elapsedTime * 2 + roadIndex * 0.3) * 0.25;
      meshRef.current.material.opacity = opacity;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshBasicMaterial color={roadColor} transparent opacity={0.7} />
    </mesh>
  );
}

// ============================================================================
// OCEAN PLANE COMPONENT
// ============================================================================

function OceanPlane() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && meshRef.current.material instanceof THREE.MeshBasicMaterial) {
      const opacity = 0.20 + Math.sin(state.clock.elapsedTime * 0.8) * 0.065;
      meshRef.current.material.opacity = opacity;
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.6, 0]}
      receiveShadow
    >
      <circleGeometry args={[22, 64]} />
      <meshBasicMaterial color="#0c4a6e" transparent opacity={0.25} />
    </mesh>
  );
}

// ============================================================================
// LIGHTING COMPONENT
// ============================================================================

function CatanLighting() {
  return (
    <>
      <ambientLight intensity={0.5} color="#e0e0ff" />
      <directionalLight
        position={[8, 12, 8]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-5, 8, -5]} intensity={0.6} color="#ffd700" />
    </>
  );
}

// ============================================================================
// FLOATING PARTICLES COMPONENT
// ============================================================================

function FloatingParticles() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x += 0.0005;
      groupRef.current.rotation.y += 0.0008;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 15;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 5 + Math.sin(i * 0.3) * 3;

        return (
          <mesh key={i} position={[x, y, z]} scale={0.08}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================================
// CATAN CITY SCENE (FOR CITY VIEW)
// ============================================================================

interface CatanSceneProps {
  entries: Array<{ resident: Resident; house: House }>;
  onSelectResident: (resident: Resident, house: House) => void;
}

function CatanScene({ entries, onSelectResident }: CatanSceneProps) {
  const orbitControlsRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(false); // Disabled in city view
  const [spriteTextures, setSpriteTextures] = useState<Map<number, THREE.Texture>>(
    new Map()
  );

  // Load sprite textures for residents
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    const textures = new Map<number, THREE.Texture>();

    entries.forEach(({ house }) => {
      const houseConfig = HOUSE_TYPES[house.type];
      if (!houseConfig) return;

      const pokemonId = houseConfig.pokemonId;
      const animatedUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemonId}.gif`;
      const fallbackUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;

      textureLoader.load(
        animatedUrl,
        (texture) => {
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          textures.set(pokemonId, texture);
          setSpriteTextures((prev) => new Map(prev).set(pokemonId, texture));
        },
        undefined,
        () => {
          textureLoader.load(fallbackUrl, (texture) => {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            textures.set(pokemonId, texture);
            setSpriteTextures((prev) => new Map(prev).set(pokemonId, texture));
          });
        }
      );
    });
  }, [entries]);

  const pointLightRefs = useMemo(() => {
    return Array.from({ length: 6 }, () => React.createRef<THREE.PointLight>());
  }, []);

  const handleOrbitStart = () => {
    setAutoRotate(false);
  };

  return (
    <>
      <CatanLighting />
      <OceanPlane />

      {/* Hex tiles */}
      {BOARD_HEXES.map(([q, r], idx) => {
        const lightRef = pointLightRefs[idx % 6];
        return (
          <HexTile
            key={`hex-${q}-${r}`}
            q={q}
            r={r}
            bobOffset={idx * 0.2}
            pointLightRef={lightRef}
          />
        );
      })}

      {/* Roads between settlements (if we have enough) */}
      {entries.length >= 2 &&
        ROADS.slice(0, entries.length - 1).map(([fromIdx, toIdx], roadIdx) => {
          if (fromIdx >= entries.length || toIdx >= entries.length) return null;

          const fromEntry = entries[fromIdx];
          const toEntry = entries[toIdx];
          const fromTile = TILE_TYPE_SEQUENCE.findIndex(t => t === fromEntry.house.type);
          const toTile = TILE_TYPE_SEQUENCE.findIndex(t => t === toEntry.house.type);

          if (fromTile === -1 || toTile === -1) return null;

          const fromHex = BOARD_HEXES[fromTile];
          const toHex = BOARD_HEXES[toTile];
          const [fromX, fromZ] = axialToWorld(fromHex[0], fromHex[1]);
          const [toX, toZ] = axialToWorld(toHex[0], toHex[1]);

          return (
            <Road
              key={`road-${fromIdx}-${toIdx}`}
              from={[fromX, fromZ]}
              to={[toX, toZ]}
              roadIndex={roadIdx}
              fromColor={HOUSE_TYPES[fromEntry.house.type].color}
              toColor={HOUSE_TYPES[toEntry.house.type].color}
            />
          );
        })}

      {/* Settlements (city residents) */}
      {entries.map(({ resident, house }) => {
        const houseConfig = HOUSE_TYPES[house.type];
        if (!houseConfig) return null;

        return (
          <CitySettlement
            key={resident.id}
            resident={resident}
            house={house}
            spriteTexture={spriteTextures.get(houseConfig.pokemonId) || null}
            onSelect={() => onSelectResident(resident, house)}
          />
        );
      })}

      {/* Floating particles */}
      <FloatingParticles />

      {/* Canvas controls */}
      <OrbitControls
        ref={orbitControlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={0.4}
        enableDamping
        dampingFactor={0.05}
        onStart={handleOrbitStart}
      />

      <Stars radius={100} depth={50} count={5000} factor={4} />
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
      camera={{ position: [0, 18, 22], fov: 50 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
      }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, #1a1a4e 0%, #0a0a1e 55%, #050510 100%)',
      }}
    >
      <React.Suspense fallback={null}>
        <CatanScene
          entries={entries}
          onSelectResident={onSelectResident}
          onAddClick={onAddClick}
        />
      </React.Suspense>
    </Canvas>
  );
}
