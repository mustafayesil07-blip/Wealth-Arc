const CACHE = 'pac-v2';
const SHELL = [
  './index.html',
  './manifest.json',
  './sw.js',
];

/* Google Fonts offline için ayrı cache */
const FONT_CACHE = 'pac-fonts-v1';

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return Promise.all(SHELL.map(function(url) {
        return fetch(url, { cache: 'no-store' })
          .then(function(r) { if (r && r.status === 200) return c.put(url, r); })
          .catch(function() {
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
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k !== CACHE && k !== FONT_CACHE; })
          .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;

  var url = e.request.url;

  /* Google Fonts — cache-first, uzun süreli */
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(FONT_CACHE).then(function(fc) {
        return fc.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(r) {
            if (r && r.status === 200) fc.put(e.request, r.clone());
            return r;
          }).catch(function() { return cached; });
        });
      })
    );
    return;
  }

  /* App shell — network-first, cache fallback */
  e.respondWith(
    fetch(e.request)
      .then(function(r) {
        if (r && r.status === 200) {
          var clone = r.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return r;
      })
      .catch(function() {
        return caches.match(e.request).then(function(cached) {
          if (cached) return cached;
          if (e.request.mode === 'navigate') return caches.match('./index.html');
        });
      })
  );
});
