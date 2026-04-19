// MoesMan Service Worker
// Estrategias:
//   - App shell (same-origin HTML/JS/CSS): stale-while-revalidate
//   - Portadas MangaDex (uploads.mangadex.org): cache-first, LRU 300
//   - Páginas de capítulos (cualquier *.mangadex.network): cache-first, LRU 500
//   - API proxy (/api/*): network-first con fallback cache (SWR)
//   - Fallback offline: /offline.html para navegaciones fallidas

const SW_VERSION = 'moesman-v3';
const SHELL_CACHE = `shell-${SW_VERSION}`;
const COVERS_CACHE = `covers-${SW_VERSION}`;
const PAGES_CACHE = `pages-${SW_VERSION}`;
const API_CACHE = `api-${SW_VERSION}`;

const APP_SHELL = ['/', '/offline.html', '/manifest.webmanifest', '/icon.svg', '/placeholder-cover.svg'];

const COVERS_MAX = 300;
const PAGES_MAX = 500;
const API_MAX = 200;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.endsWith(SW_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  const toDelete = keys.length - maxItems;
  for (let i = 0; i < toDelete; i++) await cache.delete(keys[i]);
}

async function cacheFirst(req, cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    cache.put(req, res.clone()).then(() => trimCache(cacheName, maxItems));
  }
  return res;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fetchPromise;
}

async function networkFirstApi(req) {
  const cache = await caches.open(API_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) {
      cache.put(req, res.clone()).then(() => trimCache(API_CACHE, API_MAX));
    }
    return res;
  } catch (e) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw e;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Covers + imágenes de MangaDex
  if (url.hostname === 'uploads.mangadex.org') {
    event.respondWith(cacheFirst(req, COVERS_CACHE, COVERS_MAX));
    return;
  }
  // Páginas de capítulo (dominios MD@Home suelen ser *.mangadex.network / .org)
  if (url.hostname.endsWith('.mangadex.network') || url.hostname.endsWith('mangadex.org')) {
    event.respondWith(cacheFirst(req, PAGES_CACHE, PAGES_MAX));
    return;
  }

  if (!isSameOrigin) return;

  // Proxy de imágenes /api/img: cache-first (LRU covers cache)
  if (url.pathname === '/api/img') {
    event.respondWith(cacheFirst(req, COVERS_CACHE, COVERS_MAX + PAGES_MAX));
    return;
  }

  // Proxy API local (Astro): network-first con fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(req));
    return;
  }

  // Navegaciones (HTML): network-first con fallback offline
  // (SWR servía HTML viejo cacheado al romper algo)
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && !url.pathname.startsWith('/read/')) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const hit = await cache.match(req);
          if (hit) return hit;
          const offline = await cache.match('/offline.html');
          return offline ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Assets estáticos de Astro (_astro/*)
  if (url.pathname.startsWith('/_astro/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(req, SHELL_CACHE, 200));
    return;
  }

  // Default: SWR
  event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
});

// Mensajes: SKIP_WAITING + PRECACHE_CHAPTER (descarga offline)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data && event.data.type === 'PRECACHE_CHAPTER') {
    const { urls, chapterId } = event.data;
    event.waitUntil(precacheChapter(urls, chapterId, event.source));
  }
});

async function precacheChapter(urls, chapterId, client) {
  const cache = await caches.open(PAGES_CACHE);
  let done = 0;
  const total = urls.length;
  for (const u of urls) {
    try {
      const existing = await cache.match(u);
      if (!existing) {
        const res = await fetch(u);
        if (res.ok) await cache.put(u, res.clone());
      }
    } catch (e) {
      // ignorar fallos individuales
    }
    done++;
    if (client && client.postMessage) {
      client.postMessage({
        type: 'PRECACHE_PROGRESS',
        chapterId,
        done,
        total,
      });
    }
  }
  if (client && client.postMessage) {
    client.postMessage({ type: 'PRECACHE_DONE', chapterId, total });
  }
}
