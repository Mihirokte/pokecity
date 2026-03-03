import { useRef, useState, useMemo, useEffect } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Group, Texture } from 'three';
import { spriteAnimatedUrl, spriteUrl } from '../../../config/pokemon';

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

// Sprite dimensions from PokeAPI - normalized
const SPRITE_WIDTH = 96;
const SPRITE_HEIGHT = 96;

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
  const [texture, setTexture] = useState<Texture | null>(null);
  const [imageError, setImageError] = useState(false);

  const spriteUrlValue = useMemo(
    () => {
      if (animated && !imageError) {
        return spriteAnimatedUrl(pokemonId);
      }
      return spriteUrl(pokemonId);
    },
    [pokemonId, animated, imageError]
  );

  // Load texture on mount
  useEffect(() => {
    setImageError(false);
    const loader = new THREE.TextureLoader();
    loader.load(
      spriteUrlValue,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.minFilter = THREE.NearestFilter;
        loadedTexture.magFilter = THREE.NearestFilter;
        loadedTexture.generateMipmaps = false;
        setTexture(loadedTexture);
      },
      undefined,
      () => {
        setImageError(true);
      }
    );
  }, [spriteUrlValue, pokemonId]);

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

  // Calculate scale to normalize sprite to world units
  // Sprites should be about 1.5 units tall in world space
  const worldHeight = 1.5;
  const worldWidth = worldHeight * (SPRITE_WIDTH / SPRITE_HEIGHT);
  
  // Current scale factor
  const currentScale = scale * (hovered ? 1.15 : 1);

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
      {/* Shadow beneath sprite - larger and softer */}
      <mesh 
        position={[0, 0.01, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[currentScale, currentScale, 1]}
      >
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* Billboard sprite - pivot at bottom center so feet touch ground */}
      <group 
        position={[0, worldHeight * currentScale / 2, 0]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <mesh scale={[worldWidth * currentScale, worldHeight * currentScale, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={texture}
            transparent={true}
            alphaTest={0.1}
            side={THREE.FrontSide}
            depthWrite={true}
          />
        </mesh>
      </group>

      {/* Status indicator dot */}
      <mesh 
        position={[0.4, 0.1, 0.1]}
        scale={0.12}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={statusColors[status]} />
      </mesh>

      {/* Hover tooltip with details and delete */}
      {hovered && (
        <Html
          position={[0, worldHeight * scale + 0.4, 0]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
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
            {/* Agent name */}
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
            
            {/* Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginBottom: '10px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: statusColors[status],
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontFamily: 'VT323, monospace',
                  fontSize: '12px',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {status}
              </span>
            </div>

            {/* Action buttons */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                pointerEvents: 'auto',
              }}
            >
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
                  transition: 'transform 0.1s',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
                  transition: 'transform 0.1s',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
