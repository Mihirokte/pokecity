import { useEffect, useRef } from 'react';
import { usePokecenterStore } from '../pokecenterStore';

export function useSessionPersistence() {
  const saveTimerRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    // Auto-save session every 30 seconds
    saveTimerRef.current = setInterval(() => {
      const { playerPos, playerDir, saveSession, pcDataLoaded } = usePokecenterStore.getState();
      if (!pcDataLoaded) return;
      saveSession({
        lastX: String(playerPos.x),
        lastY: String(playerPos.y),
        lastDirection: playerDir,
        timestamp: new Date().toISOString(),
      });
    }, 30000);

    // Save on page unload
    const handleUnload = () => {
      const { playerPos, playerDir, saveSession } = usePokecenterStore.getState();
      saveSession({
        lastX: String(playerPos.x),
        lastY: String(playerPos.y),
        lastDirection: playerDir,
        timestamp: new Date().toISOString(),
      });
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);
}
