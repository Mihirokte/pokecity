import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useCityStore } from './stores/cityStore';
import { useUIStore } from './stores/uiStore';
import { SheetsService } from './services/sheetsService';
import { LandingPage } from './components/Landing/LandingPage';
import { ShopView } from './components/Shop/ShopView';
import { Toasts } from './components/Toasts';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #2b2d42, #1a1c2c)',
    }}>
      <div style={{ position: 'relative', width: 280, height: 200 }}>
        <div className="layer"><img src={`${import.meta.env.BASE_URL}assets/ui/modal.png`} alt="" /></div>
        <div className="layer layer--fg" style={{ flexDirection: 'column', gap: 16 }}>
          <img src={`${import.meta.env.BASE_URL}assets/gif/loading.gif`} alt="Loading" style={{ width: 48, height: 48 }} />
          <span style={{ fontFamily: 'VT323, monospace', fontSize: 20, color: '#c0cbdc' }}>
            Loading your city...
          </span>
        </div>
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

  const [booting, setBooting] = useState(true);

  // On mount: try restoring session or handling OAuth callback
  useEffect(() => {
    (async () => {
      if (window.location.hash.includes('access_token')) {
        await handleCallback();
        setBooting(false);
        return;
      }
      restoreSession();
      setBooting(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // After auth, bootstrap spreadsheet if needed, then load data
  useEffect(() => {
    if (!accessToken || !isTokenValid() || booting) return;
    let cancelled = false;

    (async () => {
      try {
        if (!spreadsheetId) {
          // Try to find an existing PokéCity spreadsheet first (cross-device sync)
          const existing = await SheetsService.findExistingSpreadsheet();
          if (cancelled) return;

          if (existing) {
            setSpreadsheet(existing.spreadsheetId, existing.sheetGids);
            addToast('Found your existing city!', 'success');
            return;
          }

          // No existing spreadsheet — create a new one
          const { spreadsheetId: newId, sheetGids } =
            await SheetsService.createSpreadsheet(`PokéCity - ${user?.name ?? 'User'}`);
          if (cancelled) return;
          setSpreadsheet(newId, sheetGids);
          await SheetsService.append('Meta', { key: 'cityName', value: 'My City' });
          if (cancelled) return;
          addToast('City created! Start building.', 'success');
          return;
        }

        try {
          await loadAllData();
        } catch (loadErr: any) {
          if (loadErr?.message?.includes('404') || loadErr?.message?.includes('Not Found')) {
            console.warn('Spreadsheet not found, clearing stale ID');
            setSpreadsheet('', {});
            return;
          }
          throw loadErr;
        }
      } catch (e: any) {
        console.error('Bootstrap error:', e);
        const msg = e?.message ?? String(e);
        addToast(`Bootstrap failed: ${msg}`, 'error');
      }
    })();

    return () => { cancelled = true; };
  }, [accessToken, spreadsheetId, booting]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render
  if (booting) return <LoadingScreen />;

  const isAuthed = !!user && !!accessToken && isTokenValid();

  return (
    <>
      <Toasts />
      {!isAuthed ? (
        <LandingPage />
      ) : !dataLoaded ? (
        <LoadingScreen />
      ) : (
        <ShopView />
      )}
    </>
  );
}
