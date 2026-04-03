const CACHE = 'wealtharc-v5';
const CORE = ['/Wealth-Arc/', '/Wealth-Arc/index.html'];

self.addEventListener('install', function(e) {
  // Offline'da install başarısız olmasın diye hataları yakala
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return Promise.all(CORE.map(function(url) {
        return fetch(url, {cache: 'no-store'}).then(function(r) {
          if (r && r.status === 200) return c.put(url, r);
        }).catch(function() {
          // Offline'da fetch başarısız olursa eski cache'i kopyala
          return caches.match(url).then(function(old) {
            if (old) return c.put(url, old);
          });
        });
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        if (e.request.mode === 'navigate') return caches.match('/Wealth-Arc/index.html');
      });
    })
  );
});
