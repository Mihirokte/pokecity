import { create } from 'zustand';
import type { ToastMessage } from '../types';

interface UIState {
  selectedAgentId: string | null;
  toasts: ToastMessage[];

  selectAgent: (id: string | null) => void;
  clearAgent: () => void;
  addToast: (text: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  selectedAgentId: null,
  toasts: [],

  selectAgent: (id) => set({ selectedAgentId: id }),

  clearAgent: () => set({ selectedAgentId: null }),

  addToast: (text, type = 'info') => {
    const id = `toast_${Date.now()}`;
    set({ toasts: [...get().toasts, { id, text, type }] });
    setTimeout(() => get().removeToast(id), 3500);
  },

  removeToast: (id) =>
    set({ toasts: get().toasts.filter(t => t.id !== id) }),
}));
