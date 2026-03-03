// Design tokens for the modern command center UI

export const colors = {
  // Background layers (depth)
  bg0: '#09090b',
  bg1: '#111118',
  bg2: '#1a1a2e',
  bg3: '#1e1e36',

  // Borders
  border0: 'rgba(255,255,255,0.06)',
  border1: 'rgba(255,255,255,0.10)',
  border2: 'rgba(255,255,255,0.15)',

  // Text
  textPrimary: '#f0f0f5',
  textSecondary: '#8b8b9e',
  textMuted: '#55556a',

  // Accent
  accent: '#818cf8',
  accentHover: '#6366f1',
  accentMuted: 'rgba(129,140,248,0.12)',

  // Status
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',

  // Pokemon flair
  gold: '#ffcd75',
  goldMuted: 'rgba(255,205,117,0.12)',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
} as const;

export const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

export const fontSize = {
  xs: '11px',
  sm: '13px',
  md: '15px',
  lg: '20px',
  xl: '28px',
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
} as const;

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

// Status color mapping for agents
export const statusColors: Record<string, string> = {
  running: colors.green,
  idle: colors.textMuted,
  stopped: colors.yellow,
  completed: colors.blue,
  error: colors.red,
};
