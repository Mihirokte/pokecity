import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useCityStore } from './stores/cityStore';
import { useUIStore } from './stores/uiStore';
import { SheetsService } from './services/sheetsService';
import { SAMPLE_SPREADSHEET_ID } from './data/sampleData';
import { Toasts } from './components/Toasts';
import './styles/city.css';

const LandingPage = lazy(() => import('./components/Landing/LandingPage').then(m => ({ default: m.LandingPage })));
const CityView = lazy(() => import('./components/City/CityView').then(m => ({ default: m.CityView })));

function LoadingScreen() {
  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#09090b',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Pokéball spinner */}
      <div style={{ width: 64, height: 64, marginBottom: 24, position: 'relative', animation: 'pokeball-spin 1s linear infinite' }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'linear-gradient(to bottom, #e74c3c 50%, #f0f0f5 50%)',
          border: '3px solid #1a1a2e',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: 4, background: '#1a1a2e', transform: 'translateY(-50%)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 16, height: 16, borderRadius: '50%',
          background: '#f0f0f5', border: '3px solid #1a1a2e',
          transform: 'translate(-50%, -50%)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 8, height: 8, borderRadius: '50%',
          background: '#e74c3c',
          transform: 'translate(-50%, -50%)',
        }} />
      </div>
      <div style={{ fontSize: 15, color: '#f0f0f5', fontWeight: 500, marginBottom: 6 }}>
        Loading PokéCity...
      </div>
      <div style={{ fontSize: 13, color: '#55556a' }}>
        Connecting to your data
      </div>
      <style>{`@keyframes pokeball-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ReconnectScreen({
  onCreateNewCity,
  onLogout,
}: {
  onCreateNewCity: () => Promise<void>;
  onLogout: () => void;
}) {
  const [creating, setCreating] = useState(false);
  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      background: '#09090b',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      padding: 24,
    }}>
      <div style={{ fontSize: 18, color: '#f0f0f5', fontWeight: 600, textAlign: 'center' }}>
        Your city spreadsheet was not found
      </div>
      <div style={{ fontSize: 14, color: '#8b9bb4', textAlign: 'center', maxWidth: 320 }}>
        It may have been deleted or you no longer have access. Create a new city to continue.
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={async () => {
            setCreating(true);
            try {
              await onCreateNewCity();
            } finally {
              setCreating(false);
            }
          }}
          disabled={creating}
          style={{
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: creating ? 'not-allowed' : 'pointer',
          }}
        >
          {creating ? 'Creating…' : 'Create new city'}
        </button>
        <button
          type="button"
          onClick={onLogout}
          style={{
            padding: '12px 24px',
            fontSize: 14,
            background: 'transparent',
            color: '#8b9bb4',
            border: '1px solid #3f3f46',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const user = useAuthStore(s => s.user);
  const accessToken = useAuthStore(s => s.accessToken);
  const spreadsheetId = useAuthStore(s => s.spreadsheetId);
  const isTokenValid = useAuthStore(s => s.isTokenValid);
  const restoreSession = useAuthStore(s => s.restoreSession);
  const handleCallback = useAuthStore(s => s.handleCallback);
  const setSpreadsheet = useAuthStore(s => s.setSpreadsheet);
  const addToast = useUIStore(s => s.addToast);
  const loadAllData = useCityStore(s => s.loadAllData);
  const dataLoaded = useCityStore(s => s.dataLoaded);
  const setDataLoaded = useCityStore(s => s.setDataLoaded);

  const [booting, setBooting] = useState(true);
  const [spreadsheetNotFound, setSpreadsheetNotFound] = useState(false);

  // On mount: try restoring session or handling OAuth callback
  useEffect(() => {
    (async () => {
      // Check for OAuth token in hash
      if (window.location.hash && window.location.hash.includes('access_token')) {
        console.log('Processing OAuth callback...');
        const success = await handleCallback();
        console.log('OAuth callback result:', success);
        if (success) {
          // Clear the hash after successful callback
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else {
        restoreSession();
      }
      setBooting(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodically check for new deployments (cache busting)
  // Every 5 minutes, fetch index.html to see if it has changed
  useEffect(() => {
    const checkForNewVersion = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}index.html`, {
          method: 'HEAD',
          cache: 'no-cache',
        });
        // Get the etag or last-modified header as a version identifier
        const etag = response.headers.get('etag');
        const lastModified = response.headers.get('last-modified');
        const versionId = etag || lastModified || '';

        // Store and compare with previous version
        const storedVersionId = sessionStorage.getItem('pokecity_version_id');
        if (storedVersionId && storedVersionId !== versionId) {
          addToast('A new version is available! Refresh the page to get the latest features.', 'info');
        } else if (!storedVersionId && versionId) {
          sessionStorage.setItem('pokecity_version_id', versionId);
        }
      } catch (e) {
        // Silently fail - network error or cors issue
        console.debug('Version check failed:', e);
      }
    };

    checkForNewVersion();
    const interval = setInterval(checkForNewVersion, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [addToast]);

  // After auth, bootstrap spreadsheet, ensure new sheets exist, load data
  useEffect(() => {
    if (!accessToken || !isTokenValid() || booting) return;
    let cancelled = false;

    (async () => {
      try {
        if (spreadsheetId === SAMPLE_SPREADSHEET_ID) {
          await loadAllData();
          if (cancelled) return;
          addToast('Sample data loaded (localhost mode)', 'info');
          return;
        }

        if (!spreadsheetId) {
          // First time: create spreadsheet with ALL sheets (legacy + new)
          const { spreadsheetId: newId, sheetGids } =
            await SheetsService.createSpreadsheet(`PokéCenter Hub - ${user?.name ?? 'User'}`);
          if (cancelled) return;
          setSpreadsheet(newId, sheetGids);

          // Move spreadsheet into a "PokéCity" Drive folder
          try {
            const folderId = await SheetsService.ensureDriveFolder('PokéCity');
            await SheetsService.moveToFolder(newId, folderId);
          } catch (e) {
            console.warn('Could not move spreadsheet to Drive folder:', e);
          }

          await SheetsService.append('Meta', { key: 'cityName', value: 'PokéCenter' });
          if (cancelled) return;
          addToast('PokéCenter created!', 'success');
          return;
        }

        try {
          // Ensure new sheets exist (migration for existing spreadsheets)
          const updatedGids = await SheetsService.ensureSheets();
          if (cancelled) return;
          setSpreadsheet(spreadsheetId, updatedGids);

            await loadAllData();
        } catch (loadErr: unknown) {
          const msg = loadErr instanceof Error ? loadErr.message : String(loadErr);
          if (msg.includes('404') || msg.includes('Not Found')) {
            console.warn('Spreadsheet not found, clearing stale ID');
            setSpreadsheet('', {});
            setDataLoaded(false);
            setSpreadsheetNotFound(true);
            return;
          }
          throw loadErr;
        }
      } catch (e: unknown) {
        console.error('Bootstrap error:', e);
        const msg = e instanceof Error ? e.message : String(e);
        addToast(`Bootstrap failed: ${msg}`, 'error');
      }
    })();

    return () => { cancelled = true; };
  }, [accessToken, spreadsheetId, booting]); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = useAuthStore(s => s.logout);

  const handleCreateNewCity = useCallback(async () => {
    const { spreadsheetId: newId, sheetGids } =
      await SheetsService.createSpreadsheet(`PokéCenter Hub - ${user?.name ?? 'User'}`);
    setSpreadsheet(newId, sheetGids);
    setSpreadsheetNotFound(false);
    try {
      const folderId = await SheetsService.ensureDriveFolder('PokéCity');
      await SheetsService.moveToFolder(newId, folderId);
    } catch (e) {
      console.warn('Could not move spreadsheet to Drive folder:', e);
    }
    await SheetsService.append('Meta', { key: 'cityName', value: 'PokéCenter' });
    await loadAllData();
    addToast('New city created!', 'success');
  }, [user?.name, setSpreadsheet, loadAllData, addToast]);

  // Render - always show landing page (agents directory) 
  // User can login to access full CityView
  const isAuthed = !!user && !!accessToken && isTokenValid();
  
  return (
    <>
      <Toasts />
      {!isAuthed ? (
        <Suspense fallback={<LoadingScreen />}>
          <LandingPage />
        </Suspense>
      ) : spreadsheetNotFound ? (
        <ReconnectScreen onCreateNewCity={handleCreateNewCity} onLogout={logout} />
      ) : !dataLoaded ? (
        <LoadingScreen />
      ) : (
        <Suspense fallback={<LoadingScreen />}>
          <CityView />
        </Suspense>
      )}
    </>
  );
}
