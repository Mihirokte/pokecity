import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker for PWA/offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/pokecity/service-worker.js')
    .then(registration => {
      console.log('[App] Service Worker registered:', registration);
    })
    .catch(error => {
      console.warn('[App] Service Worker registration failed:', error);
    });
}
