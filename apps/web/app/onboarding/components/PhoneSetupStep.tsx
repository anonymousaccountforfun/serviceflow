'use client';

import { useState, useEffect } from 'react';
import { Phone, Check, Loader2, MapPin, AlertCircle } from 'lucide-react';

export interface ProvisionedNumber {
  id: string;
  number: string;
  label: string;
}

export interface PhoneSetupData {
  areaCode: string;
  phoneNumber: string;
  useExisting: boolean;
  selectedNumber: string;
  provisionedNumber: ProvisionedNumber | null;
}

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
}

interface PhoneSetupStepProps {
  data: PhoneSetupData;
  onChange: (data: PhoneSetupData) => void;
}

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function PhoneSetupStep({ data, onChange }: PhoneSetupStepProps) {
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
        if (result.error?.code === 'E4003') {
          throw new Error('Someone grabbed this number. Please select another.');
        }
        throw new Error(result.error?.message || 'Failed to provision number');
      }

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
