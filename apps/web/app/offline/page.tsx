'use client';

/**
 * Offline Page
 *
 * Displayed when the user is offline and the requested page isn't cached.
 */

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Auto-reload when back online
    if (isOnline) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100">
            <WifiOff className="w-10 h-10 text-gray-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          You&apos;re offline
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-8">
          {isOnline
            ? 'Connection restored! Reloading...'
            : 'Check your internet connection and try again.'}
        </p>

        {/* Status indicator */}
        {isOnline ? (
          <div className="flex items-center justify-center gap-2 text-green-600 mb-6">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">Back online</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-6">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-sm">Waiting for connection...</span>
          </div>
        )}

        {/* Retry button */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>

        {/* Offline tips */}
        <div className="mt-12 text-left bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-900 mb-3">
            While you&apos;re offline, you can still:
          </h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              View today&apos;s jobs that were loaded earlier
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              Add notes to jobs (they&apos;ll sync when online)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              Take photos for job documentation
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
