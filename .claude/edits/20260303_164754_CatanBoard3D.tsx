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
  DEMO_SETTLEMENTS,
  ROADS,
  mixColors,
} from './catanData';

interface CatanBoard3DProps {
  onLogin: () => void;
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

  // Create hex shape for ExtrudeGeometry
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

  // Two materials: top and side
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

  // Bob animation
  const baseY = 0.3;
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y =
        baseY + Math.sin(state.clock.elapsedTime * 0.6 + bobOffset) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={[...axialToWorld(q, r), 0]}>
      <mesh geometry={geometry} material={[sideMat, topMat]} castShadow receiveShadow />

      {/* Tile label */}
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

      {/* Point light for this tile type (one light per unique type) */}
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
// SETTLEMENT COMPONENT
// ============================================================================

interface SettlementProps {
  settlement: (typeof DEMO_SETTLEMENTS)[0];
  spriteTexture: THREE.Texture | null;
}

function Settlement({ settlement, spriteTexture }: SettlementProps) {
  const floatGroupRef = useRef<THREE.Group>(null);
  const config = getTileConfig(settlement.moduleType);
  const [x, y, z] = getSettlementWorldPos(
    settlement.hexQ,
    settlement.hexR,
    settlement.cornerIndex
  );

  // Float animation
  useFrame((state) => {
    if (floatGroupRef.current) {
      floatGroupRef.current.position.y =
        0.5 + Math.sin(state.clock.elapsedTime * 1.5 + settlement.createdOrder) * 0.2;
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* Base cylinder */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.15, 8]} />
        <meshStandardMaterial color={config.topColor} metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Glow ring */}
      <mesh position={[0, 0.08, 0]}>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color={config.emissiveColor} transparent opacity={0.4} />
      </mesh>

      {/* Floating group for sprite and light */}
      <group ref={floatGroupRef} position={[0, 0, 0]}>
        {/* Billboard sprite */}
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

        {/* Point light */}
        <pointLight
          intensity={1.5}
          distance={5}
          decay={2}
          color={config.emissiveColor}
        />
      </group>

      {/* Name label */}
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
          }}
        >
          {settlement.name}
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// ROAD COMPONENT
// ============================================================================

interface RoadProps {
  fromSettlement: (typeof DEMO_SETTLEMENTS)[0];
  toSettlement: (typeof DEMO_SETTLEMENTS)[0];
  roadIndex: number;
}

function Road({ fromSettlement, toSettlement, roadIndex }: RoadProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const fromConfig = getTileConfig(fromSettlement.moduleType);
  const toConfig = getTileConfig(toSettlement.moduleType);
  const roadColor = mixColors(fromConfig.topColor, toConfig.topColor);

  const curve = useMemo(() => {
    const start = new THREE.Vector3(...getSettlementWorldPos(
      fromSettlement.hexQ,
      fromSettlement.hexR,
      fromSettlement.cornerIndex
    ));
    const end = new THREE.Vector3(...getSettlementWorldPos(
      toSettlement.hexQ,
      toSettlement.hexR,
      toSettlement.cornerIndex
    ));
    const mid = new THREE.Vector3(
      (start.x + end.x) / 2,
      1.0,
      (start.z + end.z) / 2
    );
    start.y = 0.6;

    return new THREE.CatmullRomCurve3([start, mid, end]);
  }, [fromSettlement, toSettlement]);

  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 20, 0.06, 6, false);
  }, [curve]);

  // Pulsing opacity
  useFrame((state) => {
    if (meshRef.current && meshRef.current.material instanceof THREE.MeshBasicMaterial) {
      const opacity = 0.6 + Math.sin(state.clock.elapsedTime * 2 + roadIndex * 0.3) * 0.25;
      meshRef.current.material.opacity = opacity;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      castShadow
      receiveShadow
    >
      <meshBasicMaterial
        color={roadColor}
        transparent
        opacity={0.7}
        wireframe={false}
      />
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
// CATAN SCENE COMPONENT
// ============================================================================

interface CatanSceneProps {
  // onLogin is not needed in CatanScene, handled at parent level
}

function CatanScene({}: CatanSceneProps) {
  const orbitControlsRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [spriteTextures, setSpriteTextures] = useState<Map<number, THREE.Texture>>(
    new Map()
  );

  // Load sprite textures
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    const textures = new Map<number, THREE.Texture>();

    DEMO_SETTLEMENTS.forEach((settlement) => {
      const pokemonId = settlement.pokemonId;
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
          // Fallback to static PNG
          textureLoader.load(
            fallbackUrl,
            (texture) => {
              texture.magFilter = THREE.NearestFilter;
              texture.minFilter = THREE.NearestFilter;
              textures.set(pokemonId, texture);
              setSpriteTextures((prev) => new Map(prev).set(pokemonId, texture));
            }
          );
        }
      );
    });
  }, []);

  // Point light refs (6 tile types)
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
      {BOARD_HEXES.map((([q, r], idx) => {
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
      }))}

      {/* Roads */}
      {ROADS.map(([fromIdx, toIdx], roadIdx) => (
        <Road
          key={`road-${fromIdx}-${toIdx}`}
          fromSettlement={DEMO_SETTLEMENTS[fromIdx]}
          toSettlement={DEMO_SETTLEMENTS[toIdx]}
          roadIndex={roadIdx}
        />
      ))}

      {/* Settlements */}
      {DEMO_SETTLEMENTS.map((settlement) => (
        <Settlement
          key={settlement.id}
          settlement={settlement}
          spriteTexture={spriteTextures.get(settlement.pokemonId) || null}
        />
      ))}

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
// MAIN CATAN BOARD 3D COMPONENT
// ============================================================================

