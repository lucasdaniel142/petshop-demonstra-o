importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Como o SW roda num contexto isolado (não tem acesso ao import.meta.env do Vite),
// uma forma simples é fazer fetch das configurações, ou você pode
// deixar essas configs públicas hardcoded aqui, já que a config do Firebase
// de frontend é pública.

// Para o white label sem editar arquivos: o ideal seria injetar as varáveis.
// Usando a API de URLSearchParams:
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
        badge: '/icons/icon-sagrada-familia-app.png',
        vibrate: [200, 100, 200],
        tag: 'sagrada-familia-notification',
        requireInteraction: false,
        // Configurações para garantir notificação nativa na barra de notificações
        silent: false,
        // Prioridade alta para garantir visibilidade
        priority: 2,
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
            icon: '/icons/icon-sagrada-familia-app.png'
          }
        ]
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
