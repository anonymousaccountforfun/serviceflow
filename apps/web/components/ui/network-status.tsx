'use client';

/**
 * Network Status Indicator
 *
 * Shows offline banner and sync status.
 */

import { WifiOff, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function NetworkStatusBanner() {
  const { isOnline, isSyncing, pendingCount, syncError, sync } = useNetworkStatus();

  // Don't show anything if online and no pending items
  if (isOnline && pendingCount === 0 && !syncError) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between text-sm ${
        isOnline
          ? syncError
            ? 'bg-amber-50 text-amber-800 border-t border-amber-200'
            : 'bg-blue-50 text-blue-800 border-t border-blue-200'
          : 'bg-gray-900 text-white'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You&apos;re offline</span>
            {pendingCount > 0 && (
              <span className="text-gray-400">
                &middot; {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending
              </span>
            )}
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Syncing changes...</span>
          </>
        ) : syncError ? (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>{syncError}</span>
          </>
        ) : (
          <>
            <Cloud className="w-4 h-4" />
            <span>
              {pendingCount} change{pendingCount !== 1 ? 's' : ''} waiting to sync
            </span>
          </>
        )}
      </div>

      {isOnline && pendingCount > 0 && !isSyncing && (
        <button
          onClick={sync}
          className="flex items-center gap-1 px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Sync Now
        </button>
      )}
    </div>
  );
}

export function NetworkStatusBadge() {
  const { isOnline, isSyncing, pendingCount } = useNetworkStatus();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        !isOnline
          ? 'bg-gray-100 text-gray-700'
          : isSyncing
          ? 'bg-blue-100 text-blue-700'
          : 'bg-amber-100 text-amber-700'
      }`}
    >
      {!isOnline ? (
        <>
          <CloudOff className="w-3 h-3" />
          Offline
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-3 h-3 animate-spin" />
          Syncing
        </>
      ) : (
        <>
          <Cloud className="w-3 h-3" />
          {pendingCount} pending
        </>
      )}
    </div>
  );
}

export function SyncSuccessToast() {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle className="w-4 h-4 text-green-500" />
      <span>Changes synced successfully</span>
    </div>
  );
}

export default NetworkStatusBanner;
