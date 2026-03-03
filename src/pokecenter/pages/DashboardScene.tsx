import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  MapControls, 
  Html,
  Preload,
  OrthographicCamera,
} from '@react-three/drei';
import * as THREE from 'three';
import { usePokecenterStore } from '../pokecenterStore';
import { SpriteActor } from '../components/3d/SpriteActor';
import { RESIDENT_POKEMON_IDS } from '../../config/pokemon';
import type { PCAgent } from '../../types';

// Central Spawn Pit component
interface SpawnPitProps {
  onClick?: () => void;
  agentCount: number;
}

function SpawnPit({ onClick, agentCount }: SpawnPitProps) {
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.7;
      material.opacity = pulse * 0.6;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer ring - dark slate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.2, 1.8, 32]} />
        <meshStandardMaterial 
          color="#1e293b" 
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Inner glow */}
      <mesh 
        ref={glowRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.03, 0]}
      >
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial 
          color="#a855f7"
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Center pit - depth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <circleGeometry args={[1.0, 32]} />
        <meshStandardMaterial 
          color="#0f172a"
          roughness={1}
        />
      </mesh>

      {/* Pokeball-like ring detail */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.95, 1.05, 32]} />
        <meshBasicMaterial color="#f43f5e" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.45, 0.55, 32]} />
        <meshBasicMaterial color="#f43f5e" />
      </mesh>

      {/* Center button */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.1, 32]} />
        <meshStandardMaterial 
          color="#ffffff"
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.05, 32]} />
        <meshStandardMaterial 
          color="#f43f5e"
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>

      {/* Click area */}
      <mesh 
        position={[0, 0.15, 0]}
        onClick={onClick}
        visible={false}
      >
        <cylinderGeometry args={[1.5, 1.5, 0.3, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Agent count label */}
      <Html
        position={[0, 0.5, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '2px solid #a855f7',
            borderRadius: '20px',
            padding: '6px 14px',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: '#a855f7', fontFamily: 'VT323', fontSize: '14px' }}>
            {agentCount} AGENTS
          </span>
        </div>
      </Html>

      {/* Hover instruction */}
      <Html
        position={[0, -0.8, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            fontFamily: 'VT323',
            fontSize: '12px',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          Click to spawn
        </div>
      </Html>
    </group>
  );
}

// Ground with vibrant grass
function Ground() {
  return (
    <group>
      {/* Main circular platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[12, 64]} />
        <meshStandardMaterial 
          color="#22c55e"
          roughness={0.9}
        />
      </mesh>

      {/* Grass texture rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[0, 8, 64]} />
        <meshStandardMaterial 
          color="#16a34a"
          roughness={0.85}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <ringGeometry args={[0, 5, 64]} />
        <meshStandardMaterial 
          color="#4ade80"
          roughness={0.8}
        />
      </mesh>

      {/* Outer edge of platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <ringGeometry args={[11.5, 12, 64]} />
        <meshStandardMaterial 
          color="#166534"
          roughness={0.9}
        />
      </mesh>

      {/* Underneath (dark) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <circleGeometry args={[15, 64]} />
        <meshStandardMaterial 
          color="#0f172a"
          roughness={1}
        />
      </mesh>
    </group>
  );
}

// Decorative floating particles
function Particles() {
  const count = 20;
  const positions = useMemo(() => {
    const pos = [];
    for (let i = 0; i < count; i++) {
      pos.push({
        x: (Math.random() - 0.5) * 20,
        y: Math.random() * 3 + 0.5,
        z: (Math.random() - 0.5) * 20,
        speed: Math.random() * 0.5 + 0.2,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return pos;
  }, []);

  return (
    <>
      {positions.map((p, i) => (
        <FloatingParticle key={i} {...p} />
      ))}
    </>
  );
}

function FloatingParticle({ x, y, z, speed, offset }: { x: number; y: number; z: number; speed: number; offset: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = y + Math.sin(state.clock.elapsedTime * speed + offset) * 0.3;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef} position={[x, y, z]}>
      <octahedronGeometry args={[0.08, 0]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
    </mesh>
  );
}

interface SceneProps {
  onAgentClick?: (agentId: string) => void;
  onAgentDelete?: (agentId: string) => void;
  onSpawnClick?: () => void;
}

function Scene({ onAgentClick, onAgentDelete, onSpawnClick }: SceneProps) {
  const agents = usePokecenterStore((s) => s.agents);

  // Generate positions for agents
  const agentPositions = useMemo(() => {
    return agents.map((agent: PCAgent) => {
      // Use consistent hash based on agent ID for stable positions
      const hash = agent.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const angle = (hash % 360) * (Math.PI / 180);
      const radius = 2 + (hash % 5) * 0.8;
      return [
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius,
      ] as [number, number, number];
    });
  }, [agents.length]);

  // Map status to allowed values
  const getStatus = (agentStatus: string): 'running' | 'idle' | 'error' => {
    if (agentStatus === 'running') return 'running';
    if (agentStatus === 'error') return 'error';
    return 'idle';
  };

  return (
<>
      {/* Vibrant sky lighting */}
      <ambientLight intensity={0.7} color="#e0f2fe" />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        color="#fffbeb"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* Ground */}
      <Ground />

      {/* Particles */}
      <Particles />

      {/* Central Spawn Pit */}
      <SpawnPit onClick={onSpawnClick} agentCount={agents.length} />

      {/* Agent Sprites */}
      {agents.map((agent: PCAgent, i: number) => (
        <SpriteActor
          key={agent.id}
          pokemonId={RESIDENT_POKEMON_IDS[i % RESIDENT_POKEMON_IDS.length]}
          position={agentPositions[i] || [0, 0, 0]}
          name={agent.name}
          status={getStatus(agent.status || 'idle')}
          scale={1.3}
          animated={true}
          onClick={() => onAgentClick?.(agent.id)}
          onDelete={() => onAgentDelete?.(agent.id)}
        />
      ))}
    </>
  );
}

