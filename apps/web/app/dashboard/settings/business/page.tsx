'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Loader2,
  Wrench,
  Flame,
  Zap,
  Home,
  Bot,
  Volume2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthContext } from '../../../../lib/auth/context';

// Service type options
const SERVICE_TYPES = [
  { value: 'plumber', label: 'Plumber', icon: Wrench },
  { value: 'hvac', label: 'HVAC', icon: Flame },
  { value: 'electrician', label: 'Electrician', icon: Zap },
  { value: 'other', label: 'Other', icon: Home },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type BusinessHours = { [key: string]: { open: string | null; close: string | null } };

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`}>
      {type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      {message}
    </div>
  );
}

// Editable field with auto-save
function EditableField({
  label,
  value,
  onSave,
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
}) {
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Update local value when prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    if (editValue === value) return;

    setIsSaving(true);
    try {
      await onSave(editValue);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      setEditValue(value); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="py-4 border-b border-white/10 last:border-b-0">
      <label className="text-sm text-gray-500 block mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white border-b border-white/20 focus:border-accent focus:outline-none py-1 transition-colors"
        />
        {isSaving && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
        {showSaved && <span className="text-green-400 text-sm">Saved</span>}
      </div>
    </div>
  );
}

// Service type selector
function ServiceTypeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="py-4 border-b border-white/10">
      <label className="text-sm text-gray-500 block mb-3">Service Type</label>
      <div className="grid grid-cols-2 gap-2">
        {SERVICE_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = value === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange(type.value)}
              className={`
                flex items-center gap-2 p-3 rounded-lg border transition-all text-left
                ${isSelected
                  ? 'bg-accent/20 border-accent text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Business hours editor
function BusinessHoursEditor({
  hours,
  onChange,
}: {
  hours: BusinessHours;
  onChange: (hours: BusinessHours) => void;
}) {
  const setPreset = (preset: 'weekdays' | 'everyday') => {
    const newData: BusinessHours = {};
    DAYS.forEach((day) => {
      const key = day.toLowerCase();
      if (preset === 'weekdays') {
        const isWeekday = !['Saturday', 'Sunday'].includes(day);
        newData[key] = isWeekday
          ? { open: '08:00', close: '17:00' }
          : { open: null, close: null };
      } else {
        newData[key] = { open: '08:00', close: '18:00' };
      }
    });
    onChange(newData);
  };

  const toggleDay = (day: string) => {
    const key = day.toLowerCase();
    const current = hours[key];
    if (current?.open) {
      onChange({ ...hours, [key]: { open: null, close: null } });
    } else {
      onChange({ ...hours, [key]: { open: '08:00', close: '17:00' } });
    }
  };

  const updateTime = (day: string, field: 'open' | 'close', value: string) => {
    const key = day.toLowerCase();
    onChange({
      ...hours,
      [key]: { ...hours[key], [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPreset('weekdays')}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:border-white/20 text-sm"
        >
          Mon-Fri 8-5
        </button>
        <button
          type="button"
          onClick={() => setPreset('everyday')}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:border-white/20 text-sm"
        >
          7 Days 8-6
        </button>
      </div>

      {/* Days */}
      <div className="space-y-2">
        {DAYS.map((day) => {
          const key = day.toLowerCase();
          const dayHours = hours[key] || { open: null, close: null };
          const isOpen = dayHours.open !== null;

          return (
            <div key={day} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
              <button
                type="button"
                onClick={() => toggleDay(day)}
                className={`
                  w-6 h-6 rounded flex items-center justify-center transition-all flex-shrink-0
                  ${isOpen ? 'bg-accent text-white' : 'bg-white/10 text-gray-500'}
                `}
              >
                {isOpen && <Check className="w-4 h-4" />}
              </button>

              <span className="w-20 text-gray-300 text-sm font-medium">{day.slice(0, 3)}</span>

              {isOpen ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={dayHours.open || '08:00'}
                    onChange={(e) => updateTime(day, 'open', e.target.value)}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm w-24"
                  />
                  <span className="text-gray-500 text-sm">-</span>
                  <input
                    type="time"
                    value={dayHours.close || '17:00'}
                    onChange={(e) => updateTime(day, 'close', e.target.value)}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm w-24"
                  />
                </div>
              ) : (
                <span className="text-gray-500 text-sm">Closed</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// AI greeting customization modal
function GreetingModal({
  greeting,
  businessName,
  onSave,
  onClose,
}: {
  greeting: string;
  businessName: string;
  onSave: (greeting: string) => void;
  onClose: () => void;
}) {
  const defaultGreeting = `Hi, thanks for calling ${businessName || 'us'}! We're helping another customer right now, but we'll get back to you shortly. Can I get your name and what you're calling about?`;
  const [editGreeting, setEditGreeting] = useState(greeting || defaultGreeting);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Customize AI Greeting</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-4">
          Your AI assistant will say this when answering calls:
        </p>

        <textarea
          value={editGreeting}
          onChange={(e) => setEditGreeting(e.target.value)}
          rows={5}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none mb-4"
        />

        <p className="text-xs text-gray-500 mb-6">
          Available: {'{{business}}'} - Your business name
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => setEditGreeting(defaultGreeting)}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Reset to Default
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(editGreeting);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BusinessSettingsPage() {
  const { organization, refetch, isLoading } = useAuthContext();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showGreetingModal, setShowGreetingModal] = useState(false);

  // Local state from org settings
  const settings = organization?.settings || {};
  const [businessName, setBusinessName] = useState(organization?.name || '');
  const [serviceType, setServiceType] = useState(settings.serviceType || '');
  const [businessHours, setBusinessHours] = useState<BusinessHours>(settings.businessHours || {
    monday: { open: '08:00', close: '17:00' },
    tuesday: { open: '08:00', close: '17:00' },
    wednesday: { open: '08:00', close: '17:00' },
    thursday: { open: '08:00', close: '17:00' },
    friday: { open: '08:00', close: '17:00' },
    saturday: { open: null, close: null },
    sunday: { open: null, close: null },
  });
  const [voiceEnabled, setVoiceEnabled] = useState(settings.aiSettings?.voiceEnabled ?? true);
  const [greeting, setGreeting] = useState(settings.aiSettings?.greeting || '');

  // Sync local state when org data loads
  useEffect(() => {
    if (organization) {
      setBusinessName(organization.name || '');
      const s = organization.settings || {};
      setServiceType(s.serviceType || '');
      if (s.businessHours) setBusinessHours(s.businessHours);
      setVoiceEnabled(s.aiSettings?.voiceEnabled ?? true);
      setGreeting(s.aiSettings?.greeting || '');
    }
  }, [organization]);

  const saveSettings = async (updates: Record<string, any>) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/organizations/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to save');

      await refetch();
      setToast({ message: 'Settings saved', type: 'success' });
    } catch (error) {
      console.error('Save error:', error);
      setToast({ message: 'Failed to save', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBusinessNameSave = async (name: string) => {
    setBusinessName(name);
    await saveSettings({ name });
  };

  const handleServiceTypeChange = async (type: string) => {
    setServiceType(type);
    await saveSettings({ serviceType: type });
  };

  const handleBusinessHoursChange = async (hours: BusinessHours) => {
    setBusinessHours(hours);
    // Debounce this in production
    await saveSettings({ businessHours: hours });
  };

  const handleVoiceToggle = async () => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    await saveSettings({
      aiSettings: {
        ...settings.aiSettings,
        voiceEnabled: newValue,
      },
    });
  };

  const handleGreetingSave = async (newGreeting: string) => {
    setGreeting(newGreeting);
    await saveSettings({
      aiSettings: {
        ...settings.aiSettings,
        greeting: newGreeting,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings" className="p-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Business</h1>
        </div>
        <div className="max-w-2xl animate-pulse space-y-6">
          <div className="bg-surface rounded-xl p-6 h-48" />
          <div className="bg-surface rounded-xl p-6 h-64" />
          <div className="bg-surface rounded-xl p-6 h-32" />
        </div>
      </div>
    );
  }

  const defaultGreeting = `Hi, thanks for calling ${businessName || 'us'}! We're helping another customer right now, but we'll get back to you shortly.`;

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
        <h1 className="text-2xl font-bold text-white">Business</h1>
        {isSaving && <Loader2 className="w-5 h-5 text-accent animate-spin" />}
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Company Info */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Company Info
          </h2>
          <div className="bg-surface rounded-xl px-5">
            <EditableField
              label="Business Name"
              value={businessName}
              onSave={handleBusinessNameSave}
              placeholder="Enter business name"
            />
            <ServiceTypeSelector
              value={serviceType}
              onChange={handleServiceTypeChange}
            />
          </div>
        </section>

        {/* Business Hours */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Business Hours
          </h2>
          <div className="bg-surface rounded-xl p-5">
            <BusinessHoursEditor
              hours={businessHours}
              onChange={handleBusinessHoursChange}
            />
          </div>
        </section>

        {/* AI Assistant */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            AI Assistant
          </h2>
          <div className="bg-surface rounded-xl p-5 space-y-4">
            {/* Voice toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20 text-accent">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white font-medium">Voice Answering</p>
                  <p className="text-sm text-gray-500">AI answers calls when you're busy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`
                  w-12 h-6 rounded-full transition-all relative
                  ${voiceEnabled ? 'bg-accent' : 'bg-white/20'}
                `}
              >
                <div
                  className={`
                    w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all
                    ${voiceEnabled ? 'left-6' : 'left-0.5'}
                  `}
                />
              </button>
            </div>

            {/* Greeting preview */}
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">AI Greeting Preview</p>
                  <p className="text-white text-sm">{greeting || defaultGreeting}</p>
                </div>
              </div>
              <button
                onClick={() => setShowGreetingModal(true)}
                className="mt-3 text-accent hover:text-accent/80 text-sm font-medium"
              >
                Customize Greeting
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Greeting modal */}
      {showGreetingModal && (
        <GreetingModal
          greeting={greeting}
          businessName={businessName}
          onSave={handleGreetingSave}
          onClose={() => setShowGreetingModal(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
