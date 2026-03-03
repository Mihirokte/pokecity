import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Preload } from '@react-three/drei';
import * as THREE from 'three';
import { CityGround, Tree, LampPost } from '../../pokecenter/components/3d/CityGround';
import { ResidentBuilding3D, EmptyLotMarker3D } from './ResidentBuilding3D';
import type { House, Resident } from '../../types';

interface ThreeCitySceneProps {
  entries: { resident: Resident; house: House }[];
  onSelectBuilding: (resident: Resident, house: House) => void;
  onAddClick: () => void;
}

/** Lay out buildings on a 3-column grid, 7 units apart */
function getGridPosition(index: number): [number, number, number] {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return [(col - 1) * 8, 0, (row - 1) * 8];
}

// Tiny floating gold star particles
function FloatingParticle({
  x, y, z, speed, offset,
}: { x: number; y: number; z: number; speed: number; offset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(state => {
    if (!ref.current) return;
    ref.current.position.y = y + Math.sin(state.clock.elapsedTime * speed + offset) * 0.38;
    ref.current.rotation.y += 0.007;
  });
  return (
    <mesh ref={ref} position={[x, y, z]}>
      <octahedronGeometry args={[0.07, 0]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={0.65} />
    </mesh>
  );
}

function Particles() {
  const items = useMemo(
    () =>
      Array.from({ length: 28 }, () => ({
        x: (Math.random() - 0.5) * 36,
        y: Math.random() * 5 + 0.5,
        z: (Math.random() - 0.5) * 36,
        speed: Math.random() * 0.4 + 0.15,
        offset: Math.random() * Math.PI * 2,
      })),
    [],
  );
  return (
    <>
      {items.map((p, i) => (
        <FloatingParticle key={i} {...p} />
      ))}
    </>
  );
}

function Scene({ entries, onSelectBuilding, onAddClick }: ThreeCitySceneProps) {
  return (
    <>
      {/* ── Lighting ── */}
      <ambientLight intensity={0.5} color="#c8d8f0" />
      <directionalLight
        position={[12, 18, 10]}
        intensity={1.4}
        color="#fffbeb"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={90}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      {/* Subtle indigo fill from below */}
      <pointLight position={[0, -2, 0]} color="#818cf8" intensity={0.3} distance={40} />

      {/* ── Space stars (drei) ── */}
      <Stars radius={70} depth={60} count={4000} factor={3.5} fade speed={0.4} />

      {/* ── Fog (space-haze depth) ── */}
      <fog attach="fog" args={['#0a0a1a', 35, 85]} />

      {/* ── Ground ── */}
      <CityGround size={65} />

      {/* ── Decorations ── */}
      <Tree position={[-13, 0, -13]} />
      <Tree position={[ 13, 0, -13]} />
      <Tree position={[-13, 0,  13]} />
      <Tree position={[ 13, 0,  13]} />
      <Tree position={[  0, 0, -16]} />
      <Tree position={[-16, 0,   0]} />
      <Tree position={[ 16, 0,   0]} />

      <LampPost position={[-5, 0, -13]} />
      <LampPost position={[ 5, 0, -13]} />
      <LampPost position={[-5, 0,  13]} />
      <LampPost position={[ 5, 0,  13]} />
      <LampPost position={[-13, 0, -5]} />
      <LampPost position={[-13, 0,  5]} />
      <LampPost position={[ 13, 0, -5]} />
      <LampPost position={[ 13, 0,  5]} />

      {/* ── Floating particles ── */}
      <Particles />

      {/* ── Buildings ── */}
      {entries.map(({ resident, house }, i) => (
        <ResidentBuilding3D
          key={resident.id}
          house={house}
          resident={resident}
          position={getGridPosition(i)}
          onSelect={() => onSelectBuilding(resident, house)}
        />
      ))}

      {/* ── Empty lot ── */}
      <EmptyLotMarker3D position={getGridPosition(entries.length)} onAddClick={onAddClick} />
    </>
  );
}

function CanvasLoadingFallback() {
  return (
    <Html center>
      <div
        style={{
          fontFamily: 'Dogica, monospace',
          fontSize: 12,
          color: '#818cf8',
          letterSpacing: '0.06em',
          textShadow: '0 0 12px #818cf8',
        }}
      >
        LOADING CITY…
      </div>
    </Html>
  );
}

export function ThreeCityScene({ entries, onSelectBuilding, onAddClick }: ThreeCitySceneProps) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        shadows
        camera={{ position: [0, 15, 24], fov: 52, near: 0.1, far: 250 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{
          background: 'linear-gradient(180deg, #010714 0%, #0a0f2e 45%, #0f172a 100%)',
        }}
      >
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2.15}
          minPolarAngle={0.25}
          minDistance={6}
          maxDistance={50}
          target={[0, 1, 0]}
          makeDefault
        />

        <Suspense fallback={<CanvasLoadingFallback />}>
          <Scene
            entries={entries}
            onSelectBuilding={onSelectBuilding}
            onAddClick={onAddClick}
          />
        </Suspense>

        <Preload all />
      </Canvas>

      {/* ── HUD hint ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(5,5,20,0.72)',
          backdropFilter: 'blur(8px)',
          padding: '5px 18px',
          border: '1px solid rgba(129,140,248,0.18)',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'VT323, monospace',
            fontSize: 14,
            color: '#475569',
            letterSpacing: 1,
          }}
        >
          🖱️ DRAG TO ORBIT · SCROLL TO ZOOM · CLICK TO ENTER
        </span>
      </div>
    </div>
  );
}
