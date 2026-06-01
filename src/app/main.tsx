import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import '../index.css';
import { logger } from '../shared/utils/logger';

// [FIX-SW-REGISTER] Registra o firebase-messaging-sw.js e aguarda .ready
// antes de montar o React. Isso garante que quando getNotificationToken()
// for chamado pela primeira vez, o SW já está ativo e controlando a página.
// Timeout de 4s para não bloquear o app em dispositivos lentos/mobile.
async function registerFirebaseServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    // Remove SWs de outros caches para evitar conflitos de versão
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((r) => {
        const url =
          r.active?.scriptURL ??
          r.waiting?.scriptURL ??
          r.installing?.scriptURL ??
          '';
        if (!url) return Promise.resolve();
        if (url.endsWith('/firebase-messaging-sw.js')) return Promise.resolve();
        return r.unregister();
      })
    );

    await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // Aguarda o SW ficar ativo com timeout de 4s.
    // No mobile (Android PWA), o SW pode demorar para ativar na primeira vez.
    // Sem timeout, o app ficaria bloqueado indefinidamente se o SW travar.
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<void>((resolve) => setTimeout(resolve, 4000)),
    ]);

    logger.info('Firebase Messaging Service Worker registrado e ativo.');
  } catch (error) {
    // Não bloqueia a aplicação se o SW falhar — push não funcionará,
    // mas o resto do app continua normalmente.
    logger.error('Erro ao registrar Firebase Messaging Service Worker:', error);
  }
}

// Registra SW e só então monta o React
registerFirebaseServiceWorker().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
