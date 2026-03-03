import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { spriteArtworkUrl, PLAYER_POKEMON_ID } from '../../config/pokemon';

const STAR_COUNT = 22;

const STARS = Array.from({ length: STAR_COUNT }, (_, i) => ({
  id: i,
  top: `${Math.floor(Math.random() * 90)}%`,
  left: `${Math.floor(Math.random() * 100)}%`,
  delay: `${(Math.random() * 3).toFixed(2)}s`,
  size: Math.random() > 0.7 ? 3 : 2,
}));

export function LandingPage() {
  const login = useAuthStore(s => s.login);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [started, setStarted] = useState(false);

  const handleStart = useCallback(() => {
    if (!started) setStarted(true);
  }, [started]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!started && e.key !== 'Tab') setStarted(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [started]);

  return (
    <div className="title-screen" onClick={handleStart}>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes title-glow {
          0%, 100% { text-shadow: 0 0 12px #FFD700, 0 0 30px #FFD700, 0 0 60px #FFA500; }
          50% { text-shadow: 0 0 20px #FFD700, 0 0 50px #FFD700, 0 0 90px #FFA500; }
        }
        @keyframes blink-press {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes sprite-bounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-10px) scale(1.03); }
        }
        @keyframes login-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .title-screen {
          height: 100dvh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at center, #1a1a4e 0%, #0a0a1e 55%, #050510 100%);
          cursor: pointer;
          user-select: none;
          overflow: hidden;
          position: relative;
        }
        .title-screen::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            transparent,
            transparent 2px,
            rgba(0,0,0,0.08) 2px,
            rgba(0,0,0,0.08) 4px
          );
          pointer-events: none;
        }
        .ts-star {
          position: absolute;
          background: #fff;
          border-radius: 50%;
          animation: twinkle 3s ease-in-out infinite;
        }
        .ts-border {
          border: 3px solid #FFD700;
          padding: 4px 6px;
          margin-bottom: 6px;
          position: relative;
        }
        .ts-border::before, .ts-border::after {
          content: '★';
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          color: #FFD700;
          font-size: 14px;
        }
        .ts-border::before { left: -20px; }
        .ts-border::after { right: -20px; }
        .ts-title {
          font-family: 'Dogica', monospace;
          font-weight: 700;
          font-size: clamp(22px, 6vw, 52px);
          color: #FFD700;
          letter-spacing: 0.06em;
          animation: title-glow 2.5s ease-in-out infinite;
          line-height: 1;
          padding: 0 8px;
        }
        .ts-version {
          font-family: 'VT323', monospace;
          font-size: 18px;
          color: #a0a0c0;
          letter-spacing: 0.12em;
          margin-bottom: 24px;
        }
        .ts-sprite {
          width: 160px;
          height: 160px;
          object-fit: contain;
          image-rendering: auto;
          animation: sprite-bounce 2.2s ease-in-out infinite;
          filter: drop-shadow(0 8px 24px rgba(255, 200, 0, 0.35));
          margin-bottom: 20px;
        }
        .ts-press {
          font-family: 'VT323', monospace;
          font-size: 22px;
          color: #ffffff;
          letter-spacing: 0.12em;
          animation: blink-press 1s step-end infinite;
          margin-bottom: 0;
        }
        .ts-login {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          animation: login-slide-up 0.4s ease-out;
          margin-top: 8px;
        }
        .ts-google-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #FFD700;
          border: none;
          border-radius: 0;
          padding: 10px 24px;
          cursor: pointer;
          font-family: 'Dogica', monospace;
          font-size: 11px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: 0.04em;
          box-shadow: 4px 4px 0 #b8a000, inset 0 1px 0 rgba(255,255,255,0.3);
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .ts-google-btn:hover {
          transform: translate(-1px, -1px);
          box-shadow: 5px 5px 0 #b8a000, inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .ts-google-btn:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 #b8a000;
        }
        .ts-arrow {
          width: 14px;
          height: 14px;
          image-rendering: pixelated;
        }
        .ts-arrow--left { transform: scaleX(-1); }
        .ts-no-key {
          font-family: 'VT323', monospace;
          font-size: 14px;
          color: #55556a;
          max-width: 320px;
          text-align: center;
          line-height: 1.5;
          margin-top: 8px;
        }
      `}</style>

      {/* Stars */}
      {STARS.map(s => (
        <div
          key={s.id}
          className="ts-star"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: `${2 + parseFloat(s.delay)}s`,
          }}
        />
      ))}

      {/* Title */}
      <div className="ts-border">
        <div className="ts-title">POKÉCITY</div>
      </div>
      <div className="ts-version">— VERSION 2.0 —</div>

      {/* Pikachu sprite */}
      <img
        src={spriteArtworkUrl(PLAYER_POKEMON_ID)}
        alt="Pikachu"
        className="ts-sprite"
        draggable={false}
      />

      {/* Start prompt or login */}
      {!started ? (
        <div className="ts-press">▶ PRESS START ◀</div>
      ) : (
        <div className="ts-login" onClick={e => e.stopPropagation()}>
          <button className="ts-google-btn" onClick={login}>
            <img
              src={`${import.meta.env.BASE_URL}assets/ui/link_pointer.png`}
              alt=""
              className="ts-arrow ts-arrow--left"
            />
            SIGN IN WITH GOOGLE
            <img
              src={`${import.meta.env.BASE_URL}assets/ui/link_pointer.png`}
              alt=""
              className="ts-arrow"
            />
          </button>
          {!clientId && (
            <div className="ts-no-key">
              Set VITE_GOOGLE_CLIENT_ID in .env to enable sign-in.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
