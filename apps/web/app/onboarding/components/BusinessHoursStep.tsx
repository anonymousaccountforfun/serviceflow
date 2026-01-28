'use client';

import { Clock, Check } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Puerto_Rico', label: 'Atlantic Time (AT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

export interface BusinessHoursData {
  [key: string]: { open: string | null; close: string | null };
}

interface BusinessHoursStepProps {
  data: BusinessHoursData;
  onChange: (data: BusinessHoursData) => void;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
}

export function BusinessHoursStep({
  data,
  onChange,
  timezone,
  onTimezoneChange,
}: BusinessHoursStepProps) {
  const setPreset = (preset: 'weekdays' | 'everyday' | 'custom') => {
    if (preset === 'weekdays') {
      const newData: BusinessHoursData = {};
      DAYS.forEach((day) => {
        const isWeekday = !['Saturday', 'Sunday'].includes(day);
        newData[day.toLowerCase()] = isWeekday
          ? { open: '08:00', close: '17:00' }
          : { open: null, close: null };
      });
      onChange(newData);
    } else if (preset === 'everyday') {
      const newData: BusinessHoursData = {};
      DAYS.forEach((day) => {
        newData[day.toLowerCase()] = { open: '08:00', close: '18:00' };
      });
      onChange(newData);
    }
  };

  const toggleDay = (day: string) => {
    const key = day.toLowerCase();
    const current = data[key];
    if (current?.open) {
      onChange({ ...data, [key]: { open: null, close: null } });
    } else {
      onChange({ ...data, [key]: { open: '08:00', close: '17:00' } });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Set your business hours</h2>
        <p className="text-gray-400">We'll use this to customize AI responses.</p>
      </div>

      {/* Timezone selector */}
      <div className="p-4 bg-navy-800 rounded-lg border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm font-medium text-gray-300">Timezone</p>
              <p className="text-xs text-gray-500">Business hours will be shown in this timezone</p>
            </div>
          </div>
          <select
            value={timezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            className="px-3 py-2 bg-navy-900 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            {/* Show detected timezone first if not in common list */}
            {!COMMON_TIMEZONES.some((t) => t.value === timezone) && (
              <option value={timezone}>{timezone} (Detected)</option>
            )}
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}{tz.value === timezone ? ' (Detected)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setPreset('weekdays')}
          className="px-4 py-2 rounded-lg bg-navy-800 border border-white/10 text-gray-300 hover:border-white/20 text-sm"
        >
          Mon-Fri 8-5
        </button>
        <button
          type="button"
          onClick={() => setPreset('everyday')}
          className="px-4 py-2 rounded-lg bg-navy-800 border border-white/10 text-gray-300 hover:border-white/20 text-sm"
        >
          7 Days 8-6
        </button>
      </div>

      <div className="space-y-2">
        {DAYS.map((day) => {
          const key = day.toLowerCase();
          const hours = data[key] || { open: null, close: null };
          const isOpen = hours.open !== null;

          return (
            <div
              key={day}
              className="flex items-center gap-4 p-3 bg-navy-800 rounded-lg"
            >
              <button
                type="button"
                onClick={() => toggleDay(day)}
                className={`
                  w-6 h-6 rounded flex items-center justify-center transition-all
                  ${isOpen ? 'bg-accent text-white' : 'bg-white/10 text-gray-500'}
                `}
              >
                {isOpen && <Check className="w-4 h-4" />}
              </button>

              <span className="w-24 text-gray-300 font-medium">{day}</span>

              {isOpen ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={hours.open || '08:00'}
                    onChange={(e) =>
                      onChange({ ...data, [key]: { ...hours, open: e.target.value } })
                    }
                    className="px-3 py-1.5 bg-navy-900 border border-white/10 rounded text-white text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={hours.close || '17:00'}
                    onChange={(e) =>
                      onChange({ ...data, [key]: { ...hours, close: e.target.value } })
                    }
                    className="px-3 py-1.5 bg-navy-900 border border-white/10 rounded text-white text-sm"
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
