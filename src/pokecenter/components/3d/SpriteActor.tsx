import { useRef, useState, useMemo, useEffect } from 'react';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Group, Texture } from 'three';
import { spriteAnimatedUrl } from '../../../config/pokemon';

interface SpriteActorProps {
  pokemonId: number;
  position: [number, number, number];
  name?: string;
  onClick?: () => void;
  scale?: number;
  animated?: boolean;
}

export function SpriteActor({
  pokemonId,
  position,
  name,
  onClick,
  scale = 1,
  animated = true,
}: SpriteActorProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState<Texture | null>(null);

  const spriteUrlValue = useMemo(
    () => animated ? spriteAnimatedUrl(pokemonId) : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
    [pokemonId, animated]
  );

  // Load texture on mount
  useEffect(() => {
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
        // Fallback: load static sprite on error
        const fallbackUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
        const fallbackLoader = new THREE.TextureLoader();
        fallbackLoader.load(
          fallbackUrl,
          (loadedTexture) => {
            loadedTexture.colorSpace = THREE.SRGBColorSpace;
            loadedTexture.minFilter = THREE.NearestFilter;
            loadedTexture.magFilter = THREE.NearestFilter;
            loadedTexture.generateMipmaps = false;
            setTexture(loadedTexture);
          }
        );
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

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={onClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Billboard sprite that always faces camera */}
      <Billboard
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
        scale={scale * (hovered ? 1.1 : 1)}
      >
        <mesh>
          <planeGeometry args={[1.5, 1.5]} />
          <meshBasicMaterial
            map={texture}
            transparent={true}
            alphaTest={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>

      {/* Shadow beneath sprite */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Name label on hover */}
      {name && hovered && (
        <Html
          position={[0, 1.2, 0]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontFamily: 'Dogica, sans-serif',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              border: '2px solid #818cf8',
            }}
          >
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}
