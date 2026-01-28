'use client';

/**
 * Network Status Hook
 *
 * Tracks online/offline status and pending sync state.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  subscribeSyncState,
  initSync,
  setupSyncListeners,
  syncMutations,
} from '../lib/offline';

interface NetworkStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  syncError: string | null;
  sync: () => Promise<void>;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    // Set initial online state
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize offline sync
    initSync();

    // Setup sync listeners
    const cleanupSyncListeners = setupSyncListeners();

    // Subscribe to sync state changes
    const unsubscribe = subscribeSyncState((state) => {
      setIsSyncing(state.status === 'syncing');
      setPendingCount(state.pendingCount);
      setLastSyncAt(state.lastSyncAt ? new Date(state.lastSyncAt) : null);
      setSyncError(state.error);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanupSyncListeners();
      unsubscribe();
    };
  }, []);

  const sync = useCallback(async () => {
    await syncMutations();
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncAt,
    syncError,
    sync,
  };
}

export default useNetworkStatus;
