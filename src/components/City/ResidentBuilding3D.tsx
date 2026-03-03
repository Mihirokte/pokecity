import { useRef, useState, useEffect } from 'react';
import { Billboard, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOUSE_TYPES } from '../../config/houseTypes';
import { MODULE_POKEMON } from '../../config/pokemon';
import type { House, Resident } from '../../types';

// ─── Pokemon Billboard sprite ─────────────────────────────────────────────────
interface PokemonSpriteProps {
  pokemonId: number;
  color: string;
  name: string;
  role: string;
  onSelect: () => void;
}

function PokemonSprite({ pokemonId, color, name, role, onSelect }: PokemonSpriteProps) {
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const floatRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const gifUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemonId}.gif`;
    const pngUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

    loader.load(
      gifUrl,
      tex => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        setTexture(tex);
      },
      undefined,
      () => {
        loader.load(pngUrl, tex => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.NearestFilter;
          tex.magFilter = THREE.NearestFilter;
          setTexture(tex);
        });
      },
    );
  }, [pokemonId]);

  useFrame(state => {
    if (floatRef.current) {
      floatRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.18;
    }
  });

  return (
    <group ref={floatRef}>
      {/* Ground shadow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
        <circleGeometry args={[0.45, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>

      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <mesh
          scale={hovered ? 1.12 : 1}
          onClick={e => { e.stopPropagation(); onSelect(); }}
          onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        >
          <planeGeometry args={[1.5, 1.5]} />
          {texture ? (
            <meshBasicMaterial
              map={texture}
              transparent
              alphaTest={0.08}
              side={THREE.FrontSide}
              depthWrite={false}
            />
          ) : (
            <meshBasicMaterial color={color} transparent opacity={0.45} />
          )}
        </mesh>

        {hovered && (
          <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
            <div
              style={{
                background: 'rgba(5,5,20,0.96)',
                border: `2px solid ${color}`,
                padding: '8px 14px',
                textAlign: 'center',
                minWidth: 110,
                boxShadow: `0 0 18px ${color}55`,
                backdropFilter: 'blur(4px)',
              }}
            >
              <div
                style={{
                  fontFamily: 'Dogica, monospace',
                  fontSize: 9,
                  color: '#fff',
                  marginBottom: 3,
                  letterSpacing: '0.05em',
                }}
              >
                {name}
              </div>
              <div
                style={{
                  fontFamily: 'VT323, monospace',
                  fontSize: 14,
                  color,
                  letterSpacing: 1,
                }}
              >
                {role.toUpperCase()}
              </div>
              <div
                style={{
                  fontFamily: 'VT323, monospace',
                  fontSize: 11,
                  color: '#64748b',
                  marginTop: 3,
                  letterSpacing: '0.08em',
                }}
              >
                ▶ ENTER
              </div>
            </div>
          </Html>
        )}
      </Billboard>
    </group>
  );
}

// ─── Building geometries per module type ─────────────────────────────────────

function CalendarBuilding({ color }: { color: string }) {
  const shade = '#3a70b9';
  const cols: [number, number][] = [[-0.72, -0.72], [0.72, -0.72], [-0.72, 0.72], [0.72, 0.72]];
  return (
    <group>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[2.4, 0.2, 2.4]} />
        <meshStandardMaterial color="#999" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 2.8, 1.9]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.12} emissive={color} emissiveIntensity={0.06} />
      </mesh>
      <mesh position={[0, 3.15, 0]} castShadow>
        <sphereGeometry args={[0.95, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={shade} roughness={0.45} metalness={0.2} />
      </mesh>
      {cols.map(([x, z], i) => (
        <mesh key={i} position={[x, 1.6, z]} castShadow>
          <cylinderGeometry args={[0.1, 0.13, 2.8, 8]} />
          <meshStandardMaterial color="#f0e8d8" roughness={0.85} />
        </mesh>
      ))}
      <pointLight position={[0, 1.5, 1.0]} color={color} intensity={1.0} distance={5} />
    </group>
  );
}

function TasksBuilding({ color }: { color: string }) {
  const shade = '#3a9858';
  const merls: [number, number][] = [
    [-0.9, -0.9], [-0.3, -0.9], [0.3, -0.9], [0.9, -0.9],
    [-0.9, 0.9],  [-0.3, 0.9],  [0.3, 0.9],  [0.9, 0.9],
  ];
  return (
    <group>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[2.8, 0.2, 2.8]} />
        <meshStandardMaterial color="#555" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 2.5, 2.4]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} emissive={color} emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <boxGeometry args={[2.6, 0.2, 2.6]} />
        <meshStandardMaterial color={shade} roughness={0.8} />
      </mesh>
      {merls.map(([x, z], i) => (
        <mesh key={i} position={[x, 3.1, z]} castShadow>
          <boxGeometry args={[0.34, 0.4, 0.34]} />
          <meshStandardMaterial color={shade} roughness={0.8} />
        </mesh>
      ))}
      <pointLight position={[0, 1.5, 1.2]} color={color} intensity={0.9} distance={5} />
    </group>
  );
}

function NotesBuilding({ color }: { color: string }) {
  const shade = '#c58000';
  return (
    <group>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[1.8, 0.2, 1.8]} />
        <meshStandardMaterial color="#aaa" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 4.7, 1.4]} />
        <meshStandardMaterial color={color} roughness={0.62} metalness={0.05} emissive={color} emissiveIntensity={0.07} />
      </mesh>
      <mesh position={[0, 5.15, 0]} castShadow>
        <coneGeometry args={[1.05, 1.35, 8]} />
        <meshStandardMaterial color={shade} roughness={0.68} />
      </mesh>
      <pointLight position={[0, 2.5, 0.75]} color={color} intensity={0.9} distance={6} />
    </group>
  );
}

function TravelBuilding({ color }: { color: string }) {
  const shade = '#0e8a72';
  return (
    <group>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[3.4, 0.2, 2.6]} />
        <meshStandardMaterial color="#666" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 1.3, 2.2]} />
        <meshStandardMaterial color={color} roughness={0.48} metalness={0.22} emissive={color} emissiveIntensity={0.07} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[3.2, 0.15, 2.4]} />
        <meshStandardMaterial color={shade} roughness={0.7} />
      </mesh>
      {/* Control tower */}
      <mesh position={[1.1, 2.35, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 2.8, 12]} />
        <meshStandardMaterial color={shade} roughness={0.6} metalness={0.12} />
      </mesh>
      <mesh position={[1.1, 3.85, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.32, 12]} />
        <meshStandardMaterial color="#0d7a62" roughness={0.5} metalness={0.3} />
      </mesh>
      <pointLight position={[0, 1.0, 1.1]} color={color} intensity={0.85} distance={5} />
      <pointLight position={[1.1, 3.8, 0]} color={color} intensity={0.6} distance={3} />
    </group>
  );
}

function GymBuilding({ color }: { color: string }) {
  const shade = '#b03020';
  const pillars: [number, number][] = [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]];
  return (
    <group>
      <mesh position={[0, 0.125, 0]} receiveShadow>
        <boxGeometry args={[3.2, 0.25, 3.2]} />
        <meshStandardMaterial color="#444" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 2.8, 2.6]} />
        <meshStandardMaterial color={color} roughness={0.78} metalness={0.1} emissive={color} emissiveIntensity={0.06} />
      </mesh>
      <mesh position={[0, 3.15, 0]} castShadow>
        <boxGeometry args={[2.8, 0.22, 2.8]} />
        <meshStandardMaterial color={shade} roughness={0.72} />
      </mesh>
      {pillars.map(([x, z], i) => (
        <mesh key={i} position={[x, 1.8, z]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 3.2, 10]} />
          <meshStandardMaterial color={shade} roughness={0.72} />
        </mesh>
      ))}
      <pointLight position={[0, 1.5, 1.3]} color={color} intensity={1.1} distance={6} />
    </group>
  );
}

function ShoppingBuilding({ color }: { color: string }) {
  const shade = '#c85000';
  return (
    <group>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[2.8, 0.2, 2.6]} />
        <meshStandardMaterial color="#aaa" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.3, 1.8, 2.1]} />
        <meshStandardMaterial color={color} roughness={0.68} metalness={0.06} emissive={color} emissiveIntensity={0.06} />
      </mesh>
      {/* Overhanging awning */}
      <mesh position={[0, 2.08, 0]} castShadow>
        <boxGeometry args={[2.95, 0.13, 2.75]} />
        <meshStandardMaterial color={shade} roughness={0.6} />
      </mesh>
      {/* Sign above door */}
      <mesh position={[0, 2.36, 1.08]} castShadow>
        <boxGeometry args={[1.3, 0.26, 0.12]} />
        <meshStandardMaterial color="#8a3000" roughness={0.7} />
      </mesh>
      <pointLight position={[0, 1.2, 1.05]} color={color} intensity={0.9} distance={5} />
    </group>
  );
}

const BUILDING_SHAPES: Record<string, React.FC<{ color: string }>> = {
  calendar: CalendarBuilding,
  tasks:    TasksBuilding,
  notes:    NotesBuilding,
  travel:   TravelBuilding,
  gym:      GymBuilding,
  shopping: ShoppingBuilding,
};

const BUILDING_HEIGHTS: Record<string, number> = {
  calendar: 3.6,
  tasks:    3.1,
  notes:    5.5,
  travel:   3.7,
  gym:      3.2,
  shopping: 2.2,
};

// ─── Main ResidentBuilding3D export ──────────────────────────────────────────

interface ResidentBuilding3DProps {
  house: House;
  resident: Resident;
  position: [number, number, number];
  onSelect: () => void;
}

export function ResidentBuilding3D({ house, resident, position, onSelect }: ResidentBuilding3DProps) {
  const ht = HOUSE_TYPES[house.type];
  const BuildingShape = BUILDING_SHAPES[house.type] ?? TasksBuilding;
  const pokemonId = MODULE_POKEMON[house.type] ?? 25;
  const bh = BUILDING_HEIGHTS[house.type] ?? 3;

  return (
    <group position={position}>
      <BuildingShape color={ht.color} />

      {/* Pokemon sprite floating above building */}
      <group position={[0, bh + 1.0, 0]}>
        <PokemonSprite
          pokemonId={pokemonId}
          color={ht.color}
          name={resident.name}
          role={resident.role}
          onSelect={onSelect}
        />
      </group>

      {/* Invisible hit-box covering whole building for easy click */}
      <mesh
        position={[0, bh / 2, 0]}
        onClick={e => { e.stopPropagation(); onSelect(); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        visible={false}
      >
        <boxGeometry args={[4, bh + 1, 4]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

// ─── Empty lot marker ────────────────────────────────────────────────────────

function PulsingRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(state => {
    if (ref.current) {
      (ref.current.material as THREE.MeshBasicMaterial).opacity =
        0.28 + Math.sin(state.clock.elapsedTime * 2.2) * 0.22;
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <ringGeometry args={[1.3, 1.9, 36]} />
      <meshBasicMaterial color="#FFD700" transparent opacity={0.4} />
    </mesh>
  );
}

interface EmptyLotMarker3DProps {
  position: [number, number, number];
  onAddClick: () => void;
}

export function EmptyLotMarker3D({ position, onAddClick }: EmptyLotMarker3DProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={position}>
      <PulsingRing />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[1.6, 36]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={hovered ? 0.14 : 0.05} />
      </mesh>

      {/* Click cylinder */}
      <mesh
        position={[0, 1, 0]}
        onClick={e => { e.stopPropagation(); onAddClick(); }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        visible={false}
      >
        <cylinderGeometry args={[2, 2, 2, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <Html position={[0, 2, 0]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'Dogica, monospace',
              fontSize: 24,
              color: '#FFD700',
              textShadow: hovered
                ? '0 0 20px #FFD700, 0 0 40px #FFD700'
                : '0 0 10px #FFD700aa',
              lineHeight: 1,
              transition: 'text-shadow 0.2s',
            }}
          >
            +
          </div>
          <div
            style={{
              fontFamily: 'VT323, monospace',
              fontSize: 13,
              color: '#FFD700',
              letterSpacing: 1,
              opacity: hovered ? 1 : 0.7,
              marginTop: 2,
              transition: 'opacity 0.2s',
            }}
          >
            NEW RESIDENT
          </div>
        </div>
      </Html>

      <pointLight
        position={[0, 1, 0]}
        color="#FFD700"
        intensity={hovered ? 2.0 : 0.7}
        distance={5}
      />
    </group>
  );
}
