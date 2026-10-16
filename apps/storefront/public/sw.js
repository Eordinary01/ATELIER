const STATIC_CACHE = 'atelier-static-v3';
const IMAGE_CACHE = 'atelier-images-v3';
const DATA_CACHE = 'atelier-data-v3';

// Minimalist architectural fallback for missing images when completely offline
const OFFLINE_IMAGE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" fill="#FAF9F6">
  <rect width="600" height="800" fill="#F3F1EC"/>
  <rect x="20" y="20" width="560" height="760" fill="none" stroke="#E5E3DC" stroke-width="1"/>
  <text x="50%" y="48%" font-family="monospace" font-size="12" fill="#767872" text-anchor="middle" letter-spacing="2">ATELIER</text>
  <text x="50%" y="52%" font-family="monospace" font-size="10" fill="#A0A29C" text-anchor="middle" letter-spacing="1">ARCHIVAL SILHOUETTE</text>
</svg>
`.trim();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== IMAGE_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Next.js Static JS & CSS Chunks (/_next/static/*) -> Cache-First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res && res.status === 200) {
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          // If offline and not in cache, fallback
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // 2. Images (Unsplash, local media) -> Cache-First with SVG Fallback
  const isImage =
    request.destination === 'image' ||
    url.hostname.includes('unsplash.com') ||
    /\.(jpg|jpeg|png|webp|avif|svg)($|\?)/i.test(url.pathname);

  if (isImage && request.method === 'GET') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return new Response(OFFLINE_IMAGE_SVG, {
            headers: { 'Content-Type': 'image/svg+xml' },
          });
        }
      })
    );
    return;
  }

  // 3. Next.js RSC Flight Requests & API Requests -> Stale-While-Revalidate
  const isRsc = url.searchParams.has('_rsc') || request.headers.get('RSC') === '1';
  const isApi = url.pathname.startsWith('/api/');

  if ((isRsc || isApi) && request.method === 'GET') {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);

        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cached || null);

        // Return cached immediately if available, else await network
        if (cached) {
          fetchPromise.catch(() => {});
          return cached;
        }

        const res = await fetchPromise;
        if (res) return res;

        // Offline fallback for RSC
        return new Response(JSON.stringify({ error: 'offline' }), {
          status: 200,
          headers: { 'Content-Type': 'text/x-component' },
        });
      })
    );
    return;
  }

  // 4. HTML Page Navigation (request.mode === 'navigate') -> Network-First with Cache Fallback
  if (request.mode === 'navigate' && request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(STATIC_CACHE);
          // 1. Try exact requested page
          const cachedPage = await cache.match(request);
          if (cachedPage) return cachedPage;

          // 2. Try root page shell
          const rootShell = await cache.match('/');
          if (rootShell) return rootShell;

          // 3. Try catalog page shell
          const catalogShell = await cache.match('/catalog');
          if (catalogShell) return catalogShell;

          return new Response('<!DOCTYPE html><html><body><script>window.location.href="/";</script></body></html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          });
        })
    );
    return;
  }
});
