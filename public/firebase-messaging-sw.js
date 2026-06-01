importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const CACHE_NAME = 'ecommerce-v4';
const STATIC_ASSETS = ['/', '/manifest.json', '/logo.png', '/icons/icon-sagrada-familia-app.png'];

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

const firebaseConfig = {
  apiKey: "AIzaSyD8uwYVG34wf5m0BlbFOf6_Dmdlh0lqGs4",
  authDomain: "sagrada-familia-a334e.firebaseapp.com",
  projectId: "sagrada-familia-a334e",
  storageBucket: "sagrada-familia-a334e.firebasestorage.app",
  messagingSenderId: "748039006363",
  appId: "1:748039006363:web:f318f33b15992792427e3e"
};

// ---------------------------------------------------------------------------
// Inicializa Firebase Messaging (compat)
// ---------------------------------------------------------------------------
try {
  if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // onBackgroundMessage é chamado pelo SDK quando o app está em background
    // e o payload é data-only (sem campo `notification`).
    // Para payloads COM `notification`, o SDK compat delega ao evento `push`
    // nativo — por isso também interceptamos o evento `push` diretamente abaixo.
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] onBackgroundMessage:', JSON.stringify(payload));
      // Deixa o handler `push` abaixo cuidar da exibição para evitar duplicação.
      // Este callback apenas garante que o SDK não suprima o evento push.
    });
  }
} catch (e) {
  console.warn('[SW] FCM init error:', e);
}

// ---------------------------------------------------------------------------
// Evento `push` nativo — mais confiável no Chrome Desktop/Windows
// ---------------------------------------------------------------------------
// O SDK Firebase compat registra seu próprio listener de `push`, mas quando
// o payload contém `notification`, ele pode suprimir o showNotification em
// alguns ambientes (especialmente Chrome no Windows com o app em background).
// Ao interceptar o evento `push` diretamente com `event.waitUntil`, garantimos
// que a notificação sempre aparece no SO.
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

  // Extrai título e corpo de qualquer estrutura de payload FCM
  const title =
    payload.notification?.title ||
    payload.data?.title ||
    'Supermercado Sagrada Família';

  const body =
    payload.notification?.body ||
    payload.data?.body ||
    'Nova atualização disponível';

  const icon =
    payload.data?.icon ||
    payload.notification?.icon ||
    '/icons/icon-sagrada-familia-app.png';

  const clickUrl =
    payload.fcmOptions?.link ||
    payload.data?.link ||
    '/';

  const options = {
    body,
    icon,
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    // tag fixo: substitui notificação anterior em vez de empilhar
    tag: 'sagrada-familia-notification',
    renotify: true,
    requireInteraction: false,
    silent: false,
    data: { url: clickUrl },
    actions: [{ action: 'open', title: 'Abrir' }],
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
