'use client';

/**
 * Push Notifications Hook
 *
 * Manages push notification subscription and preferences.
 */

import { useState, useEffect, useCallback } from 'react';

interface NotificationPreferences {
  incomingCall: boolean;
  missedCall: boolean;
  newMessage: boolean;
  jobAssigned: boolean;
  jobUpdated: boolean;
  appointmentReminder: boolean;
  paymentReceived: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  preferences: NotificationPreferences | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  sendTestNotification: () => Promise<boolean>;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  incomingCall: true,
  missedCall: true,
  newMessage: true,
  jobAssigned: true,
  jobUpdated: true,
  appointmentReminder: true,
  paymentReceived: true,
  quietHoursStart: null,
  quietHoursEnd: null,
};

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  // Check support and fetch initial state
  useEffect(() => {
    async function init() {
      // Check browser support
      const supported =
        typeof window !== 'undefined' &&
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;

      setIsSupported(supported);

      if (!supported) {
        setPermission('unsupported');
        setIsLoading(false);
        return;
      }

      // Get current permission
      setPermission(Notification.permission);

      // Fetch VAPID key
      try {
        const keyRes = await fetch('/api/push/vapid-public-key');
        if (keyRes.ok) {
          const keyData = await keyRes.json();
          setVapidKey(keyData.data.publicKey);
        }
      } catch (err) {
        console.error('Failed to fetch VAPID key:', err);
      }

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('Failed to check subscription:', err);
      }

      // Fetch preferences
      try {
        const prefsRes = await fetch('/api/push/preferences');
        if (prefsRes.ok) {
          const prefsData = await prefsRes.json();
          setPreferences(prefsData.data);
        }
      } catch (err) {
        console.error('Failed to fetch preferences:', err);
        setPreferences(DEFAULT_PREFERENCES);
      }

      setIsLoading(false);
    }

    init();
  }, []);

  // Convert base64 VAPID key to Uint8Array
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !vapidKey) {
      setError('Push notifications not supported or configured');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission if needed
      if (Notification.permission !== 'granted') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') {
          setError('Notification permission denied');
          setIsLoading(false);
          return false;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      // Send subscription to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(
              String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))
            ),
            auth: btoa(
              String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))
            ),
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to register subscription on server');
      }

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Subscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      setIsLoading(false);
      return false;
    }
  }, [isSupported, vapidKey]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe on server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // Unsubscribe locally
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  // Update preferences
  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/push/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          throw new Error('Failed to update preferences');
        }

        const data = await res.json();
        setPreferences(data.data);
      } catch (err) {
        console.error('Update preferences error:', err);
        setError(err instanceof Error ? err.message : 'Failed to update preferences');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Send test notification
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to send test notification');
      }

      return true;
    } catch (err) {
      console.error('Test notification error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send test notification');
      return false;
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    preferences,
    subscribe,
    unsubscribe,
    updatePreferences,
    sendTestNotification,
  };
}

export default usePushNotifications;
