importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// ============================================================
// firebase-messaging-sw.js — Service Worker para Push (White Label)
//
// As credenciais do Firebase são injetadas pelo cliente via
// postMessage após o SW ser registrado (ver src/shared/lib/firebase.ts).
// Isso mantém este arquivo sem credenciais hardcoded, permitindo
// que qualquer cliente use seu próprio projeto Firebase.
// ============================================================

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
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((r) => r || new Response('Offline', { status: 503 })))
  );
});

// ---------------------------------------------------------------------------
// Recebe configuração Firebase via postMessage do app principal
// Isso evita credenciais hardcoded no SW (White Label)
// ---------------------------------------------------------------------------
let firebaseInitialized = false;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    if (firebaseInitialized) return;
    try {
      const firebaseConfig = event.data.config;
      if (firebaseConfig && firebaseConfig.apiKey) {
        firebase.initializeApp(firebaseConfig);
        firebase.messaging();
        firebaseInitialized = true;
        console.log('[SW] Firebase inicializado via postMessage');
      }
    } catch (e) {
      console.warn('[SW] Erro ao inicializar Firebase via postMessage:', e);
    }
  }
});

// ---------------------------------------------------------------------------
// Evento `push` nativo — exibe notificação no SO
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  console.log('[SW] push event recebido');

  let payload = {};
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (e) {
    console.warn('[SW] Falha ao parsear payload do push:', e);
  }

  console.log('[SW] push payload:', JSON.stringify(payload));

  const title =
    payload.notification?.title ||
    payload.data?.title ||
    'Nova atualização';

  const body =
    payload.notification?.body ||
    payload.data?.body ||
    'Você tem uma nova atualização.';

  const icon =
    payload.data?.icon ||
    payload.notification?.icon ||
    '/icons/icon-app.png';

  const clickUrl =
    payload.fcmOptions?.link ||
    payload.data?.link ||
    '/';

  const options = {
    body,
    icon,
    badge: '/icons/icon-app.png',
    vibrate: [200, 100, 200],
    tag: 'ecommerce-notification-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: { url: clickUrl },
    actions: [{ action: 'open', title: 'Abrir' }],
    dir: 'ltr',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ---------------------------------------------------------------------------
// Clique na notificação
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] notificationclick:', event.action);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
