import { useState, useRef, useEffect } from 'react';
import type { House, Resident } from '../../types';
import { HOUSE_TYPES } from '../../config/houseTypes';
import { spriteArtworkUrl, badgeUrl, MODULE_BADGE_IDS, POKEMON_DIALOGUES, POKEMON_NAMES } from '../../config/pokemon';
import { useCityStore } from '../../stores/cityStore';
import { getHexIndexForHouse, BOARD_HEX_COUNT } from '../Landing/catanData';
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
  const cityProgress = useCityStore(s => s.cityProgress);
  const ht = HOUSE_TYPES[house.type];
  const ModuleComponent = MODULE_MAP[house.type];
  const pokemonId = parseInt(resident.emoji, 10);
  const baseDialogue = (Number.isNaN(pokemonId) ? null : POKEMON_DIALOGUES[pokemonId]) ?? DIALOGUES[house.type];
  const vibe = (() => {
    if (cityProgress.dailyStreak >= 7) return ' Your streak is legendary this week—keep it up!';
    if (cityProgress.dailyStreak >= 3) return ' Nice streak! Let’s keep the chain going.';
    if (cityProgress.cityLevel >= 5) return ' You’ve leveled up a ton—let’s push for the next milestone.';
    return '';
  })();
  const dialogue = { ...baseDialogue, text: `${baseDialogue.text}${vibe}` };
  const pokemonName = Number.isNaN(pokemonId) ? null : (POKEMON_NAMES[pokemonId] ?? null);
  const currentHexIndex = getHexIndexForHouse(house.gridX);

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
          <div className="city-panel__role" style={{ color: ht.color }}>
            {pokemonName ?? resident.role}
          </div>
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

      {/* Position on board — move agent to any tile (0..18) */}
      <div className="city-panel__position-row">
        <label htmlFor="city-panel-position" style={{ fontFamily: 'Dogica, monospace', fontSize: 10 }}>
          Tile:
        </label>
        <select
          id="city-panel-position"
          value={currentHexIndex}
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
          {Array.from({ length: BOARD_HEX_COUNT }, (_, i) => (
            <option key={i} value={i}>
              Tile {i + 1}
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
