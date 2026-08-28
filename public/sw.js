/* Mineazy ERP offline service worker
 * - Precache the app shell routes
 * - API GETs: network-first with cache fallback (stale-while-revalidate)
 * - Navigations: network-first with cached page fallback (works offline)
 * - Static assets (/_next/static etc.): cache-first with background revalidate
 * - Non-GET requests pass through untouched; the app's IndexedDB outbox
 *   queues mutations made while offline.
 */
const VERSION = 'v1';

const CACHES = {
  shell: `mineazy-shell-${VERSION}`,
  api: `mineazy-api-${VERSION}`,
  pages: `mineazy-pages-${VERSION}`,
};

const SHELL_ASSETS = ['/', '/login', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHES.shell)
      .then((cache) =>
        Promise.allSettled(
          SHELL_ASSETS.map((url) =>
            fetch(url, { credentials: 'same-origin' })
              .then((res) => {
                if (res && res.ok) cache.put(url, res.clone());
              })
              .catch(() => {})
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !Object.values(CACHES).includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const isSameOrigin = (url) => new URL(url).origin === self.location.origin;

async function networkFirst(request, cacheName, event) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const copy = res.clone();
      const cache = await caches.open(cacheName);
      cache.put(request, copy);
    }
    return res;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
}

async function cacheFirst(request, cacheName, event) {
  const cached = await caches.match(request);
  if (cached) {
    event.waitUntil(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(cacheName).then((cache) => cache.put(request, copy));
          }
        })
        .catch(() => {})
    );
    return cached;
  }
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const copy = res.clone();
      const cache = await caches.open(cacheName);
      cache.put(request, copy);
    }
    return res;
  } catch (err) {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!isSameOrigin(request.url)) return;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, CACHES.api, event));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, CACHES.pages, event));
    return;
  }

  event.respondWith(cacheFirst(request, CACHES.shell, event));
});