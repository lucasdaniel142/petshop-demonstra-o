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
  // ATENÇÃO: Para usar notificações push em background (com app fechado),
  // Substitua as strings abaixo pelas mesmas configurações do seu .env.local
  // apiKey: "API_KEY",
  // authDomain: "AUTH_DOMAIN",
  // projectId: "PROJECT_ID",
  // messagingSenderId: "SENDER_ID",
  // appId: "APP_ID"
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
