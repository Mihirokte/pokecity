import { useMemo } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { useAuthStore } from '../../stores/authStore';
import { POKEMON_TYPES, CATAN_LAYOUT, getAnimatedSpriteUrl } from '../../config/pokemonTypes';
import type { Resident, House } from '../../types';

// Hex tile size
const HEX_WIDTH = 120;
const HEX_HEIGHT = 138;
const HEX_HORIZONTAL_SPACING = HEX_WIDTH * 0.75;
const HEX_VERTICAL_SPACING = HEX_HEIGHT * 0.5;

// Convert axial coordinates to pixel position
function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_HORIZONTAL_SPACING * q;
  const y = HEX_VERTICAL_SPACING * (r + q / 2);
  return { x, y };
}

// Interface for a tile on the Catan board
interface CatanTile {
  q: number;
  r: number;
  type: string;
  x: number;
  y: number;
}

// Interface for a settlement (agent on a tile)
interface CatanSettlement {
  resident: Resident;
  house: House;
  tile: CatanTile;
  spriteUrl: string;
}

// Interface for a road segment
interface CatanRoad {
  from: CatanTile;
  to: CatanTile;
  x: number;
  y: number;
  length: number;
  angle: number;
}

interface CatanLandingProps {
  onEnterCity: () => void;
}

