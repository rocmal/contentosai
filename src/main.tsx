import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { MobileApp } from './mobile/MobileApp';

/** /m (and any /m/* sub-path) is the standalone mobile app shell (see
 * src/mobile/MobileApp.tsx) - a self-contained, native-app-style experience
 * with its own auth-gated screens, entirely separate from the desktop
 * dashboard. Branching here, above <App/>, means the desktop shell's own
 * data-fetching effects (brand profile, settings, hash routing, etc.) never
 * mount at all on this path, instead of mounting and immediately failing/
 * no-oping. */
function Root() {
  const isMobileRoute = window.location.pathname === '/m' || window.location.pathname.startsWith('/m/');
  return isMobileRoute ? <MobileApp /> : <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
);
