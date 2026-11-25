// Service worker: guarda as telas para abrir rápido e funcionar sem internet.
// Sempre tenta a rede primeiro (para pegar a versão nova) e usa o que está guardado se cair.
const CACHE = 'doze-v10';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html', 'styles.css?v=10', 'data.js?v=10', 'app.js?v=10', 'pdv.js?v=10', 'paginas.js?v=10', 'painel.js?v=10', 'ux.js?v=10', 'selo.svg']).catch(() => {}))); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok && (r.type === 'basic' || r.type === 'cors')) { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: false }).then(r => r || caches.match('index.html'))));
});
