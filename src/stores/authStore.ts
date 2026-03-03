import { create } from 'zustand';
import type { GoogleUser, SheetName } from '../types';

const LS_KEY = 'pokecity_auth';
const SCOPES_VERSION_KEY = 'pokecity_scopes_v';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');
// Bump this when scopes change to force re-login
const SCOPES_VERSION = 6;

interface AuthState {
  user: GoogleUser | null;
  accessToken: string | null;
  tokenExpiresAt: number | null;
  spreadsheetId: string | null;
  sheetGids: Record<string, number>;
  isInitializing: boolean;
  lastRefreshAt: number | null;
  tokenRefreshTimer: ReturnType<typeof setTimeout> | null;

  // Actions
  login: () => void;
  logout: () => void;
  handleCallback: () => Promise<boolean>;
  setSpreadsheet: (id: string, gids: Record<string, number>) => void;
  isTokenValid: () => boolean;
  restoreSession: () => boolean;
  refreshTokenSilently: () => Promise<boolean>;
  scheduleTokenRefresh: () => void;
}

function loadFromStorage(): Partial<AuthState> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveToStorage(state: Partial<AuthState>) {
  localStorage.setItem(LS_KEY, JSON.stringify({
    user: state.user,
    accessToken: state.accessToken,
    tokenExpiresAt: state.tokenExpiresAt,
    spreadsheetId: state.spreadsheetId,
    sheetGids: state.sheetGids,
    lastRefreshAt: state.lastRefreshAt,
  }));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  tokenExpiresAt: null,
  spreadsheetId: null,
  sheetGids: {} as Record<SheetName, number>,
  isInitializing: false,
  lastRefreshAt: null,
  tokenRefreshTimer: null,

  login: () => {
    const redirectUri = window.location.origin + (import.meta.env.BASE_URL || '/');
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'token');
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('prompt', 'select_account'); // Quick sign-in after logout: account picker only, no consent screen
    window.location.href = url.toString();
  },

  handleCallback: async () => {
    const hash = window.location.hash;
    if (!hash.includes('access_token')) return false;

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const expiresIn = parseInt(params.get('expires_in') ?? '3600', 10);
    if (!accessToken) return false;

    // Clear hash from URL
    window.history.replaceState(null, '', window.location.pathname);

    set({ isInitializing: true });

    // Fetch user profile
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      set({ isInitializing: false });
      return false;
    }
    const profile = await res.json();
    const user: GoogleUser = {
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      given_name: profile.given_name,
    };
    const tokenExpiresAt = Date.now() + expiresIn * 1000;

    // Check if this is a fresh login with updated scopes
    const storedVersion = parseInt(localStorage.getItem(SCOPES_VERSION_KEY) ?? '0', 10);
    const scopesChanged = storedVersion < SCOPES_VERSION;

    // Restore spreadsheetId from localStorage (unless scopes changed — need fresh Drive search)
    const stored = scopesChanged ? {} : loadFromStorage();

    set({
      user,
      accessToken,
      tokenExpiresAt,
      spreadsheetId: (stored as Partial<AuthState>).spreadsheetId ?? null,
      sheetGids: ((stored as Partial<AuthState>).sheetGids ?? {}) as Record<SheetName, number>,
      isInitializing: false,
      lastRefreshAt: Date.now(),
    });

    // Mark scopes version as current
    localStorage.setItem(SCOPES_VERSION_KEY, String(SCOPES_VERSION));
    saveToStorage(get());
    get().scheduleTokenRefresh();
    return true;
  },

  logout: () => {
    // Preserve spreadsheet link across logouts so sync isn't lost
    const { spreadsheetId, sheetGids, tokenRefreshTimer } = get();

    // Clear refresh timer
    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer);
    }

    localStorage.removeItem(LS_KEY);
    if (spreadsheetId) {
      localStorage.setItem(LS_KEY, JSON.stringify({ spreadsheetId, sheetGids }));
    }
    set({
      user: null,
      accessToken: null,
      tokenExpiresAt: null,
      spreadsheetId,
      sheetGids,
      tokenRefreshTimer: null,
      lastRefreshAt: null,
    });
  },

  setSpreadsheet: (id, gids) => {
    set({ spreadsheetId: id || null, sheetGids: gids });
    saveToStorage(get());
  },

  isTokenValid: () => {
    const { tokenExpiresAt } = get();
    if (!tokenExpiresAt) return false;
    return Date.now() < tokenExpiresAt;
  },

  restoreSession: () => {
    // If scopes changed since last login, force re-login
    const storedVersion = parseInt(localStorage.getItem(SCOPES_VERSION_KEY) ?? '0', 10);
    if (storedVersion < SCOPES_VERSION) {
      localStorage.removeItem(LS_KEY);
      return false;
    }

    const stored = loadFromStorage();
    if (stored.accessToken && stored.tokenExpiresAt && Date.now() < stored.tokenExpiresAt) {
      set({
        user: stored.user as GoogleUser,
        accessToken: stored.accessToken as string,
        tokenExpiresAt: stored.tokenExpiresAt as number,
        spreadsheetId: stored.spreadsheetId as string | null,
        sheetGids: (stored.sheetGids ?? {}) as Record<SheetName, number>,
        lastRefreshAt: (stored as Partial<AuthState>).lastRefreshAt ?? null,
      });
      get().scheduleTokenRefresh();
      return true;
    }
    return false;
  },

  refreshTokenSilently: async () => {
    try {
      const { accessToken } = get();
      if (!accessToken) return false;

      // Use hidden iframe to silently refresh token before expiration
      const redirectUri = window.location.origin + (import.meta.env.BASE_URL || '/');
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'token');
      url.searchParams.set('scope', SCOPES);
      url.searchParams.set('prompt', 'none'); // Silent - no user interaction
      url.searchParams.set('access_type', 'offline');

      const result = await new Promise<boolean>((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url.toString();

        const handleLoad = () => {
          try {
            const hash = iframe.contentWindow?.location.hash || '';
            if (hash.includes('access_token')) {
              const params = new URLSearchParams(hash.substring(1));
              const newAccessToken = params.get('access_token');
              const expiresIn = parseInt(params.get('expires_in') ?? '3600', 10);

              if (newAccessToken) {
                const tokenExpiresAt = Date.now() + expiresIn * 1000;
                set({
                  accessToken: newAccessToken,
                  tokenExpiresAt,
                  lastRefreshAt: Date.now(),
                });
                saveToStorage(get());
                document.body.removeChild(iframe);
                resolve(true);
                return;
              }
            }
          } catch {
            // Silent failure - iframe origin isolation
          }
          document.body.removeChild(iframe);
          resolve(false);
        };

        iframe.addEventListener('load', handleLoad);
        iframe.addEventListener('error', () => {
          document.body.removeChild(iframe);
          resolve(false);
        });

        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
            resolve(false);
          }
        }, 5000); // 5s timeout

        document.body.appendChild(iframe);
      });

      if (result) {
        get().scheduleTokenRefresh();
      }
      return result;
    } catch {
      return false;
    }
  },

  scheduleTokenRefresh: () => {
    const { tokenExpiresAt, tokenRefreshTimer } = get();

    // Clear existing timer
    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer);
    }

    if (!tokenExpiresAt) return;

    // Schedule refresh 5 minutes before expiration
    const timeUntilExpiry = tokenExpiresAt - Date.now();
    const refreshIn = Math.max(0, timeUntilExpiry - 5 * 60 * 1000);

    const timer = setTimeout(() => {
      get().refreshTokenSilently();
    }, refreshIn);

    set({ tokenRefreshTimer: timer });
  },
}));
