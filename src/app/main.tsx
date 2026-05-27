import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import '../index.css';
import { logger } from '../shared/utils/logger';

// Registrar Service Worker do Firebase Messaging para notificações em background
// Habilitado tanto em produção quanto em desenvolvimento para testes
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) =>
      Promise.all(
        registrations.map((r) => {
          const url =
            r.active?.scriptURL ??
            r.waiting?.scriptURL ??
            r.installing?.scriptURL ??
            '';
          if (!url) return Promise.resolve(false);
          if (url.endsWith('/firebase-messaging-sw.js')) return Promise.resolve(false);
          return r.unregister();
        })
      )
    )
    .finally(() =>
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          logger.info('Firebase Messaging Service Worker registrado com sucesso:', registration);
        })
        .catch((error) => {
          logger.error('Erro ao registrar Firebase Messaging Service Worker:', error);
        })
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
