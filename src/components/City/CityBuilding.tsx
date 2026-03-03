import type { House, Resident } from '../../types';
import { HOUSE_TYPES } from '../../config/houseTypes';
import { spriteArtworkUrl } from '../../config/pokemon';

interface CityBuildingProps {
  house: House;
  resident: Resident;
  isEntering: boolean;
  onClick: () => void;
}

const WINDOWS: Record<string, { top: string; left: string; width: string; height: string; lit?: boolean }[]> = {
  tasks: [
    { top: '42px', left: '18px', width: '14px', height: '14px', lit: true },
    { top: '42px', left: '72px', width: '14px', height: '14px', lit: true },
    { top: '62px', left: '18px', width: '14px', height: '10px' },
    { top: '62px', left: '72px', width: '14px', height: '10px' },
  ],
  calendar: [
    { top: '48px', left: '14px', width: '12px', height: '18px', lit: true },
    { top: '48px', left: '45px', width: '12px', height: '18px' },
    { top: '48px', left: '76px', width: '12px', height: '18px', lit: true },
  ],
  notes: [
    { top: '40px', left: '12px', width: '22px', height: '24px', lit: true },
    { top: '40px', left: '72px', width: '22px', height: '24px', lit: true },
    { top: '72px', left: '12px', width: '22px', height: '14px' },
    { top: '72px', left: '72px', width: '22px', height: '14px' },
  ],
  travel: [
    { top: '44px', left: '14px', width: '30px', height: '20px', lit: true },
    { top: '44px', left: '62px', width: '30px', height: '20px', lit: true },
    { top: '70px', left: '14px', width: '12px', height: '10px' },
    { top: '70px', left: '84px', width: '12px', height: '10px' },
  ],
  gym: [
    { top: '46px', left: '12px', width: '16px', height: '22px', lit: true },
    { top: '46px', left: '78px', width: '16px', height: '22px', lit: true },
  ],
  shopping: [
    { top: '42px', left: '14px', width: '28px', height: '20px', lit: true },
    { top: '42px', left: '64px', width: '28px', height: '20px', lit: true },
    { top: '68px', left: '14px', width: '12px', height: '12px' },
    { top: '68px', left: '50px', width: '12px', height: '12px' },
    { top: '68px', left: '80px', width: '12px', height: '12px' },
  ],
};

export function CityBuilding({ house, resident, isEntering, onClick }: CityBuildingProps) {
  const ht = HOUSE_TYPES[house.type];
  const windows = WINDOWS[house.type] ?? [];
  const spriteId = resident.emoji;

  return (
    <div
      className={`city-lot city-lot--${house.type}${isEntering ? ' city-lot--entering' : ''}`}
      style={{ '--lot-accent': ht.color } as React.CSSProperties}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Enter ${resident.name}'s ${ht.label} building`}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
    >
      {/* Tooltip */}
      <div className="building-tooltip">{ht.label}</div>

      {/* Building structure */}
      <div className={`building-wrap building-wrap--${house.type}`}>
        {house.type === 'shopping' && <div className="building-awning" />}
        <div className="building-roof" />
        <div className="building-body" />
        <div className="building-door" />
        {windows.map((w, i) => (
          <div
            key={i}
            className={`building-win${w.lit ? ' building-win--lit' : ''}`}
            style={{ top: w.top, left: w.left, width: w.width, height: w.height }}
          />
        ))}
      </div>

      {/* Resident sprite */}
      <div className="building-sprite-wrap">
        <img
          src={spriteArtworkUrl(spriteId)}
          alt={resident.name}
          className="building-sprite"
          loading="lazy"
        />
      </div>

      {/* Label */}
      <div className="building-label">{resident.name}</div>
      <div className="building-type-badge">{ht.label}</div>
    </div>
  );
}
