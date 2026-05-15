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
      const notificationTitle = payload.notification.title || 'Novidade!';
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/icons/icon-192.svg'
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} catch (e) {
  console.warn('FCM Background indisponível sem configuração.', e);
}
