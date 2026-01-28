/**
 * ServiceFlow Service Worker
 *
 * Handles:
 * - Caching static assets for offline use
 * - Network-first strategy for API calls
 * - Cache-first strategy for static resources
 * - Offline fallback page
 * - Background sync for offline mutations
 */

const CACHE_NAME = 'serviceflow-v1';
const OFFLINE_URL = '/offline';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/analytics',
  '/api/jobs',
  '/api/customers',
];

// ============================================
// INSTALL EVENT
// ============================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Cache static assets
      await cache.addAll(STATIC_ASSETS);

      // Force the waiting service worker to become active
      await self.skipWaiting();

      console.log('[SW] Service worker installed');
    })()
  );
});

// ============================================
// ACTIVATE EVENT
// ============================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );

      // Take control of all clients immediately
      await self.clients.claim();

      console.log('[SW] Service worker activated');
    })()
  );
});

// ============================================
// FETCH EVENT
// ============================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(cacheFirst(request));
});

/**
 * Network-first strategy
 * Try network, fall back to cache, then offline response
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline JSON for API requests
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'OFFLINE', message: 'You are offline' },
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Cache-first strategy
 * Try cache, fall back to network
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetchAndCache(request, cache);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return a basic offline response for assets
    return new Response('', { status: 408 });
  }
}

/**
 * Navigation handler
 * Try network, fall back to offline page
 */
async function navigationHandler(request) {
  try {
    // Try to preload the page
    const preloadResponse = await event.preloadResponse;
    if (preloadResponse) {
      return preloadResponse;
    }

    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Network failed, show offline page
    const cache = await caches.open(CACHE_NAME);
    const offlineResponse = await cache.match(OFFLINE_URL);

    if (offlineResponse) {
      return offlineResponse;
    }

    // Fallback HTML if offline page not cached
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - ServiceFlow</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              background: #f9fafb;
              color: #111827;
              text-align: center;
            }
            h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
            p { color: #6b7280; margin-bottom: 1.5rem; }
            button {
              background: #2563eb;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 1rem;
              cursor: pointer;
            }
            button:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <h1>You're offline</h1>
          <p>Check your connection and try again.</p>
          <button onclick="location.reload()">Retry</button>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

/**
 * Fetch and update cache in background
 */
async function fetchAndCache(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Silent fail for background updates
  }
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'ServiceFlow',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (error) {
    console.error('[SW] Failed to parse push data', error);
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ============================================
// NOTIFICATION CLICK
// ============================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked', event.notification.tag);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Try to focus an existing window
      for (const client of allClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          await client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: urlToOpen,
          });
          return;
        }
      }

      // Open a new window if none exists
      if (self.clients.openWindow) {
        await self.clients.openWindow(urlToOpen);
      }
    })()
  );
});

// ============================================
// BACKGROUND SYNC
// ============================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync', event.tag);

  if (event.tag === 'sync-offline-mutations') {
    event.waitUntil(syncOfflineMutations());
  }
});

/**
 * Sync offline mutations when back online
 */
async function syncOfflineMutations() {
  // This will be implemented with IndexedDB queue
  // For now, just notify clients to retry
  const allClients = await self.clients.matchAll();
  for (const client of allClients) {
    client.postMessage({
      type: 'SYNC_COMPLETE',
    });
  }
}

// ============================================
// MESSAGE HANDLER
// ============================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received', event.data);

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CACHE_URLS') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(event.data.urls);
      })()
    );
  }
});

console.log('[SW] Service worker loaded');
