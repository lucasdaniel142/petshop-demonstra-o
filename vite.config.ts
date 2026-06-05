// vite.config.ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente do modo atual
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Plugin que gera o firebase-messaging-sw.js com as credenciais injetadas
      // Necessário para notificações push funcionarem no mobile/Android
      // O SW é acordado pelo SO antes do app carregar, então não pode
      // depender de postMessage para receber as credenciais.
      {
        name: 'generate-firebase-sw',
        closeBundle() {
          const swContent = `importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const CACHE_NAME = 'ecommerce-v5';
const STATIC_ASSETS = ['/', '/manifest.json', '/logo.png', '/icons/icon-app.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebasestorage.googleapis.com') ||
    event.request.url.includes('.firebasestorage.app') ||
    event.request.url.includes('viacep.com.br') ||
    event.request.url.includes('nominatim.openstreetmap.org') ||
    event.request.url.includes('api.imgbb.com') ||
    event.request.url.includes('img.icons8.com') ||
    event.request.url.includes('vercel.live') ||
    event.request.url.includes('chrome-extension://') ||
    event.request.method !== 'GET'
  ) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((r) => r || new Response('Offline', { status: 503 })))
  );
});

// Inicializa Firebase com credenciais injetadas em build-time
try {
  firebase.initializeApp({
    apiKey: "${env.VITE_FIREBASE_API_KEY}",
    authDomain: "${env.VITE_FIREBASE_AUTH_DOMAIN}",
    projectId: "${env.VITE_FIREBASE_PROJECT_ID}",
    storageBucket: "${env.VITE_FIREBASE_STORAGE_BUCKET}",
    messagingSenderId: "${env.VITE_FIREBASE_MESSAGING_SENDER_ID}",
    appId: "${env.VITE_FIREBASE_APP_ID}",
  });
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] onBackgroundMessage:', JSON.stringify(payload));
    // O evento push abaixo cuida da exibição
  });
} catch (e) {
  console.warn('[SW] Firebase init error:', e);
}

self.addEventListener('push', (event) => {
  let payload = {};
  try { if (event.data) payload = event.data.json(); } catch (e) {}

  const title = payload.notification?.title || payload.data?.title || 'Nova atualização';
  const body  = payload.notification?.body  || payload.data?.body  || 'Você tem uma nova atualização.';
  const icon  = payload.data?.icon || payload.notification?.icon || '/icons/icon-app.png';
  const clickUrl = payload.fcmOptions?.link || payload.data?.link || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icons/icon-app.png',
      vibrate: [200, 100, 200],
      tag: 'ecommerce-notification',
      renotify: true,
      requireInteraction: false,
      silent: false,
      data: { url: clickUrl },
      actions: [{ action: 'open', title: 'Abrir' }],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
    })
  );
});
`;
          const distDir = path.resolve(__dirname, 'dist');
          if (fs.existsSync(distDir)) {
            fs.writeFileSync(path.join(distDir, 'firebase-messaging-sw.js'), swContent);
            console.log('[generate-firebase-sw] firebase-messaging-sw.js gerado com credenciais.');
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    optimizeDeps: {
      exclude: ['mercadopago', 'firebase-admin'],
    },
    server: {
      port: 3000,
      host: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${process.env.DEV_API_PORT || '8787'}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            vendor: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
  };
});
