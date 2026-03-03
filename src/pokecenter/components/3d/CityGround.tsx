import { useMemo } from 'react';
import * as THREE from 'three';

interface CityGroundProps {
  size?: number;
}

export function CityGround({ size = 50 }: CityGroundProps) {
  // Create a grid texture programmatically
  const gridTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Fill with grass green
      ctx.fillStyle = '#1a472a';
      ctx.fillRect(0, 0, 512, 512);
      
      // Add grass texture variation
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const shade = Math.random() > 0.5 ? '#1e5631' : '#2d5a3d';
        ctx.fillStyle = shade;
        ctx.fillRect(x, y, 2, 2);
      }
      
      // Draw grid lines
      ctx.strokeStyle = '#3d7a4a';
      ctx.lineWidth = 2;
      
      const gridSize = 32; // 16 tiles across
      for (let i = 0; i <= 512; i += gridSize) {
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
        
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(size / 16, size / 16);
    texture.colorSpace = THREE.SRGBColorSpace;
    
    return texture;
  }, [size]);

  return (
    <group>
      {/* Main grass ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          map={gridTexture}
          roughness={0.9}
          metalness={0}
        />
      </mesh>
      
      {/* Underground base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#0d1f12" roughness={1} />
      </mesh>

      {/* Plaza area - lighter colored center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial
          color="#2a5a3a"
          roughness={0.85}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Plaza border/edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[5.8, 6.2, 4]} />
        <meshStandardMaterial
          color="#4a7a5a"
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}

// Decorative elements for the ground
interface PathProps {
  start: [number, number, number];
  end: [number, number, number];
  width?: number;
}

export function Path({ start, end, width = 0.5 }: PathProps) {
  const points = useMemo(() => {
    return [
      new THREE.Vector3(...start),
      new THREE.Vector3(...end),
    ];
  }, [start, end]);

  const geometry = useMemo(() => {
    const curve = new THREE.LineCurve3(points[0], points[1]);
    return new THREE.TubeGeometry(curve, 1, width / 2, 4, false);
  }, [points, width]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
      <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
    </mesh>
  );
}

// Decorative tree
interface TreeProps {
  position: [number, number, number];
}

export function Tree({ position }: TreeProps) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 0.8, 8]} />
        <meshStandardMaterial color="#5a3a2a" roughness={0.9} />
      </mesh>
      
      {/* Foliage */}
      <mesh position={[0, 1, 0]} castShadow>
        <coneGeometry args={[0.6, 1.2, 8]} />
        <meshStandardMaterial color="#2a5a2a" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Lamp post for decoration
interface LampPostProps {
  position: [number, number, number];
}

export function LampPost({ position }: LampPostProps) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 1.6, 8]} />
        <meshStandardMaterial color="#3a3a4a" roughness={0.6} metalness={0.4} />
      </mesh>
      
      {/* Lamp head */}
      <mesh position={[0, 1.7, 0]} castShadow>
        <boxGeometry args={[0.2, 0.15, 0.2]} />
        <meshStandardMaterial color="#4a4a5a" roughness={0.5} metalness={0.5} />
      </mesh>
      
      {/* Light glow */}
      <pointLight
        position={[0, 1.6, 0]}
        color="#fffae6"
        intensity={0.5}
        distance={5}
        decay={2}
      />
    </group>
  );
}
