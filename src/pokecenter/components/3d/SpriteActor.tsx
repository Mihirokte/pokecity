import { useRef, useState, useEffect, useMemo } from 'react';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Group } from 'three';

interface SpriteActorProps {
  pokemonId: number;
  position: [number, number, number];
  name?: string;
  status?: 'running' | 'idle' | 'error';
  onClick?: () => void;
  onDelete?: () => void;
  scale?: number;
  animated?: boolean;
}

// Direct sprite URLs - use GitHub raw for reliability
function getSpriteUrl(pokemonId: number, animated: boolean): string {
  if (animated) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemonId}.gif`;
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

export function SpriteActor({
  pokemonId,
  position,
  name,
  status = 'idle',
  onClick,
  onDelete,
  scale = 1,
  animated = true,
}: SpriteActorProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loading, setLoading] = useState(true);
  
  const spriteUrlValue = useMemo(
    () => getSpriteUrl(pokemonId, animated),
    [pokemonId, animated]
  );

  // Load texture with more robust loading
  useEffect(() => {
    setLoading(true);
    const loader = new THREE.TextureLoader();
    
    loader.load(
      spriteUrlValue,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        setTexture(tex);
        setLoading(false);
      },
      undefined,
      (err) => {
        console.warn('Failed to load sprite:', spriteUrlValue, err);
        setLoading(false);
      }
    );
  }, [spriteUrlValue]);

  const handlePointerOver = () => {
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const handleClick = () => {
    onClick?.();
  };

  const handleDeleteClick = () => {
    onDelete?.();
  };

  // Scale
  const currentScale = scale * (hovered ? 1.15 : 1);
  
  // Sprite world size
  const spriteWidth = 2;
  const spriteHeight = 2;

  // Status color
  const statusColors = {
    running: '#10b981',
    idle: '#f59e0b',
    error: '#ef4444',
  };

  return (
    <group
      ref={groupRef}
      position={position}
    >
      {/* Shadow beneath sprite */}
      <mesh 
        position={[0, 0.01, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.6, 32]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Billboard sprite - always faces camera */}
      <Billboard
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
        scale={currentScale}
        position={[0, spriteHeight / 2, 0]}
      >
        <mesh 
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <planeGeometry args={[spriteWidth, spriteHeight]} />
          {loading ? (
            <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
          ) : texture ? (
            <meshBasicMaterial
              map={texture}
              transparent={true}
              alphaTest={0.1}
              side={THREE.FrontSide}
              depthWrite={true}
            />
          ) : (
            <meshBasicMaterial color="#ff6b6b" transparent opacity={0.5} />
          )}
        </mesh>
      </Billboard>

      {/* Status indicator dot */}
      <mesh position={[0.5, 0.15, 0.1]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color={statusColors[status]} />
      </mesh>

      {/* Hover tooltip */}
      {hovered && (
        <Html
          position={[0, spriteHeight * currentScale + 0.5, 0]}
          center
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: `2px solid ${statusColors[status]}`,
              borderRadius: '12px',
              padding: '12px 16px',
              minWidth: '160px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              style={{
                fontFamily: 'Dogica, sans-serif',
                fontSize: '14px',
                color: '#fff',
                marginBottom: '8px',
                textAlign: 'center',
              }}
            >
              {name || `Pokemon #${pokemonId}`}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[status], display: 'inline-block' }} />
              <span style={{ fontFamily: 'VT323, monospace', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {status}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
              <button
                onClick={handleClick}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: '#fff',
                  fontFamily: 'Dogica, sans-serif',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                View
              </button>
              <button
                onClick={handleDeleteClick}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: '#fff',
                  fontFamily: 'Dogica, sans-serif',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
