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

// Registra o Service Worker (PWA) — apenas em produção
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Falha silenciosa — PWA é enhancement, não blocker
    });
  });
}
