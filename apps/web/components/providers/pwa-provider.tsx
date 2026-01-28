'use client';

/**
 * PWA Provider
 *
 * Initializes service worker and provides PWA context to the app.
 */

import { createContext, useContext, ReactNode } from 'react';
import { useServiceWorker } from '../../hooks/useServiceWorker';

interface PWAContextValue {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
  update: () => void;
}

const PWAContext = createContext<PWAContextValue | null>(null);

export function PWAProvider({ children }: { children: ReactNode }) {
  const sw = useServiceWorker();

  return (
    <PWAContext.Provider value={sw}>
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA(): PWAContextValue {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}

export default PWAProvider;
