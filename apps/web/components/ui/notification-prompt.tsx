'use client';

/**
 * Notification Prompt Component
 *
 * Prompts users to enable push notifications.
 */

import { useState, useEffect } from 'react';
import { Bell, BellOff, X, Check } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

interface NotificationPromptProps {
  onClose?: () => void;
  showPreferences?: boolean;
}

export function NotificationPrompt({ onClose, showPreferences = false }: NotificationPromptProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const [dismissed, setDismissed] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // Check if we should show the prompt
  useEffect(() => {
    const wasDismissed = localStorage.getItem('notification-prompt-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  // Don't show if not supported, already subscribed, or dismissed
  if (!isSupported || isSubscribed || dismissed || permission === 'denied') {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem('notification-prompt-dismissed', 'true');
    setDismissed(true);
    onClose?.();
  };

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      onClose?.();
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1">Enable Notifications</h3>
          <p className="text-blue-100 text-sm mb-4">
            Get instant alerts for new jobs, calls, and messages even when the app is closed.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-white/80 hover:text-white transition-colors"
            >
              Not now
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-200">{error}</p>}
        </div>
        <button
          onClick={handleDismiss}
          className="text-white/60 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export function NotificationSettings() {
  const {
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
  } = usePushNotifications();

  const [testSent, setTestSent] = useState(false);

  if (!isSupported) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg text-gray-600 text-sm">
        Push notifications are not supported in this browser.
      </div>
    );
  }

  const handleTest = async () => {
    const success = await sendTestNotification();
    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subscription status */}
      <div className="flex items-center justify-between p-4 bg-navy-800 rounded-lg">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="w-5 h-5 text-green-400" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <p className="text-white font-medium">
              {isSubscribed ? 'Notifications enabled' : 'Notifications disabled'}
            </p>
            <p className="text-gray-400 text-sm">
              {permission === 'denied'
                ? 'Permission denied in browser settings'
                : isSubscribed
                ? 'You will receive push notifications'
                : 'Enable to receive instant alerts'}
            </p>
          </div>
        </div>
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading || permission === 'denied'}
          className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
            isSubscribed
              ? 'bg-gray-700 text-white hover:bg-gray-600'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? '...' : isSubscribed ? 'Disable' : 'Enable'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Notification preferences */}
      {isSubscribed && preferences && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Notification Types</h3>

          <div className="space-y-2">
            {[
              { key: 'incomingCall', label: 'Incoming calls' },
              { key: 'missedCall', label: 'Missed calls' },
              { key: 'newMessage', label: 'New messages' },
              { key: 'jobAssigned', label: 'Jobs assigned to you' },
              { key: 'jobUpdated', label: 'Job updates' },
              { key: 'appointmentReminder', label: 'Appointment reminders' },
              { key: 'paymentReceived', label: 'Payment received' },
            ].map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center justify-between p-3 bg-navy-800 rounded-lg cursor-pointer"
              >
                <span className="text-white">{label}</span>
                <input
                  type="checkbox"
                  checked={(preferences as any)[key]}
                  onChange={(e) => updatePreferences({ [key]: e.target.checked })}
                  className="w-5 h-5 rounded border-navy-600 text-blue-600 focus:ring-blue-500"
                />
              </label>
            ))}
          </div>

          {/* Test notification */}
          <div className="pt-4 border-t border-navy-700">
            <button
              onClick={handleTest}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-navy-700 text-white rounded-lg hover:bg-navy-600 transition-colors disabled:opacity-50"
            >
              {testSent ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  Test sent!
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Send test notification
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationPrompt;
