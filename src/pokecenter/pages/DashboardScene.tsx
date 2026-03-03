import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  MapControls, 
  Html,
  Preload,
  OrthographicCamera,
} from '@react-three/drei';
import { usePokecenterStore } from '../pokecenterStore';
import { useCityStore } from '../../stores/cityStore';
import { SpriteActor } from '../components/3d/SpriteActor';
import { CityBuilding, BUILDING_COLORS } from '../components/3d/CityBuilding';
import { CityGround, Tree, LampPost } from '../components/3d/CityGround';
import { RESIDENT_POKEMON_IDS } from '../../config/pokemon';
import type { PCAgent } from '../../types';

// Pre-generated random positions for agents
const AGENT_POSITIONS: [number, number, number][] = [
  [-2, 0, -1],
  [1, 0, -2],
  [3, 0, 0],
  [0, 0, 2],
  [-3, 0, 1],
  [2, 0, -3],
  [-1, 0, 3],
  [3, 0, 2],
];

type BuildingType = keyof typeof BUILDING_COLORS;

interface SceneProps {
  onAgentClick?: (agentId: string) => void;
  onBuildingClick?: (type: BuildingType) => void;
}

function Scene({ onAgentClick, onBuildingClick }: SceneProps) {
  const agents = usePokecenterStore((s) => s.agents);
  const notifications = usePokecenterStore((s) => s.notifications);
  const cityStore = useCityStore((s) => s.moduleData);

  // Calculate stats from stores
  const runningAgents = agents.filter((a: PCAgent) => a.status === 'running').length;
  const activeTasks = cityStore.tasks.filter((t: { status: string }) => t.status !== 'done').length;
  
  // Today's events
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = cityStore.calendarEvents.filter((e: { startDate: string }) => e.startDate === today);
  
  // Unread notifications
  const unread = notifications.filter((n: { read: string }) => n.read !== 'true').length;

  // Generate agent positions
  const agentPositions = useMemo(() => {
    return agents.map((_agent: PCAgent, i: number) => {
      const position = AGENT_POSITIONS[i % AGENT_POSITIONS.length];
      // Add some randomness
      return [
        position[0] + (Math.random() - 0.5) * 1.5,
        position[1],
        position[2] + (Math.random() - 0.5) * 1.5,
      ] as [number, number, number];
    });
  }, [agents.length]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} color="#ffeedd" />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Ground */}
      <CityGround size={40} />

      {/* Decorative elements */}
      <Tree position={[-8, 0, -8]} />
      <Tree position={[-10, 0, -6]} />
      <Tree position={[8, 0, -8]} />
      <Tree position={[10, 0, -5]} />
      <Tree position={[-8, 0, 8]} />
      <Tree position={[9, 0, 7]} />

      {/* Lamp posts around the plaza */}
      <LampPost position={[-6, 0, -6]} />
      <LampPost position={[6, 0, -6]} />
      <LampPost position={[-6, 0, 6]} />
      <LampPost position={[6, 0, 6]} />

      {/* Stat Buildings - arranged in a semi-circle */}
      <CityBuilding
        position={[-6, 0, -4]}
        width={1.8}
        height={2.5 + (runningAgents * 0.2)}
        depth={1.8}
        color={BUILDING_COLORS.agents}
        label="Agents Running"
        value={runningAgents}
        icon="🤖"
        onClick={() => onBuildingClick?.('agents')}
      />
      
      <CityBuilding
        position={[-3, 0, -5]}
        width={1.8}
        height={2 + (activeTasks * 0.15)}
        depth={1.8}
        color={BUILDING_COLORS.tasks}
        label="Active Tasks"
        value={activeTasks}
        icon="✅"
        onClick={() => onBuildingClick?.('tasks')}
      />
      
      <CityBuilding
        position={[0, 0, -5.5]}
        width={1.8}
        height={1.5 + (todayEvents.length * 0.3)}
        depth={1.8}
        color={BUILDING_COLORS.calendar}
        label="Events Today"
        value={todayEvents.length}
        icon="📅"
        onClick={() => onBuildingClick?.('calendar')}
      />
      
      <CityBuilding
        position={[3, 0, -5]}
        width={1.8}
        height={1.5 + (cityStore.notes.length * 0.1)}
        depth={1.8}
        color={BUILDING_COLORS.notes}
        label="Notes"
        value={cityStore.notes.length}
        icon="📝"
        onClick={() => onBuildingClick?.('notes')}
      />
      
      <CityBuilding
        position={[6, 0, -4]}
        width={1.8}
        height={1.5 + (unread * 0.4)}
        depth={1.8}
        color={BUILDING_COLORS.notifications}
        label="Unread"
        value={unread}
        icon="🔔"
        onClick={() => onBuildingClick?.('notifications')}
      />

      {/* Agent Sprites in the plaza area */}
      {agents.map((agent: PCAgent, i: number) => (
        <SpriteActor
          key={agent.id}
          pokemonId={RESIDENT_POKEMON_IDS[i % RESIDENT_POKEMON_IDS.length]}
          position={agentPositions[i] || [0, 0, 0]}
          name={agent.name}
          scale={1.2}
          animated={true}
          onClick={() => onAgentClick?.(agent.id)}
        />
      ))}

      {/* Bulletin Board for Events/Activity */}
      <group position={[0, 0, 5]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[3, 2.5, 0.2]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
        </mesh>
        {/* Board surface */}
        <mesh position={[0,1.5, 0.11]}>
          <boxGeometry args={[2.6, 2.1, 0.05]} />
          <meshStandardMaterial color="#f5e6d3" roughness={0.8} />
        </mesh>
        {/* Title bar */}
        <mesh position={[0, 2.4, 0.11]}>
          <boxGeometry args={[2.6, 0.3, 0.05]} />
          <meshStandardMaterial color="#818cf8" roughness={0.7} />
        </mesh>
      </group>
    </>
  );
}

