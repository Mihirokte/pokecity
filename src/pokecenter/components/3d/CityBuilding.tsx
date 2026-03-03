import { useRef, useState, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Mesh } from 'three';

interface CityBuildingProps {
  position: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  color: string;
  label: string;
  value: number | string;
  icon: string;
  onClick?: () => void;
}

export function CityBuilding({
  position,
  width = 1.5,
  height = 2,
  depth = 1.5,
  color,
  label,
  value,
  icon,
  onClick,
}: CityBuildingProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Create building geometry
  const geometry = useMemo(() => {
    return new THREE.BoxGeometry(width, height, depth);
  }, [width, height, depth]);

  // Create materials for different faces
  const materials = useMemo(() => {
    const frontMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.8,
      metalness: 0.1,
    });
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.8).getHexString(),
      roughness: 0.8,
      metalness: 0.1,
    });
    const topMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(1.2).getHexString(),
      roughness: 0.6,
      metalness: 0.1,
    });

    return [
      sideMaterial, // right
      sideMaterial, // left
      topMaterial,  // top
      new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.9 }), // bottom
      frontMaterial, // front
      frontMaterial, // back
    ];
  }, [color]);

  const handlePointerOver = () => {
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  // Calculate scale for hover effect
  const scale = hovered ? 1.05 : 1;

  return (
    <group position={position}>
      {/* Main building mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={materials}
        position={[0, height / 2, 0]}
        scale={[scale, scale, scale]}
        onClick={onClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      />

      {/* Building base/foundation */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[width + 0.2, 0.1, depth + 0.2]} />
        <meshStandardMaterial color="#2d2d44" roughness={0.9} />
      </mesh>

      {/* Roof detail */}
      <mesh position={[0, height + 0.1, 0]}>
        <boxGeometry args={[width * 0.6, 0.15, depth * 0.6]} />
        <meshStandardMaterial color="#3d3d5c" roughness={0.7} />
      </mesh>

      {/* Icon display on front */}
      <Html
        position={[0, height * 0.6, depth / 2 + 0.01]}
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            fontSize: '28px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          }}
        >
          {icon}
        </div>
      </Html>

      {/* Hover tooltip */}
      {hovered && (
        <Html
          position={[0, height + 0.8, 0]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(26, 26, 46, 0.95)',
              border: `2px solid ${color}`,
              borderRadius: '8px',
              padding: '12px 16px',
              textAlign: 'center',
              minWidth: '120px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                fontFamily: 'Dogica, sans-serif',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#fff',
                marginBottom: '4px',
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontFamily: 'VT323, monospace',
                fontSize: '14px',
                color: '#aaa',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {label}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Pre-defined building types matching dashboard stats
export const BUILDING_COLORS = {
  agents: '#818cf8',    // Purple - agents running
  tasks: '#10b981',     // Green - active tasks
  calendar: '#f59e0b', // Amber - events today
  notes: '#3b82f6',    // Blue - notes
  notifications: '#ef4444', // Red - unread
} as const;

export type BuildingType = keyof typeof BUILDING_COLORS;
