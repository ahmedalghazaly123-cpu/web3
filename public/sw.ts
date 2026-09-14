/// <reference lib="webworker" />

const CACHE_NAME = 'learnpilot-v1';
const OFFLINE_URL = '/offline.html';
const API_BASE = '/api/v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/favicon.svg',
        '/src/styles/index.css',
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
          return undefined;
        }),
      );
      await self.clients.claim();
    })(),
  );
});

const OFFLINE_QUEUE: Array<{ url: string; method: string; body: any; timestamp: number }> = [];

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith(API_BASE)) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request.clone());
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) return cachedResponse;

          if (event.request.method === 'POST' || event.request.method === 'PUT' || event.request.method === 'DELETE') {
            const body = await event.request.clone().json().catch(() => null);
            if (body) {
              OFFLINE_QUEUE.push({
                url: event.request.url,
                method: event.request.method,
                body,
                timestamp: Date.now(),
              });
              localStorage.setItem('lp-offline-queue', JSON.stringify(OFFLINE_QUEUE));
            }
          }

          return new Response(JSON.stringify({ error: 'offline', queued: true }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })(),
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match('/');
          return (await fetch(event.request)) || cachedResponse;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return await cache.match('/') || await cache.match(OFFLINE_URL);
        }
      })(),
    );
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => caches.match('/')),
  );
});

declare const self: ServiceWorkerGlobalScope;
