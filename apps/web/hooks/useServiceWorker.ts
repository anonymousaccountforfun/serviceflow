'use client';

/**
 * Service Worker Hook
 *
 * React hook for managing service worker registration and updates.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  registerServiceWorker,
  skipWaiting,
  isServiceWorkerSupported,
  onServiceWorkerMessage,
} from '../lib/sw-registration';

interface UseServiceWorkerReturn {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
  update: () => void;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [isSupported] = useState(() => isServiceWorkerSupported());
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Set initial online state
    setIsOnline(navigator.onLine);

    // Register service worker
    registerServiceWorker({
      onSuccess: (reg) => {
        setIsRegistered(true);
        setRegistration(reg);
      },
      onUpdate: (reg) => {
        setHasUpdate(true);
        setRegistration(reg);
      },
      onOnline: () => setIsOnline(true),
      onOffline: () => setIsOnline(false),
    });

    // Listen for SW messages
    const unsubscribe = onServiceWorkerMessage((data) => {
      if (data.type === 'SYNC_COMPLETE') {
        // Trigger data refresh
        window.dispatchEvent(new CustomEvent('sw-sync-complete'));
      }
      if (data.type === 'NOTIFICATION_CLICK') {
        // Navigate to the URL
        window.location.href = data.url;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const update = useCallback(() => {
    skipWaiting();
    setHasUpdate(false);
    // Reload to activate new SW
    window.location.reload();
  }, []);

  return {
    isSupported,
    isRegistered,
    isOnline,
    hasUpdate,
    registration,
    update,
  };
}

export default useServiceWorker;
