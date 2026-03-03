import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useCityStore } from './stores/cityStore';
import { useUIStore } from './stores/uiStore';
import { SheetsService } from './services/sheetsService';
import { LandingPage } from './components/Landing/LandingPage';
import { CityView } from './components/City/CityView';
import { Toasts } from './components/Toasts';
import './styles/city.css';

function LoadingScreen() {
  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#09090b',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        width: 64, height: 64, marginBottom: 24,
        background: `url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png) center/contain no-repeat`,
        animation: 'pulse 1.5s ease infinite',
      }} />
      <div style={{ fontSize: 15, color: '#f0f0f5', fontWeight: 500, marginBottom: 6 }}>
        Loading PokéCity...
      </div>
      <div style={{ fontSize: 13, color: '#55556a' }}>
        Connecting to your data
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
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

  const [booting, setBooting] = useState(true);

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

  // Render - always show landing page (agents directory) 
  // User can login to access full CityView
  const isAuthed = !!user && !!accessToken && isTokenValid();
  
  return (
    <>
      <Toasts />
      {!isAuthed ? (
        <LandingPage />
      ) : !dataLoaded ? (
        <LoadingScreen />
      ) : (
        <CityView />
      )}
    </>
  );
}
