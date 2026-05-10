// Service Worker — Cache básico para PWA
// ============================================================
// Estratégia: Network First com fallback para cache.
// O app funciona normalmente online, mas se ficar offline,
// mostra a última versão carregada.
// ============================================================

const CACHE_NAME = 'ecommerce-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Instala o service worker e faz cache dos assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Intercepta requests: tenta rede primeiro, fallback para cache
self.addEventListener('fetch', (event) => {
  // Não cachear requests de API, SDKs sensíveis ou scripts de terceiros
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebasestorage.googleapis.com') ||
    event.request.url.includes('.firebasestorage.app') ||
    event.request.url.includes('viacep.com.br') ||
    event.request.url.includes('nominatim.openstreetmap.org') ||
    event.request.url.includes('api.imgbb.com') ||
    event.request.url.includes('sdk.mercadopago.com') ||
    event.request.url.includes('img.icons8.com') ||
    event.request.url.includes('vercel.live') ||
    event.request.url.includes('mlstatic.com') ||
    event.request.url.includes('mercadopago.com') ||
    event.request.url.includes('mercadolibre.com') ||
    event.request.url.includes('chrome-extension://') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Só cacheia respostas válidas (status 200)
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
