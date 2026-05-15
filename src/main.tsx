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

// O registro do Service Worker agora é gerenciado automaticamente pelo vite-plugin-pwa
// conforme configurado em vite.config.ts. Não é necessário registro manual aqui.