interface LoadingFallbackProps {
  message?: string;
}

function LoadingFallback({ message = 'Loading 3D Scene...' }: LoadingFallbackProps) {
  return (
    <Html center>
      <div
        style={{
          background: 'rgba(26, 26, 46, 0.9)',
          padding: '20px 40px',
          borderRadius: '12px',
          border: '2px solid #818cf8',
          fontFamily: 'Dogica, sans-serif',
          color: '#fff',
          fontSize: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '32px' }}>🎮</div>
        <div>{message}</div>
        <div
          style={{
            fontFamily: 'VT323, monospace',
            fontSize: '14px',
            color: '#818cf8',
          }}
        >
          Initializing PokéCity...
        </div>
      </div>
    </Html>
  );
}

interface DashboardSceneProps {
  onAgentClick?: (agentId: string) => void;
  onBuildingClick?: (type: BuildingType) => void;
  onBackClick?: () => void;
}

export function DashboardScene({ 
  onAgentClick, 
  onBuildingClick,
  onBackClick,
}: DashboardSceneProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 3D Canvas */}
      <Canvas
        shadows
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)' }}
      >
        {/* Isometric orthographic camera */}
        <OrthographicCamera
          makeDefault
          position={[20, 20, 20]}
          zoom={35}
          near={0.1}
          far={1000}
        />
        
        {/* Controls - pan only, no rotation to maintain isometric view */}
        <MapControls
          enableRotate={false}
          enableZoom={true}
          enablePan={true}
          minZoom={20}
          maxZoom={80}
          panSpeed={1}
          screenSpacePanning={true}
          dampingFactor={0.1}
        />

        <Suspense fallback={<LoadingFallback />}>
          <Scene 
            onAgentClick={onAgentClick} 
            onBuildingClick={onBuildingClick} 
          />
        </Suspense>
        
        <Preload all />
      </Canvas>

      {/* HUD Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Title */}
        <div
          style={{
            background: 'rgba(26, 26, 46, 0.85)',
            padding: '12px 24px',
            borderRadius: '8px',
            border: '2px solid #818cf8',
            pointerEvents: 'auto',
          }}
        >
          <h1
            style={{
              fontFamily: 'Dogica, sans-serif',
              fontSize: '20px',
              color: '#fff',
              margin: 0,
              letterSpacing: '1px',
            }}
          >
            🏙️ PokéCity Plaza
          </h1>
          <p
            style={{
              fontFamily: 'VT323, monospace',
              fontSize: '14px',
              color: '#818cf8',
              margin: '4px 0 0 0',
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}
          >
            Your Dashboard in 3D
          </p>
        </div>

        {/* Back button */}
        {onBackClick && (
          <button
            onClick={onBackClick}
            style={{
              background: 'rgba(26, 26, 46, 0.85)',
              border: '2px solid #818cf8',
              borderRadius: '8px',
              padding: '12px 20px',
              color: '#fff',
              fontFamily: 'Dogica, sans-serif',
              fontSize: '14px',
              cursor: 'pointer',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#818cf8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(26, 26, 46, 0.85)';
            }}
          >
            ← Back to 2D
          </button>
        )}
      </div>

      {/* Instructions */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(26, 26, 46, 0.85)',
          padding: '8px 16px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'VT323, monospace',
            fontSize: '14px',
            color: '#aaa',
          }}
        >
          🖱️ Scroll to zoom • Drag to pan • Click buildings/agents for details
        </span>
      </div>
    </div>
  );
}
