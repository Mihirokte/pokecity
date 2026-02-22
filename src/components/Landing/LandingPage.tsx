import { useAuthStore } from '../../stores/authStore';

export function LandingPage() {
  const login = useAuthStore(s => s.login);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="landing">
      <h1>POKECITY</h1>
      <p className="subtitle">A gamified productivity city</p>

      <button className="auth-btn" onClick={login}>
        <img src={`${import.meta.env.BASE_URL}assets/ui/link_pointer.png`} alt="" className="arrow left pixel"
             style={{ transform: 'scaleX(-1)' }} />
        <span>Sign in with Google</span>
        <img src={`${import.meta.env.BASE_URL}assets/ui/link_pointer.png`} alt="" className="arrow right pixel" />
      </button>

      {!clientId && (
        <div className="no-key-msg">
          To use PokéCity, create a <code>.env</code> file with your Google OAuth Client ID:
          <br /><br />
          <code style={{ color: '#ffcd75' }}>VITE_GOOGLE_CLIENT_ID=your_client_id</code>
          <br /><br />
          The app requires a Google Cloud project with OAuth 2.0 credentials and the Google Sheets API enabled.
        </div>
      )}
    </div>
  );
}
