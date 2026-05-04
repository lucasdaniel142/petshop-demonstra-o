import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { BRAND } from './config/brand';
import './index.css';

// Título da aba dinâmico — controlado pelo .env.local
document.title = BRAND.shortName;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Registra o Service Worker (PWA) — com atualização forçada
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Força a atualização se houver uma nova versão
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão detectada, recarrega para aplicar as novas CSPs
              window.location.reload();
            }
          };
        }
      };
    }).catch(() => {
      // Falha silenciosa
    });
  });
}
