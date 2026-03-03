import { useState, useRef, useEffect } from 'react';
import type { House, Resident } from '../../types';
import { HOUSE_TYPES } from '../../config/houseTypes';
import { spriteArtworkUrl, badgeUrl, MODULE_BADGE_IDS } from '../../config/pokemon';
import { useCityStore } from '../../stores/cityStore';
import { defaultSlotForType } from '../Landing/catanData';
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

function getFocusables(container: HTMLElement): HTMLElement[] {
  const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(sel)).filter(el => !el.hasAttribute('disabled'));
}

export function CityPanel({ resident, house, onClose }: CityPanelProps) {
  const [dialogueDismissed, setDialogueDismissed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const updateHousePosition = useCityStore(s => s.updateHousePosition);
  const ht = HOUSE_TYPES[house.type];
  const ModuleComponent = MODULE_MAP[house.type];
  const dialogue = DIALOGUES[house.type];
  const effectiveSlot =
    house.gridX >= 0 && house.gridX <= 5 ? house.gridX : defaultSlotForType(house.type);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const focusables = getFocusables(el);
    if (focusables.length) focusables[0].focus();
  }, [resident.id]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = getFocusables(el);
      if (focusables.length === 0) return;
      const i = focusables.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? focusables.length - 1 : i - 1) : (i >= focusables.length - 1 ? 0 : i + 1);
      e.preventDefault();
      focusables[next].focus();
    };
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div ref={panelRef} className="city-panel">
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

      {/* Position on board — change which hex this agent sits on */}
      <div className="city-panel__position-row">
        <label htmlFor="city-panel-position" style={{ fontFamily: 'Dogica, monospace', fontSize: 10 }}>
          Position on board:
        </label>
        <select
          id="city-panel-position"
          value={effectiveSlot}
          onChange={(e) => updateHousePosition(house.id, parseInt(e.target.value, 10))}
          style={{
            fontFamily: 'Dogica, monospace',
            fontSize: 10,
            padding: '4px 8px',
            border: `1px solid ${ht.color}`,
            borderRadius: 4,
            background: 'var(--panel-bg, #1a1a2e)',
            color: 'inherit',
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((s) => (
            <option key={s} value={s}>
              Spot {s + 1}
            </option>
          ))}
        </select>
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
