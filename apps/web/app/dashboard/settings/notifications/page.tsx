'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Bell,
  MessageSquare,
  Mail,
  Phone,
  Calendar,
  Star,
  DollarSign,
  AlertTriangle,
  Moon,
  Check,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthContext } from '../../../../lib/auth/context';

interface NotificationPreferences {
  channels: {
    push: boolean;
    sms: boolean;
    email: boolean;
  };
  events: {
    missedCalls: { push: boolean; sms: boolean; email: boolean };
    newMessages: { push: boolean; sms: boolean; email: boolean };
    appointments: { push: boolean; sms: boolean; email: boolean };
    reviews: { push: boolean; sms: boolean; email: boolean };
    payments: { push: boolean; sms: boolean; email: boolean };
    emergency: { push: boolean; sms: boolean; email: boolean };
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  channels: {
    push: true,
    sms: true,
    email: true,
  },
  events: {
    missedCalls: { push: true, sms: true, email: false },
    newMessages: { push: true, sms: false, email: false },
    appointments: { push: true, sms: true, email: false },
    reviews: { push: true, sms: false, email: true },
    payments: { push: true, sms: false, email: true },
    emergency: { push: true, sms: true, email: true },
  },
  quietHours: {
    enabled: false,
    start: '21:00',
    end: '07:00',
  },
};

const EVENT_CONFIG = [
  { key: 'missedCalls', label: 'Missed calls', icon: Phone },
  { key: 'newMessages', label: 'New messages', icon: MessageSquare },
  { key: 'appointments', label: 'Appointment reminders', icon: Calendar },
  { key: 'reviews', label: 'New reviews', icon: Star },
  { key: 'payments', label: 'Payments received', icon: DollarSign },
  { key: 'emergency', label: 'Emergency requests', icon: AlertTriangle, alwaysOn: true },
];

// Toggle switch component
function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`
        w-11 h-6 rounded-full transition-all relative flex-shrink-0
        ${enabled ? 'bg-accent' : 'bg-white/20'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div
        className={`
          w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all
          ${enabled ? 'left-5' : 'left-0.5'}
        `}
      />
    </button>
  );
}

// Checkbox for event matrix
function MatrixCheckbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        w-6 h-6 rounded flex items-center justify-center transition-all
        ${checked ? 'bg-accent text-white' : 'bg-white/10 text-transparent'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20'}
      `}
    >
      <Check className="w-4 h-4" />
    </button>
  );
}

