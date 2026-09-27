/* ============================================================
   WEALTH ARC — SERVICE WORKER
   Offline-first shell with stale-while-revalidate updates.
   ============================================================ */

const CACHE = 'wealtharc-v7'
const SCOPE = '/Wealth-Arc/'

const CORE = [
  SCOPE,
  SCOPE + 'index.html',
  SCOPE + 'styles.css',
  SCOPE + 'store.js',
  SCOPE + 'charts.js',
  SCOPE + 'views.js',
  SCOPE + 'screens.js',
  SCOPE + 'app.js',
  SCOPE + 'manifest.json',
  SCOPE + 'icon-192.png',
  SCOPE + 'icon-512.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll is all-or-nothing, so cache one by one and tolerate misses
      .then(cache => Promise.all(CORE.map(url =>
        cache.add(new Request(url, { cache: 'reload' })).catch(() => {}),
      )))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigations: serve the cached shell instantly, refresh it in the background.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(SCOPE + 'index.html').then(cached => {
        const network = fetch(request)
          .then(response => {
            if (response && response.ok) {
              caches.open(CACHE).then(c => c.put(SCOPE + 'index.html', response.clone()))
            }
            return response
          })
          .catch(() => cached)
        return cached || network
      }),
    )
    return
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.ok && response.type === 'basic') {
            caches.open(CACHE).then(c => c.put(request, response.clone()))
          }
          return response
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting()
})