export function CatanLanding({ onEnterCity }: CatanLandingProps) {
  const residents = useCityStore(s => s.residents);
  const houses = useCityStore(s => s.houses);
  const cityName = useCityStore(s => s.cityName);
  const user = useAuthStore(s => s.user);

  // Build the Catan board tiles
  const tiles = useMemo<CatanTile[]>(() => {
    const allTiles: CatanTile[] = [];
    
    // Center tile
    const center = axialToPixel(CATAN_LAYOUT.center.q, CATAN_LAYOUT.center.r);
    allTiles.push({
      q: CATAN_LAYOUT.center.q,
      r: CATAN_LAYOUT.center.r,
      type: CATAN_LAYOUT.center.type,
      x: center.x,
      y: center.y,
    });
    
    // Inner ring
    CATAN_LAYOUT.inner.forEach(tile => {
      const pos = axialToPixel(tile.q, tile.r);
      allTiles.push({
        q: tile.q,
        r: tile.r,
        type: tile.type,
        x: pos.x,
        y: pos.y,
      });
    });
    
    // Outer ring
    CATAN_LAYOUT.outer.forEach(tile => {
      const pos = axialToPixel(tile.q, tile.r);
      allTiles.push({
        q: tile.q,
        r: tile.r,
        type: tile.type,
        x: pos.x,
        y: pos.y,
      });
    });
    
    return allTiles;
  }, []);

  // Map agents to settlements based on their house type
  const settlements = useMemo<CatanSettlement[]>(() => {
    return residents.map(resident => {
      const house = houses.find(h => h.id === resident.houseId);
      if (!house) return null;
      
      // Find the tile that matches the house type
      const tile = tiles.find(t => t.type === house.type);
      if (!tile) return null;
      
      // Get the representative Pokemon sprite for this type
      const typeConfig = POKEMON_TYPES[house.type];
      const spriteUrl = getAnimatedSpriteUrl(typeConfig?.representative || 'pikachu');
      
      return {
        resident,
        house,
        tile,
        spriteUrl,
      };
    }).filter((s): s is CatanSettlement => s !== null);
  }, [residents, houses, tiles]);

  // Generate roads based on creation date
  const roads = useMemo<CatanRoad[]>(() => {
    if (settlements.length < 2) return [];
    
    // Sort settlements by creation date
    const sorted = [...settlements].sort((a, b) => 
      new Date(a.resident.createdAt).getTime() - new Date(b.resident.createdAt).getTime()
    );
    
    const roadSegments: CatanRoad[] = [];
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i].tile;
      const to = sorted[i + 1].tile;
      
      // Calculate road properties
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      // Position road at midpoint between tiles
      const x = (from.x + to.x) / 2;
      const y = (from.y + to.y) / 2;
      
      roadSegments.push({
        from,
        to,
        x,
        y,
        length,
        angle,
      });
    }
    
    return roadSegments;
  }, [settlements]);

  // Calculate board dimensions for centering
  const boardBounds = useMemo(() => {
    if (tiles.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    
    const xs = tiles.map(t => t.x);
    const ys = tiles.map(t => t.y);
    
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [tiles]);

  const boardWidth = boardBounds.maxX - boardBounds.minX + HEX_WIDTH;
  const boardHeight = boardBounds.maxY - boardBounds.minY + HEX_HEIGHT;

  // Get color for a tile type
  const getTileColor = (type: string) => {
    if (type === 'logo') {
      return { color: '#FFD700', colorDark: '#B8860B' };
    }
    const typeConfig = POKEMON_TYPES[type];
    return typeConfig 
      ? { color: typeConfig.color, colorDark: typeConfig.colorDark }
      : { color: '#888888', colorDark: '#666666' };
  };

  return (
    <div className="catan-scene">
      {/* Starfield Background */}
      <div className="catan-starfield" />
      
      {/* Header */}
      <header className="catan-landing-header">
        <div>
          <div className="catan-landing-header__title">{cityName.toUpperCase()}</div>
          <div className="catan-landing-header__subtitle">PokéCity Catan</div>
        </div>
        <div className="catan-landing-header__actions">
          {user ? (
            <>
              <button className="catan-landing-header__btn catan-landing-header__btn--secondary">
                {user.name}
              </button>
              <button 
                className="catan-landing-header__btn catan-landing-header__btn--primary"
                onClick={onEnterCity}
              >
                ENTER CITY
              </button>
            </>
          ) : (
            <button className="catan-landing-header__btn catan-landing-header__btn--primary">
              SIGN IN
            </button>
          )}
        </div>
      </header>

      {/* 3D Board */}
      <div 
        className="catan-board-container"
        style={{
          width: boardWidth,
          height: boardHeight,
        }}
      >
        <div 
          className="catan-grid"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -boardWidth / 2,
            marginTop: -boardHeight / 2,
          }}
        >
          {/* Render Roads (behind tiles) */}
          {roads.map((road) => (
            <div
              key={`road-${road.from.q}-${road.from.r}-${road.to.q}-${road.to.r}`}
              className="catan-road"
              style={{
                left: road.x,
                top: road.y,
                width: road.length,
                transform: `translate(-50%, -50%) rotate(${road.angle}deg)`,
              }}
            />
          ))}

          {/* Render Hex Tiles */}
          {tiles.map((tile) => {
            const colors = getTileColor(tile.type);
            const isCenter = tile.type === 'logo';
            const typeLabel = isCenter ? '' : POKEMON_TYPES[tile.type]?.name || tile.type;
            
            return (
              <div
                key={`hex-${tile.q}-${tile.r}`}
                className={`catan-hex ${isCenter ? 'catan-hex--center' : ''}`}
                style={{
                  left: tile.x,
                  top: tile.y,
                  transform: 'translate(-50%, -50%)',
                  '--hex-color': colors.color,
                  '--hex-color-dark': colors.colorDark,
                } as React.CSSProperties}
              >
                {/* Glow effect */}
                <div className="catan-hex__glow" />
                
                {/* 3D Surface */}
                <div className="catan-hex__surface" />
                
                {/* 3D Side/Extrusion */}
                <div className="catan-hex__side" />
                
                {/* Border */}
                <div className="catan-hex__border" />
                
                {/* Type Label */}
                {!isCenter && (
                  <div className="catan-hex__label">{typeLabel}</div>
                )}
                
                {/* Settlement (if agent exists for this type) */}
                {settlements
                  .filter(s => s.tile.q === tile.q && s.tile.r === tile.r)
                  .map((settlement) => (
                    <div
                      key={settlement.resident.id}
                      className="catan-settlement"
                      onClick={onEnterCity}
                    >
                      <img
                        src={settlement.spriteUrl}
                        alt={settlement.resident.name}
                        className="catan-settlement__sprite"
                        onError={(e) => {
                          // Fallback to emoji if sprite fails
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <div className="catan-settlement__base" />
                      <div className="catan-settlement__name">
                        {settlement.resident.name}
                      </div>
                    </div>
                  ))
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Stats */}
      <footer className="catan-landing-footer">
        <div className="catan-landing-footer__stat">
          <span>🏰</span>
          <span>settlements:</span>
          <span className="catan-landing-footer__stat-value">{settlements.length}</span>
        </div>
        <div className="catan-landing-footer__stat">
          <span>🗺️</span>
          <span>tiles:</span>
          <span className="catan-landing-footer__stat-value">{tiles.length}</span>
        </div>
        <div className="catan-landing-footer__stat">
          <span>🛤️</span>
          <span>roads:</span>
          <span className="catan-landing-footer__stat-value">{roads.length}</span>
        </div>
      </footer>
    </div>
  );
}