export default function NotificationsSettingsPage() {
  const { organization, user, isLoading, refetch } = useAuthContext();
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Initialize preferences from user settings or defaults
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    if (user) {
      // Would load from user's notification settings
      // For now, use defaults
    }
  }, [user]);

  const savePreferences = async (newPrefs: NotificationPreferences) => {
    setIsSaving(true);
    try {
      await fetch('/api/users/me/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs),
      });
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save notifications:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateChannel = (channel: keyof NotificationPreferences['channels'], value: boolean) => {
    const newPrefs = {
      ...preferences,
      channels: { ...preferences.channels, [channel]: value },
    };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  const updateEvent = (
    event: keyof NotificationPreferences['events'],
    channel: 'push' | 'sms' | 'email',
    value: boolean
  ) => {
    const newPrefs = {
      ...preferences,
      events: {
        ...preferences.events,
        [event]: { ...preferences.events[event], [channel]: value },
      },
    };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  const updateQuietHours = (updates: Partial<NotificationPreferences['quietHours']>) => {
    const newPrefs = {
      ...preferences,
      quietHours: { ...preferences.quietHours, ...updates },
    };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings" className="p-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
        </div>
        <div className="max-w-2xl space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface rounded-xl p-5 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/settings"
          className="p-2 hover:bg-white/10 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        {isSaving && <Loader2 className="w-5 h-5 text-accent animate-spin" />}
        {showSaved && (
          <span className="text-green-400 text-sm flex items-center gap-1">
            <Check className="w-4 h-4" /> Saved
          </span>
        )}
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Channels Section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Channels
          </h2>
          <p className="text-gray-400 text-sm mb-4">How do you want to be notified?</p>
          <div className="bg-surface rounded-xl divide-y divide-white/10">
            {/* Push */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white font-medium">Push Notifications</p>
                  <p className="text-sm text-gray-500">Alerts on your phone</p>
                </div>
              </div>
              <Toggle
                enabled={preferences.channels.push}
                onChange={(v) => updateChannel('push', v)}
              />
            </div>

            {/* SMS */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white font-medium">SMS</p>
                  <p className="text-sm text-gray-500">Text messages to your phone</p>
                </div>
              </div>
              <Toggle
                enabled={preferences.channels.sms}
                onChange={(v) => updateChannel('sms', v)}
              />
            </div>

            {/* Email */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white font-medium">Email</p>
                  <p className="text-sm text-gray-500">
                    Emails to {user?.email || 'your email'}
                  </p>
                </div>
              </div>
              <Toggle
                enabled={preferences.channels.email}
                onChange={(v) => updateChannel('email', v)}
              />
            </div>
          </div>
        </section>

        {/* Events Matrix Section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Events
          </h2>
          <p className="text-gray-400 text-sm mb-4">What do you want to know about?</p>
          <div className="bg-surface rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="flex items-center px-4 py-3 border-b border-white/10 bg-white/5">
              <div className="flex-1" />
              <div className="flex items-center gap-6">
                <div className="w-6 text-center">
                  <Bell className="w-4 h-4 text-gray-500 mx-auto" />
                </div>
                <div className="w-6 text-center">
                  <MessageSquare className="w-4 h-4 text-gray-500 mx-auto" />
                </div>
                <div className="w-6 text-center">
                  <Mail className="w-4 h-4 text-gray-500 mx-auto" />
                </div>
              </div>
            </div>

            {/* Event rows */}
            {EVENT_CONFIG.map(({ key, label, icon: Icon, alwaysOn }) => {
              const eventKey = key as keyof NotificationPreferences['events'];
              const eventPrefs = preferences.events[eventKey];

              return (
                <div
                  key={key}
                  className="flex items-center px-4 py-3 border-b border-white/10 last:border-b-0"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className={`w-4 h-4 ${alwaysOn ? 'text-amber-400' : 'text-gray-500'}`} />
                    <span className="text-white text-sm">{label}</span>
                    {alwaysOn && (
                      <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                        Always on
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-6">
                    <MatrixCheckbox
                      checked={eventPrefs.push}
                      onChange={(v) => updateEvent(eventKey, 'push', v)}
                      disabled={alwaysOn || !preferences.channels.push}
                    />
                    <MatrixCheckbox
                      checked={eventPrefs.sms}
                      onChange={(v) => updateEvent(eventKey, 'sms', v)}
                      disabled={alwaysOn || !preferences.channels.sms}
                    />
                    <MatrixCheckbox
                      checked={eventPrefs.email}
                      onChange={(v) => updateEvent(eventKey, 'email', v)}
                      disabled={alwaysOn || !preferences.channels.email}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quiet Hours Section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Quiet Hours
          </h2>
          <div className="bg-surface rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white font-medium">Do Not Disturb</p>
                  <p className="text-sm text-gray-500">Silence non-emergency notifications</p>
                </div>
              </div>
              <Toggle
                enabled={preferences.quietHours.enabled}
                onChange={(v) => updateQuietHours({ enabled: v })}
              />
            </div>

            {preferences.quietHours.enabled && (
              <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                <span className="text-gray-400 text-sm">From</span>
                <input
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={(e) => updateQuietHours({ start: e.target.value })}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={(e) => updateQuietHours({ end: e.target.value })}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                />
              </div>
            )}

            <div className="flex items-center gap-2 mt-4 text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Emergency calls always come through</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
