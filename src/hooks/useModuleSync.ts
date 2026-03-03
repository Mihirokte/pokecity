// ─── Optimistic-update hook ───
// Applies a local state change immediately, fires the async Sheet operation,
// and rolls back + shows an error toast if it fails.
import { useCallback } from 'react';
import { useCityStore } from '../stores/cityStore';
import { useUIStore } from '../stores/uiStore';
import type { AllModuleData } from '../types';

export function useModuleSync() {
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  return useCallback(
    async <K extends keyof AllModuleData>(
      key: K,
      prev: AllModuleData[K],
      next: AllModuleData[K],
      operation: () => Promise<void>,
      errorMsg: string,
    ): Promise<void> => {
      setModuleData(key, next);
      try {
        await operation();
      } catch {
        setModuleData(key, prev);
        addToast(errorMsg, 'error');
      }
    },
    [setModuleData, addToast],
  );
}
