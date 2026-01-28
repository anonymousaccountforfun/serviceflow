'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Phone,
  Clock,
  Bot,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Wrench,
  Flame,
  Zap,
  Home,
  Search,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { useAuthContext } from '../../lib/auth/context';
import { toast } from 'sonner';
import { useOnboardingPersistence, type OnboardingProgress } from '../../hooks/useOnboardingPersistence';

// Step indicator component
function StepIndicator({ currentStep, steps }: { currentStep: number; steps: { icon: any; label: string }[] }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={index} className="flex items-center">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all
                ${isComplete ? 'bg-green-500 text-white' : ''}
                ${isCurrent ? 'bg-accent text-white' : ''}
                ${!isComplete && !isCurrent ? 'bg-white/10 text-gray-500' : ''}
              `}
            >
              {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-1 ${isComplete ? 'bg-green-500' : 'bg-white/10'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Service type options
const SERVICE_TYPES = [
  { value: 'plumber', label: 'Plumber', icon: Wrench },
  { value: 'hvac', label: 'HVAC', icon: Flame },
  { value: 'electrician', label: 'Electrician', icon: Zap },
  { value: 'other', label: 'Other', icon: Home },
];

// Step 1: Business Profile
function BusinessProfileStep({
  data,
  onChange,
}: {
  data: { businessName: string; serviceType: string };
  onChange: (data: { businessName: string; serviceType: string }) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Tell us about your business</h2>
        <p className="text-gray-400">This helps us customize ServiceFlow for you.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Business Name
          </label>
          <input
            type="text"
            value={data.businessName}
            onChange={(e) => onChange({ ...data, businessName: e.target.value })}
            placeholder="e.g., Mike's Plumbing"
            className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            What type of service do you provide?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {SERVICE_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = data.serviceType === type.value;

              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => onChange({ ...data, serviceType: type.value })}
                  className={`
                    flex items-center gap-3 p-4 rounded-lg border transition-all
                    ${isSelected
                      ? 'bg-accent/20 border-accent text-white'
                      : 'bg-navy-800 border-white/10 text-gray-400 hover:border-white/20'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Available phone number interface
interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
}

// Provisioned phone number interface
interface ProvisionedNumber {
  id: string;
  number: string;
  label: string;
}

// Step 2: Phone Setup
function PhoneSetupStep({
  data,
  onChange,
}: {
  data: {
    areaCode: string;
    phoneNumber: string;
    useExisting: boolean;
    selectedNumber: string;
    provisionedNumber: ProvisionedNumber | null;
  };
  onChange: (data: {
    areaCode: string;
    phoneNumber: string;
    useExisting: boolean;
    selectedNumber: string;
    provisionedNumber: ProvisionedNumber | null;
  }) => void;
}) {
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [isConfiguringExisting, setIsConfiguringExisting] = useState(false);
  const [existingConfigError, setExistingConfigError] = useState<string | null>(null);
  const [existingConfigured, setExistingConfigured] = useState(false);

  // Search for numbers when area code is complete
  useEffect(() => {
    if (data.areaCode.length === 3 && !data.useExisting) {
      searchNumbers(data.areaCode);
    } else {
      setAvailableNumbers([]);
      setHasSearched(false);
      setSearchError(null);
    }
  }, [data.areaCode, data.useExisting]);

  const searchNumbers = async (areaCode: string) => {
    setIsSearching(true);
    setSearchError(null);
    setAvailableNumbers([]);

    try {
      const response = await fetch(`/api/phone-numbers/search?areaCode=${areaCode}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to search numbers');
      }

      setAvailableNumbers(result.data || []);
      setHasSearched(true);

      // Auto-select first number if available
      if (result.data?.length > 0 && !data.selectedNumber) {
        onChange({ ...data, selectedNumber: result.data[0].phoneNumber });
      }
    } catch (error) {
      console.error('Phone search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Failed to search numbers');
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    // Format +1XXXXXXXXXX to (XXX) XXX-XXXX
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  // Validate E.164 format: +1XXXXXXXXXX for US numbers or +XXXX for international
  const isValidPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    // Accept 10 digits (US without country code), 11 digits (US with 1), or 11+ for international
    return digits.length >= 10 && digits.length <= 15;
  };

  const configureExistingNumber = async () => {
    if (!data.phoneNumber || isConfiguringExisting) return;

    if (!isValidPhoneNumber(data.phoneNumber)) {
      setExistingConfigError('Please enter a valid phone number (e.g., +1 555 123 4567)');
      return;
    }

    setIsConfiguringExisting(true);
    setExistingConfigError(null);

    try {
      const response = await fetch('/api/phone-numbers/use-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: data.phoneNumber,
          label: 'External Business Line',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.code === 'E4005') {
          throw new Error('This number is already registered to another account.');
        }
        throw new Error(result.error?.message || 'Failed to configure number');
      }

      // Update with configured number
      onChange({
        ...data,
        provisionedNumber: {
          id: result.data.id,
          number: result.data.number,
          label: result.data.label,
        },
      });
      setExistingConfigured(true);
    } catch (error) {
      console.error('Configure existing number error:', error);
      setExistingConfigError(error instanceof Error ? error.message : 'Unable to configure number. Please try again.');
    } finally {
      setIsConfiguringExisting(false);
    }
  };

  const provisionNumber = async () => {
    if (!data.selectedNumber || isProvisioning) return;

    setIsProvisioning(true);
    setProvisionError(null);

    try {
      const response = await fetch('/api/phone-numbers/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: data.selectedNumber,
          label: 'Main Business Line',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error for number not available
        if (result.error?.code === 'E4003') {
          throw new Error('Someone grabbed this number. Please select another.');
        }
        throw new Error(result.error?.message || 'Failed to provision number');
      }

      // Update with provisioned number
      onChange({
        ...data,
        provisionedNumber: {
          id: result.data.id,
          number: result.data.number,
          label: result.data.label,
        },
      });
    } catch (error) {
      console.error('Provision error:', error);
      setProvisionError(error instanceof Error ? error.message : 'Unable to provision number. Please try again.');
      // Clear selection so user picks another
      onChange({ ...data, selectedNumber: '' });
    } finally {
      setIsProvisioning(false);
    }
  };

  // If already provisioned, show success state
  if (data.provisionedNumber) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Phone number ready!</h2>
          <p className="text-gray-400">Your business phone is set up and ready to use.</p>
        </div>

        <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-green-400 font-medium text-sm mb-1">Your new business number</p>
              <p className="text-white font-mono text-2xl">
                {formatPhoneDisplay(data.provisionedNumber.number)}
              </p>
            </div>
          </div>
        </div>

        <p className="text-gray-400 text-sm">
          This number is now configured to receive calls and texts for your business.
          You can update settings anytime from your dashboard.
        </p>

        <button
          type="button"
          onClick={() => onChange({
            areaCode: '',
            phoneNumber: '',
            useExisting: false,
            selectedNumber: '',
            provisionedNumber: null,
          })}
          className="text-accent hover:text-accent/80 text-sm transition-colors"
        >
          Choose a different number
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Set up your business phone</h2>
        <p className="text-gray-400">This number will handle incoming calls and texts.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...data, useExisting: false, selectedNumber: '', provisionedNumber: null })}
            className={`
              p-4 rounded-lg border transition-all text-left
              ${!data.useExisting
                ? 'bg-accent/20 border-accent text-white'
                : 'bg-navy-800 border-white/10 text-gray-400 hover:border-white/20'
              }
            `}
          >
            <div className="font-medium mb-1">Get a new number</div>
            <div className="text-sm text-gray-400">We'll provision a number for you</div>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...data, useExisting: true, selectedNumber: '', provisionedNumber: null })}
            className={`
              p-4 rounded-lg border transition-all text-left
              ${data.useExisting
                ? 'bg-accent/20 border-accent text-white'
                : 'bg-navy-800 border-white/10 text-gray-400 hover:border-white/20'
              }
            `}
          >
            <div className="font-medium mb-1">Use existing number</div>
            <div className="text-sm text-gray-400">Connect your Twilio number</div>
          </button>
        </div>

        {!data.useExisting ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enter Area Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={data.areaCode}
                  onChange={(e) => onChange({
                    ...data,
                    areaCode: e.target.value.replace(/\D/g, '').slice(0, 3),
                    selectedNumber: ''
                  })}
                  placeholder="e.g., 512"
                  maxLength={3}
                  className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                  </div>
                )}
              </div>
              {data.areaCode.length < 3 && (
                <p className="text-sm text-gray-500 mt-2">
                  Enter a 3-digit area code to search for available numbers.
                </p>
              )}
            </div>

            {/* Search Results */}
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Searching for available numbers...</p>
                </div>
              </div>
            )}

            {searchError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">Search failed</p>
                  <p className="text-red-400/80 text-sm">{searchError}</p>
                </div>
              </div>
            )}

            {hasSearched && !isSearching && availableNumbers.length === 0 && !searchError && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 font-medium">No numbers available</p>
                  <p className="text-amber-400/80 text-sm">
                    Try a different area code. Some areas have limited availability.
                  </p>
                </div>
              </div>
            )}

            {availableNumbers.length > 0 && !isSearching && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-300">
                    Select a number ({availableNumbers.length} available)
                  </p>
                  <div className="grid gap-2 max-h-64 overflow-y-auto">
                    {availableNumbers.map((num) => (
                      <button
                        key={num.phoneNumber}
                        type="button"
                        onClick={() => onChange({ ...data, selectedNumber: num.phoneNumber })}
                        disabled={isProvisioning}
                        className={`
                          p-4 rounded-lg border transition-all text-left flex items-center gap-4
                          ${data.selectedNumber === num.phoneNumber
                            ? 'bg-accent/20 border-accent'
                            : 'bg-navy-900 border-white/10 hover:border-white/20'
                          }
                          ${isProvisioning ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <div className={`
                          w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                          ${data.selectedNumber === num.phoneNumber
                            ? 'border-accent bg-accent'
                            : 'border-gray-500'
                          }
                        `}>
                          {data.selectedNumber === num.phoneNumber && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-mono text-lg">
                            {formatPhoneDisplay(num.phoneNumber)}
                          </p>
                          {(num.locality || num.region) && (
                            <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {[num.locality, num.region].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Provision Error */}
                {provisionError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 font-medium">Provisioning failed</p>
                      <p className="text-red-400/80 text-sm">{provisionError}</p>
                    </div>
                  </div>
                )}

                {/* Get This Number Button */}
                {data.selectedNumber && (
                  <button
                    type="button"
                    onClick={provisionNumber}
                    disabled={isProvisioning}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProvisioning ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Provisioning number...
                      </>
                    ) : (
                      <>
                        <Phone className="w-5 h-5" />
                        Get This Number
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : existingConfigured && data.provisionedNumber !== null ? (
          /* Success state for existing number */
          <div className="space-y-4">
            <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-green-400 font-medium text-sm mb-1">Number registered</p>
                  <p className="text-white font-mono text-2xl">
                    {formatPhoneDisplay((data.provisionedNumber as ProvisionedNumber).number)}
                  </p>
                </div>
              </div>
            </div>

            {/* Webhook Setup Instructions */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-amber-400 font-medium mb-2">Important: Configure Twilio Webhooks</p>
              <p className="text-amber-400/80 text-sm mb-3">
                To receive calls and texts, update your Twilio number's webhook URLs:
              </p>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-navy-900 rounded font-mono text-gray-300 break-all">
                  <span className="text-gray-500">Voice URL:</span><br />
                  {typeof window !== 'undefined' ? `${window.location.origin}/webhooks/twilio/voice` : '/webhooks/twilio/voice'}
                </div>
                <div className="p-2 bg-navy-900 rounded font-mono text-gray-300 break-all">
                  <span className="text-gray-500">SMS URL:</span><br />
                  {typeof window !== 'undefined' ? `${window.location.origin}/webhooks/twilio/sms` : '/webhooks/twilio/sms'}
                </div>
              </div>
              <p className="text-amber-400/60 text-xs mt-3">
                You can complete this step later from Settings → Phone Numbers.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setExistingConfigured(false);
                onChange({
                  ...data,
                  phoneNumber: '',
                  provisionedNumber: null,
                });
              }}
              className="text-accent hover:text-accent/80 text-sm transition-colors"
            >
              Use a different number
            </button>
          </div>
        ) : (
          /* Input for existing number */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Twilio Phone Number
              </label>
              <input
                type="tel"
                value={data.phoneNumber}
                onChange={(e) => {
                  onChange({ ...data, phoneNumber: e.target.value });
                  setExistingConfigError(null);
                }}
                disabled={isConfiguringExisting}
                placeholder="+1 555 123 4567"
                className={`
                  w-full px-4 py-3 bg-navy-800 border rounded-lg text-white placeholder:text-gray-500
                  focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                  ${existingConfigError ? 'border-red-500' : 'border-white/10'}
                  ${isConfiguringExisting ? 'opacity-50' : ''}
                `}
              />
              {existingConfigError ? (
                <p className="text-sm text-red-400 mt-2">{existingConfigError}</p>
              ) : (
                <p className="text-sm text-gray-500 mt-2">
                  Enter your existing Twilio number in E.164 format.
                </p>
              )}
            </div>

            {data.phoneNumber && isValidPhoneNumber(data.phoneNumber) && (
              <button
                type="button"
                onClick={configureExistingNumber}
                disabled={isConfiguringExisting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfiguringExisting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Configuring...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Use This Number
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Step 3: Business Hours
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Common timezones for dropdown
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

function BusinessHoursStep({
  data,
  onChange,
  timezone,
  onTimezoneChange,
}: {
  data: { [key: string]: { open: string | null; close: string | null } };
  onChange: (data: { [key: string]: { open: string | null; close: string | null } }) => void;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
}) {
  const setPreset = (preset: 'weekdays' | 'everyday' | 'custom') => {
    if (preset === 'weekdays') {
      const newData: { [key: string]: { open: string | null; close: string | null } } = {};
      DAYS.forEach((day) => {
        const isWeekday = !['Saturday', 'Sunday'].includes(day);
        newData[day.toLowerCase()] = isWeekday
          ? { open: '08:00', close: '17:00' }
          : { open: null, close: null };
      });
      onChange(newData);
    } else if (preset === 'everyday') {
      const newData: { [key: string]: { open: string | null; close: string | null } } = {};
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

  // Get display label for current timezone
  const getTimezoneLabel = (tz: string) => {
    const found = COMMON_TIMEZONES.find((t) => t.value === tz);
    return found ? found.label : tz;
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

// Step 4: AI Preview & Final Setup
function AIPreviewStep({
  data,
  onChange,
  businessName,
  loadSampleData,
  onLoadSampleDataChange,
}: {
  data: { greeting: string; voiceEnabled: boolean };
  onChange: (data: { greeting: string; voiceEnabled: boolean }) => void;
  businessName: string;
  loadSampleData: boolean;
  onLoadSampleDataChange: (load: boolean) => void;
}) {
  const defaultGreeting = `Hi, thanks for calling ${businessName || 'us'}! We're helping another customer right now, but we'll get back to you shortly. Can I get your name and what you're calling about?`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Preview your AI assistant</h2>
        <p className="text-gray-400">This is how your AI will greet callers.</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-navy-800 rounded-lg border border-white/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-400 mb-1">AI Assistant</p>
              <p className="text-white">{data.greeting || defaultGreeting}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Customize Greeting (optional)
          </label>
          <textarea
            value={data.greeting}
            onChange={(e) => onChange({ ...data, greeting: e.target.value })}
            placeholder={defaultGreeting}
            rows={4}
            className="w-full px-4 py-3 bg-navy-800 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
          />
        </div>

        <div className="flex items-center gap-3 p-4 bg-navy-800 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => onChange({ ...data, voiceEnabled: !data.voiceEnabled })}
            className={`
              w-12 h-6 rounded-full transition-all relative
              ${data.voiceEnabled ? 'bg-accent' : 'bg-white/20'}
            `}
          >
            <div
              className={`
                w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all
                ${data.voiceEnabled ? 'left-6' : 'left-0.5'}
              `}
            />
          </button>
          <div>
            <p className="text-white font-medium">AI Voice Answering</p>
            <p className="text-sm text-gray-400">Let AI answer calls when you're busy</p>
          </div>
        </div>

        {/* Sample Data Toggle */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-4 bg-navy-800 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => onLoadSampleDataChange(!loadSampleData)}
              className={`
                w-12 h-6 rounded-full transition-all relative flex-shrink-0
                ${loadSampleData ? 'bg-green-500' : 'bg-white/20'}
              `}
            >
              <div
                className={`
                  w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all
                  ${loadSampleData ? 'left-6' : 'left-0.5'}
                `}
              />
            </button>
            <div className="flex-1">
              <p className="text-white font-medium">Load Sample Data</p>
              <p className="text-sm text-gray-400">
                See ServiceFlow in action with demo customers, jobs, and conversations
              </p>
            </div>
          </div>
          {loadSampleData && (
            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">
                We'll add sample data including:
              </p>
              <ul className="text-green-400/80 text-sm mt-2 space-y-1 ml-4">
                <li>• 5 sample customers</li>
                <li>• 8 jobs (leads, scheduled, completed)</li>
                <li>• 3 conversations with AI examples</li>
                <li>• 4 customer reviews</li>
              </ul>
              <p className="text-green-400/60 text-xs mt-2">
                You can remove sample data later from Settings.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main onboarding page
export default function OnboardingPage() {
  const router = useRouter();
  const { organization, refetch } = useAuthContext();

  // Persistence hook
  const {
    isLoaded: persistenceLoaded,
    savedProgress,
    saveProgress,
    clearProgress,
    hasSavedProgress,
    getTimeRemaining,
  } = useOnboardingPersistence();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);

  // Form state
  const [businessProfile, setBusinessProfile] = useState({
    businessName: organization?.name || '',
    serviceType: '',
  });

  const [phoneSetup, setPhoneSetup] = useState<{
    areaCode: string;
    phoneNumber: string;
    useExisting: boolean;
    selectedNumber: string;
    provisionedNumber: ProvisionedNumber | null;
  }>({
    areaCode: '',
    phoneNumber: '',
    useExisting: false,
    selectedNumber: '',
    provisionedNumber: null,
  });

  const [businessHours, setBusinessHours] = useState<{
    [key: string]: { open: string | null; close: string | null };
  }>({
    monday: { open: '08:00', close: '17:00' },
    tuesday: { open: '08:00', close: '17:00' },
    wednesday: { open: '08:00', close: '17:00' },
    thursday: { open: '08:00', close: '17:00' },
    friday: { open: '08:00', close: '17:00' },
    saturday: { open: null, close: null },
    sunday: { open: null, close: null },
  });

  const [aiSettings, setAiSettings] = useState({
    greeting: '',
    voiceEnabled: true,
  });

  // Sample data toggle (default off)
  const [loadSampleData, setLoadSampleData] = useState(false);

  // Detect user's timezone on mount
  const [detectedTimezone, setDetectedTimezone] = useState('America/New_York');
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        setDetectedTimezone(tz);
      }
    } catch {
      // Fallback to default timezone if detection fails
    }
  }, []);

  // Restore saved progress on mount
  useEffect(() => {
    if (persistenceLoaded && savedProgress && !hasRestoredProgress) {
      setCurrentStep(savedProgress.currentStep);
      setBusinessProfile(savedProgress.businessProfile);
      setPhoneSetup(savedProgress.phoneSetup);
      setBusinessHours(savedProgress.businessHours);
      setAiSettings(savedProgress.aiSettings);
      setLoadSampleData(savedProgress.loadSampleData);
      if (savedProgress.timezone) {
        setDetectedTimezone(savedProgress.timezone);
      }
      setHasRestoredProgress(true);

      const timeRemaining = getTimeRemaining();
      if (timeRemaining) {
        toast.info(`Welcome back! Your progress was saved. (expires in ${timeRemaining})`);
      }
    }
  }, [persistenceLoaded, savedProgress, hasRestoredProgress, getTimeRemaining]);

  // Auto-save progress when form state changes
  useEffect(() => {
    // Don't save until initial load is complete
    if (!persistenceLoaded || !hasRestoredProgress && hasSavedProgress) return;

    saveProgress({
      currentStep,
      businessProfile,
      phoneSetup,
      businessHours,
      aiSettings,
      loadSampleData,
      timezone: detectedTimezone,
    });
  }, [
    persistenceLoaded,
    hasRestoredProgress,
    hasSavedProgress,
    currentStep,
    businessProfile,
    phoneSetup,
    businessHours,
    aiSettings,
    loadSampleData,
    detectedTimezone,
    saveProgress,
  ]);

  const steps = [
    { icon: Building2, label: 'Business' },
    { icon: Phone, label: 'Phone' },
    { icon: Clock, label: 'Hours' },
    { icon: Bot, label: 'AI' },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return businessProfile.businessName.trim() && businessProfile.serviceType;
      case 1:
        // For new number: require a provisioned number
        // For existing: require a phone number input
        return phoneSetup.useExisting
          ? phoneSetup.phoneNumber.trim().length > 0
          : phoneSetup.provisionedNumber !== null;
      case 2:
        return true; // Hours are always valid
      case 3:
        return true; // AI settings are always valid
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      setIsSubmitting(true);
      try {
        const response = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessProfile,
            phoneSetup,
            businessHours,
            aiSettings,
            timezone: detectedTimezone,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to complete onboarding');
        }

        // Seed sample data if requested (non-blocking - continue even if it fails)
        if (loadSampleData) {
          try {
            const seedResponse = await fetch('/api/onboarding/seed-sample-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            if (seedResponse.ok) {
              toast.success('Sample data loaded successfully!');
            } else {
              // Don't block onboarding completion, just warn
              console.warn('Failed to seed sample data');
            }
          } catch (seedError) {
            console.warn('Sample data seeding error:', seedError);
            // Continue anyway - sample data is optional
          }
        }

        // Clear saved progress on successful completion
        clearProgress();

        // Refresh auth context to get updated org settings
        await refetch();

        // Redirect to dashboard
        router.push('/dashboard');
      } catch (error) {
        console.error('Onboarding error:', error);
        toast.error('Failed to complete setup. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/onboarding/skip', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to skip onboarding');
      }

      // Clear saved progress
      clearProgress();

      // Refresh auth context to get updated org settings
      await refetch();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Skip onboarding error:', error);
      toast.error('Failed to skip setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            ServiceFlow
          </span>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={currentStep} steps={steps} />

        {/* Step content */}
        <div className="bg-navy-800 border border-white/10 rounded-xl p-6 mb-6">
          {currentStep === 0 && (
            <BusinessProfileStep data={businessProfile} onChange={setBusinessProfile} />
          )}
          {currentStep === 1 && (
            <PhoneSetupStep data={phoneSetup} onChange={setPhoneSetup} />
          )}
          {currentStep === 2 && (
            <BusinessHoursStep
              data={businessHours}
              onChange={setBusinessHours}
              timezone={detectedTimezone}
              onTimezoneChange={setDetectedTimezone}
            />
          )}
          {currentStep === 3 && (
            <AIPreviewStep
              data={aiSettings}
              onChange={setAiSettings}
              businessName={businessProfile.businessName}
              loadSampleData={loadSampleData}
              onLoadSampleDataChange={setLoadSampleData}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-accent text-white hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up...
              </>
            ) : currentStep === steps.length - 1 ? (
              <>
                Complete Setup
                <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Skip option */}
        <p className="text-center text-gray-500 text-sm mt-6">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="hover:text-gray-400 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Skipping...' : 'Skip for now'}
          </button>
        </p>
      </div>
    </div>
  );
}
