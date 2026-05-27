importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const CACHE_NAME = 'ecommerce-v3';
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
// A Firebase config real precisará ser passada de alguma forma.
// O approach mais simples em templates white-label é exigir
// que o cliente cole a config aqui também se for usar push.
// Mas para evitar que o cliente mexa no código, podemos carregar de uma API
// ou apenas usar o onBackgroundMessage genérico e deixar a injeção via vite-plugin-pwa,
// ou simplesmente deixar comentado e documentado.


const firebaseConfig = {
  apiKey: "AIzaSyD8uwYVG34wf5m0BlbFOf6_Dmdlh0lqGs4",
  authDomain: "sagrada-familia-a334e.firebaseapp.com",
  projectId: "sagrada-familia-a334e",
  storageBucket: "sagrada-familia-a334e.firebasestorage.app",
  messagingSenderId: "748039006363",
  appId: "1:748039006363:web:f318f33b15992792427e3e"
};

try {
  // Só inicializa se o cliente configurou o arquivo acima
  if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Mensagem recebida em background ', payload);

      const notificationTitle = payload.notification?.title || 'Supermercado Sagrada Família';
      const notificationOptions = {
        body: payload.notification?.body || 'Nova atualização disponível',
        icon: '/icons/icon-sagrada-familia-app.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'sagrada-familia-notification',
        requireInteraction: false,
        // Configurações para garantir notificação nativa na barra de notificações
        silent: false,
        // Prioridade alta para garantir visibilidade
        priority: 'high',
        // Título curto para mobile
        shortTitle: payload.notification?.title || 'Supermercado',
        // Dados para clique
        data: {
          url: payload.fcmOptions?.link || payload.webpush?.fcmOptions?.link || '/',
          click_action: payload.fcmOptions?.link || payload.webpush?.fcmOptions?.link || '/'
        },
        // Ações possíveis na notificação
        actions: [
          {
            action: 'open',
            title: 'Abrir',
            icon: '/icons/icon-192.png'
          }
        ],
        // Configurações específicas para Android
        android: {
          channelId: 'sagrada-familia-notifications',
          priority: 'high',
          visibility: 'public'
        }
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });

    // Handle notification clicks
    self.addEventListener('notificationclick', (event) => {
      console.log('[firebase-messaging-sw.js] Notification clicked', event);

      event.notification.close();

      const urlToOpen = event.notification.data?.url || event.notification.data?.click_action || '/';

      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then((clientList) => {
            // Check if there's already a window open
            for (const client of clientList) {
              if (client.url === urlToOpen && 'focus' in client) {
                return client.focus();
              }
            }
            // If no window is open, open a new one
            if (self.clients.openWindow) {
              return self.clients.openWindow(urlToOpen);
            }
          })
      );
    });
  }
} catch (e) {
  console.warn('[firebase-messaging-sw.js] FCM Background indisponível sem configuração.', e);
}
