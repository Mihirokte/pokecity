import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

export function LandingPage() {
  const login = useAuthStore(s => s.login);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="pkcenter">
      {/* ── Floor: checkerboard tiles ── */}
      <div className="pkcenter__floor" />

      {/* ── Left wall ── */}
      <div className="pkcenter__wall-left">
        <div className="pkcenter__doorway pkcenter__doorway--left" />
      </div>

      {/* ── Right wall ── */}
      <div className="pkcenter__wall-right">
        <div className="pkcenter__doorway pkcenter__doorway--right" />
      </div>

      {/* ── Back wall ── */}
      <div className="pkcenter__back-wall">
        {/* Trim */}
        <div className="pkcenter__wall-trim" />
        {/* Windows */}
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="pkcenter__window" style={{ left: `${12 + i * 22}%` }}>
            <div className="pkcenter__window-divider" />
          </div>
        ))}
      </div>

      {/* ── PokéCity sign ── */}
      <div className="pkcenter__sign">
        <span className="pkcenter__sign-text">PokéCity</span>
      </div>

      {/* ── Red cross symbol ── */}
      <div className="pkcenter__cross-circle">
        <div className="pkcenter__cross-h" />
        <div className="pkcenter__cross-v" />
      </div>

      {/* ── Reception counter ── */}
      <div className="pkcenter__counter">
        <div className="pkcenter__counter-front" />
        {/* Monitors */}
        <div className="pkcenter__monitor" style={{ left: '25%' }}>
          <div className="pkcenter__monitor-screen" />
          <div className="pkcenter__monitor-stand" />
        </div>
        <div className="pkcenter__monitor" style={{ left: '65%' }}>
          <div className="pkcenter__monitor-screen" />
          <div className="pkcenter__monitor-stand" />
        </div>
      </div>

      {/* ── Nurse NPC ── */}
      <div className="pkcenter__nurse">
        <div className="pkcenter__nurse-cap" />
        <div className="pkcenter__nurse-head">
          <div className="pkcenter__nurse-eye" style={{ left: '25%' }} />
          <div className="pkcenter__nurse-eye" style={{ left: '65%' }} />
        </div>
        <div className="pkcenter__nurse-body" />
      </div>

      {/* ── NPC 1: Dark-robed figure ── */}
      <div className="pkcenter__npc pkcenter__npc1">
        <div className="pkcenter__npc1-hair" />
        <div className="pkcenter__npc1-head" />
        <div className="pkcenter__npc1-body" />
      </div>

      {/* ── NPC 2: Red shirt boy ── */}
      <div className="pkcenter__npc pkcenter__npc2">
        <div className="pkcenter__npc2-hair" />
        <div className="pkcenter__npc2-head" />
        <div className="pkcenter__npc2-body" />
        <div className="pkcenter__npc2-legs" />
      </div>

      {/* ── NPC 3: Blue shirt boy ── */}
      <div className="pkcenter__npc pkcenter__npc3">
        <div className="pkcenter__npc3-hair" />
        <div className="pkcenter__npc3-head" />
        <div className="pkcenter__npc3-body" />
        <div className="pkcenter__npc3-legs" />
      </div>

      {/* ── NPC 4: Girl ── */}
      <div className="pkcenter__npc pkcenter__npc4">
        <div className="pkcenter__npc4-hair" />
        <div className="pkcenter__npc4-head" />
        <div className="pkcenter__npc4-body" />
      </div>

      {/* ── Lounge area ── */}
      <div className="pkcenter__lounge">
        {/* Table */}
        <div className="pkcenter__table">
          <div className="pkcenter__table-cross-h" />
          <div className="pkcenter__table-cross-v" />
        </div>
        {/* Ottoman seats */}
        <div className="pkcenter__ottoman pkcenter__ottoman--blue" style={{ left: -28, top: 10 }} />
        <div className="pkcenter__ottoman pkcenter__ottoman--yellow" style={{ right: -28, top: 10 }} />
        <div className="pkcenter__ottoman pkcenter__ottoman--blue2" style={{ left: 16, top: -26 }} />
      </div>

      {/* ── Potted plants ── */}
      <div className="pkcenter__plant pkcenter__plant--left">
        <div className="pkcenter__plant-leaves">
          <div className="pkcenter__leaf pkcenter__leaf--1" />
          <div className="pkcenter__leaf pkcenter__leaf--2" />
          <div className="pkcenter__leaf pkcenter__leaf--3" />
        </div>
        <div className="pkcenter__pot" />
      </div>
      <div className="pkcenter__plant pkcenter__plant--right">
        <div className="pkcenter__plant-leaves">
          <div className="pkcenter__leaf pkcenter__leaf--1" />
          <div className="pkcenter__leaf pkcenter__leaf--2" />
          <div className="pkcenter__leaf pkcenter__leaf--3" />
        </div>
        <div className="pkcenter__pot" />
      </div>

      {/* ── Dialog box ── */}
      <div className="pkcenter__dialog">
        <div className="pkcenter__dialog-inner">
          {['Explore City', 'My Team', 'Settings'].map(label => (
            <button
              key={label}
              className="pkcenter__dialog-option"
              onMouseEnter={() => setHovered(label)}
              onMouseLeave={() => setHovered(null)}
              onClick={login}
            >
              <span className={`pkcenter__dialog-cursor ${hovered === label ? 'pkcenter__dialog-cursor--visible' : ''}`}>
                &#9654;
              </span>
              <span className={hovered === label ? 'pkcenter__dialog-option--active' : ''}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Missing env notice ── */}
      {!clientId && (
        <div className="pkcenter__env-msg">
          Add <code>VITE_GOOGLE_CLIENT_ID</code> to <code>.env</code> to enable sign-in.
        </div>
      )}
    </div>
  );
}
