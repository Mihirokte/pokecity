import { useState } from 'react';
import type { House, Resident } from '../../types';
import { HOUSE_TYPES } from '../../config/houseTypes';
import { spriteArtworkUrl, badgeUrl, MODULE_BADGE_IDS } from '../../config/pokemon';
import { CalendarModule } from '../Modules/CalendarModule';
import { TasksModule } from '../Modules/TasksModule';
import { NotesModule } from '../Modules/NotesModule';
import { TravelModule } from '../Modules/TravelModule';
import { GymModule } from '../Modules/GymModule';
import { ShoppingModule } from '../Modules/ShoppingModule';

const MODULE_MAP: Record<string, React.FC<{ resident: Resident }>> = {
  calendar: CalendarModule,
  tasks: TasksModule,
  notes: NotesModule,
  travel: TravelModule,
  gym: GymModule,
  shopping: ShoppingModule,
};

const DIALOGUES: Record<string, { speaker: string; text: string }> = {
  calendar:
    { speaker: 'CELEBI', text: 'Time flows like a river... but I can help you tame it! Let\'s organize your schedule!' },
  tasks:
    { speaker: 'MACHAMP', text: 'MACHAMP flexes! Four arms, zero excuses. Let\'s get these tasks DONE!' },
  notes:
    { speaker: 'SMEARGLE', text: 'SMEARGLE waves a paintbrush! Every thought is art. Write it all down!' },
  travel:
    { speaker: 'PIDGEOT', text: 'PIDGEOT spreads its great wings! The horizon always calls. Where to next?' },
  gym:
    { speaker: 'PRIMEAPE', text: 'PRIMEAPE pounds the floor! No pain, no gain! Let\'s track those gains!' },
  shopping:
    { speaker: 'MEOWTH', text: 'Meowth\'s eyes glitter! Pay Day~! Let\'s make sure we count every coin!' },
};

interface CityPanelProps {
  resident: Resident;
  house: House;
  onClose: () => void;
}

export function CityPanel({ resident, house, onClose }: CityPanelProps) {
  const [dialogueDismissed, setDialogueDismissed] = useState(false);
  const ht = HOUSE_TYPES[house.type];
  const ModuleComponent = MODULE_MAP[house.type];
  const dialogue = DIALOGUES[house.type];

  return (
    <div className="city-panel">
      {/* Type color accent bar */}
      <div className="city-panel__accent" style={{ background: ht.color }} />

      {/* Header */}
      <div className="city-panel__header">
        <button className="city-panel__back" onClick={onClose}>
          ← BACK
        </button>
        <img
          src={spriteArtworkUrl(resident.emoji)}
          alt={resident.name}
          className="city-panel__sprite"
        />
        <div className="city-panel__identity">
          <div className="city-panel__name">{resident.name}</div>
          <div className="city-panel__role" style={{ color: ht.color }}>{resident.role}</div>
        </div>
        <div
          className="city-panel__type-badge"
          style={{
            fontFamily: 'Dogica, monospace',
            fontSize: 8,
            color: ht.color,
            letterSpacing: '0.06em',
            padding: '4px 8px',
            border: `1px solid ${ht.color}`,
            opacity: 0.8,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <img src={badgeUrl(MODULE_BADGE_IDS[house.type] ?? 1)} alt="" className="pokecity-badge pokecity-badge--sm" />
          {ht.label.toUpperCase()}
        </div>
      </div>

      {/* Module content */}
      <div className="city-panel__module">
        {ModuleComponent && <ModuleComponent resident={resident} />}
      </div>

      {/* Dialogue box */}
      {!dialogueDismissed && dialogue && (
        <div
          className="city-dialogue"
          onClick={() => setDialogueDismissed(true)}
          role="button"
          aria-label="Dismiss dialogue"
        >
          <div className="city-dialogue__speaker">{dialogue.speaker} says:</div>
          <div className="city-dialogue__text">{dialogue.text}</div>
        </div>
      )}
    </div>
  );
}