export function CatanBoard3D({ onLogin }: CatanBoard3DProps) {
  return (
    <div className="catan-root">
      <Canvas
        shadows
        camera={{ position: [0, 18, 22], fov: 50 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
        }}
        style={{
          background: 'linear-gradient(135deg, #1a1a4e 0%, #0a0a1e 55%, #050510 100%)',
        }}
      >
        <React.Suspense fallback={null}>
          <CatanScene />
        </React.Suspense>
      </Canvas>

      {/* Overlay UI */}
      <div className="catan-overlay" onClick={(e) => e.stopPropagation()}>
        {/* Top center title */}
        <div className="catan-title-block">
          <h1 className="catan-title">POKÉCITY</h1>
          <p className="catan-subtitle">Catan Edition</p>
        </div>

        {/* Right side info panel */}
        <div className="catan-info-panel">
          <h2 className="catan-info-title">WHAT IS POKÉCITY?</h2>
          <p className="catan-info-body">
            Your life, gamified as a Pokémon city. Each module is run by a Pokémon
            resident — calendar, tasks, notes, travel, gym, and shopping. Built by
            Mihir, powered by Google Sheets.
          </p>

          {/* Module pills */}
          <div className="catan-module-pills">
            <span className="catan-module-pill" style={{ '--pill-color': '#9b59b6' } as React.CSSProperties}>
              📅 Calendar
            </span>
            <span className="catan-module-pill" style={{ '--pill-color': '#c0392b' } as React.CSSProperties}>
              ✅ Tasks
            </span>
            <span className="catan-module-pill" style={{ '--pill-color': '#d4c5a9' } as React.CSSProperties}>
              📝 Notes
            </span>
            <span className="catan-module-pill" style={{ '--pill-color': '#2980b9' } as React.CSSProperties}>
              ✈️ Travel
            </span>
            <span className="catan-module-pill" style={{ '--pill-color': '#7f8c8d' } as React.CSSProperties}>
              💪 Gym
            </span>
            <span className="catan-module-pill" style={{ '--pill-color': '#e91e8c' } as React.CSSProperties}>
              🛒 Shopping
            </span>
          </div>

          <p className="catan-info-footer">
            No server. No fees. Just you and your city.
          </p>

          {/* Sign-in button */}
          <button className="catan-signin-btn" onClick={onLogin}>
            SIGN IN WITH GOOGLE
          </button>
        </div>

        {/* Bottom hint */}
        <div className="catan-hint">DRAG TO EXPLORE • CLICK TO SIGN IN</div>
      </div>
    </div>
  );
}
