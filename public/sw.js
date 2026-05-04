// Service Worker — Cache básico para PWA
// ============================================================
// Estratégia: Network First com fallback para cache.
// O app funciona normalmente online, mas se ficar offline,
// mostra a última versão carregada.
// ============================================================

const CACHE_NAME = 'ecommerce-v2';
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
  // Não cachear requests de API ou SDKs sensíveis
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('viacep.com.br') ||
    event.request.url.includes('nominatim.openstreetmap.org') ||
    event.request.url.includes('api.imgbb.com') ||
    event.request.url.includes('sdk.mercadopago.com') ||
    event.request.url.includes('img.icons8.com') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clona e salva no cache
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