interface LoadingFallbackProps {
  message?: string;
}

function LoadingFallback({ message = 'Loading Plaza...' }: LoadingFallbackProps) {
  return (
    <Html center>
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          padding: '24px 40px',
          borderRadius: '16px',
          border: '2px solid #a855f7',
          fontFamily: 'Dogica, sans-serif',
          color: '#fff',
          fontSize: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(168, 85, 247, 0.3)',
        }}
      >
        <div style={{ fontSize: '40px' }}>⚡</div>
        <div>{message}</div>
        <div
          style={{
            fontFamily: 'VT323, monospace',
            fontSize: '14px',
            color: '#a855f7',
          }}
        >
          Entering PokéCity...
        </div>
      </div>
    </Html>
  );
}

interface DashboardSceneProps {
  onAgentClick?: (agentId: string) => void;
  onAgentDelete?: (agentId: string) => void;
  onSpawnClick?: () => void;
}

export function DashboardScene({ 
  onAgentClick, 
  onAgentDelete,
  onSpawnClick,
}: DashboardSceneProps) {
  const agents = usePokecenterStore((s) => s.agents);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* 3D Canvas - full screen, no UI */}
      <Canvas
        shadows
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{ 
          background: 'linear-gradient(180deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
        }}
      >
        {/* Isometric orthographic camera */}
        <OrthographicCamera
          makeDefault
          position={[15, 15, 15]}
          zoom={45}
          near={0.1}
          far={1000}
        />
        
        {/* Controls - pan and zoom, no rotation */}
        <MapControls
          enableRotate={false}
          enableZoom={true}
          enablePan={true}
          minZoom={25}
          maxZoom={100}
          panSpeed={0.8}
          screenSpacePanning={true}
          dampingFactor={0.1}
        />

        <Suspense fallback={<LoadingFallback />}>
          <Scene 
            onAgentClick={onAgentClick}
            onAgentDelete={onAgentDelete}
            onSpawnClick={onSpawnClick}
          />
        </Suspense>
        
        <Preload all />
      </Canvas>

      {/* Minimal HUD - just agent count in corner */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '2px solid #a855f7',
            borderRadius: '12px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ fontSize: '20px' }}>🤖</span>
          <div>
            <div
              style={{
                fontFamily: 'VT323',
                fontSize: '10px',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Active Agents
            </div>
            <div
              style={{
                fontFamily: 'Dogica',
                fontSize: '18px',
                color: '#fff',
              }}
            >
              {agents.length}
            </div>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.7)',
          padding: '8px 16px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'VT323',
            fontSize: '13px',
            color: '#64748b',
          }}
        >
          🖱️ Scroll to zoom • Drag to pan • Click agents for details
        </span>
      </div>
    </div>
  );
}
