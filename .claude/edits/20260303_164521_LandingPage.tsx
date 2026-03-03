import { useAuthStore } from '../../stores/authStore';
import { CatanBoard3D } from './CatanBoard3D';

export function LandingPage() {
  const login = useAuthStore(s => s.login);
  return <CatanBoard3D onLogin={login} />;
}
