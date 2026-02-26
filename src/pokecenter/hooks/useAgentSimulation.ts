import { useEffect, useRef } from 'react';
import { usePokecenterStore } from '../pokecenterStore';

const LOG_MESSAGES = [
  'Processing data batch...',
  'Syncing updates...',
  'Running analysis...',
  'Checking sources...',
  'Indexing new entries...',
  'Optimizing results...',
  'Scanning for changes...',
  'Compiling report...',
  'Fetching latest data...',
  'Verifying integrity...',
];

export function useAgentSimulation() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const { agents, updateAgentProgress, updateAgentStatus, addAgentLog } = usePokecenterStore.getState();

      for (const agent of agents) {
        if (agent.status !== 'running') continue;

        const progress = parseFloat(agent.progress) || 0;
        if (progress >= 100) {
          updateAgentStatus(agent.id, 'completed');
          addAgentLog(agent.id, 'info', 'Task completed successfully!');
          continue;
        }

        // Increment progress
        const inc = Math.random() * 2 + 0.3;
        updateAgentProgress(agent.id, progress + inc);

        // Occasional log entry
        if (Math.random() < 0.06) {
          const msg = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
          addAgentLog(agent.id, 'info', msg);
        }
      }
    }, 1500);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);
}
