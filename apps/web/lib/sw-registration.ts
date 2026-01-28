/**
 * Service Worker Registration
 *
 * Handles registering and updating the service worker for PWA functionality.
 */

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(config?: ServiceWorkerConfig) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return null;
  }

  // Only register in production or if explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_ENABLE_SW) {
    console.log('[SW] Service worker disabled in development');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Service worker registered', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New update available
            console.log('[SW] New content available');
            config?.onUpdate?.(registration);
          } else {
            // Content cached for offline use
            console.log('[SW] Content cached for offline');
            config?.onSuccess?.(registration);
          }
        }
      });
    });

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed');
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('[SW] Back online');
      config?.onOnline?.();
    });

    window.addEventListener('offline', () => {
      console.log('[SW] Gone offline');
      config?.onOffline?.();
    });

    return registration;
  } catch (error) {
    console.error('[SW] Service worker registration failed', error);
    return null;
  }
}

/**
 * Unregister all service workers
 */
export async function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    console.log('[SW] Service worker unregistered', success);
    return success;
  } catch (error) {
    console.error('[SW] Service worker unregistration failed', error);
    return false;
  }
}

/**
 * Skip waiting and activate new service worker immediately
 */
export async function skipWaiting() {
  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Check if service worker is supported and registered
 */
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Get the current service worker registration
 */
export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    return null;
  }
}

/**
 * Request background sync
 */
export async function requestBackgroundSync(tag: string = 'sync-offline-mutations') {
  const registration = await getRegistration();
  if (registration && 'sync' in registration) {
    try {
      await (registration as any).sync.register(tag);
      console.log('[SW] Background sync registered', tag);
      return true;
    } catch (error) {
      console.error('[SW] Background sync failed', error);
      return false;
    }
  }
  return false;
}

/**
 * Listen for messages from the service worker
 */
export function onServiceWorkerMessage(
  callback: (data: any) => void
): () => void {
  if (!isServiceWorkerSupported()) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    callback(event.data);
  };

  navigator.serviceWorker.addEventListener('message', handler);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}

/**
 * Send a message to the service worker
 */
export async function sendMessageToSW(message: any) {
  const registration = await getRegistration();
  if (registration?.active) {
    registration.active.postMessage(message);
  }
}
