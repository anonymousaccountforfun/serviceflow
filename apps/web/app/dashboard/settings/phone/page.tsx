'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  Check,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthContext } from '../../../../lib/auth/context';
import { api } from '../../../../lib/api';
import type { PhoneStatus, AvailablePhoneNumber } from '../../../../lib/types';
import { toast } from 'sonner';

// Provisioning step configuration
const PROVISIONING_STEPS = [
  { id: 'creating', label: 'Creating number...', duration: 2000 },
  { id: 'configuring', label: 'Configuring AI...', duration: 2500 },
  { id: 'finalizing', label: 'Almost done...', duration: 1500 },
];

// Progress indicator component for provisioning
function ProvisioningProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="bg-surface rounded-xl p-6 border border-accent/30">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-accent/20">
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Provisioning your phone number...</h3>
          <p className="text-sm text-gray-400">This may take a few seconds</p>
        </div>
      </div>

      <div className="space-y-3">
        {PROVISIONING_STEPS.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div key={step.id} className="flex items-center gap-3">
              <div
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                  ${isComplete ? 'bg-green-500 text-white' : ''}
                  ${isCurrent ? 'bg-accent text-white' : ''}
                  ${isPending ? 'bg-white/10 text-gray-500' : ''}
                `}
              >
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : isCurrent ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <span className="text-xs">{index + 1}</span>
                )}
              </div>
              <span
                className={`
                  text-sm transition-colors
                  ${isComplete ? 'text-green-400' : ''}
                  ${isCurrent ? 'text-white font-medium' : ''}
                  ${isPending ? 'text-gray-500' : ''}
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${((currentStep + 1) / PROVISIONING_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function PhoneSettingsPage() {
  const { isLoading: isAuthLoading } = useAuthContext();
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddNumber, setShowAddNumber] = useState(false);
  const [addMode, setAddMode] = useState<'search' | 'existing' | null>(null);
  const [areaCode, setAreaCode] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningStep, setProvisioningStep] = useState(0);
  const [existingNumber, setExistingNumber] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPhoneStatus = async () => {
    try {
      const response = await api.getPhoneStatus();
      if (response.data) {
        setPhoneStatus(response.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load phone status';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoneStatus();
  }, []);

  const handleSearchNumbers = async () => {
    if (areaCode.length !== 3) {
      setError('Please enter a valid 3-digit area code');
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const response = await api.searchPhoneNumbers(areaCode);
      if (response.data) {
        setAvailableNumbers(response.data);
        if (response.data.length === 0) {
          setError('No numbers available in this area code. Try another.');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to search phone numbers';
      setError(message);
    } finally {
      setIsSearching(false);
    }
  };

  const simulateProvisioningSteps = async () => {
    for (let i = 0; i < PROVISIONING_STEPS.length; i++) {
      setProvisioningStep(i);
      await new Promise((resolve) => setTimeout(resolve, PROVISIONING_STEPS[i].duration));
    }
  };

  const handleProvisionNumber = async (phoneNumber: string) => {
    setIsProvisioning(true);
    setProvisioningStep(0);
    setError(null);

    // Start the step simulation in parallel with the actual API call
    const stepSimulation = simulateProvisioningSteps();

    try {
      await Promise.all([
        api.provisionPhoneNumber(phoneNumber),
        stepSimulation,
      ]);

      await fetchPhoneStatus();
      toast.success('Phone number ready!');
      setShowAddNumber(false);
      setAddMode(null);
      setAvailableNumbers([]);
      setAreaCode('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to provision phone number';
      setError(message);
      toast.error('Failed to provision number. Please try again.');
    } finally {
      setIsProvisioning(false);
      setProvisioningStep(0);
    }
  };

  const handleUseExisting = async () => {
    if (!existingNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setIsProvisioning(true);
    setProvisioningStep(0);
    setError(null);

    // Start the step simulation in parallel with the actual API call
    const stepSimulation = simulateProvisioningSteps();

    try {
      await Promise.all([
        api.useExistingPhoneNumber(existingNumber),
        stepSimulation,
      ]);

      await fetchPhoneStatus();
      toast.success('Phone number ready!');
      setShowAddNumber(false);
      setAddMode(null);
      setExistingNumber('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to register phone number';
      setError(message);
      toast.error('Failed to provision number. Please try again.');
    } finally {
      setIsProvisioning(false);
      setProvisioningStep(0);
    }
  };

  const handleDeleteNumber = async (id: string) => {
    if (!confirm('Are you sure you want to remove this phone number? This cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      await api.deletePhoneNumber(id);
      await fetchPhoneStatus();
      toast.success('Phone number removed');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete phone number';
      setError(message);
      toast.error('Failed to remove phone number');
    } finally {
      setDeletingId(null);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const handleCancelAdd = () => {
    setShowAddNumber(false);
    setAddMode(null);
    setAvailableNumbers([]);
    setAreaCode('');
    setExistingNumber('');
    setError(null);
  };

  // Show loading skeleton
  if (isLoading || isAuthLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings" className="p-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Phone</h1>
        </div>
        <div className="max-w-2xl">
          <div className="bg-surface rounded-xl p-5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-lg" />
              <div className="space-y-2">
                <div className="h-5 w-40 bg-white/10 rounded" />
                <div className="h-4 w-24 bg-white/10 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasNumbers = phoneStatus?.phoneNumbers && phoneStatus.phoneNumbers.length > 0;

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
        <h1 className="text-2xl font-bold text-white">Phone</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Phone Status Card */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Phone Numbers
          </h2>

          {/* Provisioning Progress Overlay */}
          {isProvisioning && (
            <ProvisioningProgress currentStep={provisioningStep} />
          )}

          {/* Main Content (hidden during provisioning) */}
          {!isProvisioning && (
            <div className="bg-surface rounded-xl p-5">
              {/* Twilio Status Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-lg bg-white/10 text-white flex-shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white">Phone Numbers (Twilio)</h3>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                      phoneStatus?.twilioConfigured
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {phoneStatus?.twilioConfigured ? (
                      <>
                        <Check className="w-4 h-4" />
                        Twilio Connected
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        Twilio Not Configured
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Twilio Not Configured Message */}
              {!phoneStatus?.twilioConfigured && (
                <p className="text-gray-400 text-sm mb-4">
                  Twilio credentials are not configured. Contact your administrator to set up
                  TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.
                </p>
              )}

              {/* Current Phone Numbers */}
              {hasNumbers && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Your Phone Numbers
                  </p>
                  {phoneStatus?.phoneNumbers.map((phone) => (
                    <div
                      key={phone.id}
                      className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                    >
                      <div>
                        <p className="text-white font-mono">{formatPhoneNumber(phone.number)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              phone.type === 'main'
                                ? 'bg-accent/20 text-accent'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            {phone.type === 'main' ? 'Main' : 'Tracking'}
                          </span>
                          {phone.isExternal && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                              External
                            </span>
                          )}
                          {phone.label && (
                            <span className="text-xs text-gray-500">{phone.label}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteNumber(phone.id)}
                        disabled={deletingId === phone.id}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingId === phone.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Number Section */}
              {!showAddNumber ? (
                <button
                  onClick={() => setShowAddNumber(true)}
                  disabled={!phoneStatus?.twilioConfigured}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add Phone Number
                </button>
              ) : (
                <div className="border-t border-white/10 pt-4 mt-4">
                  {!addMode ? (
                    <div className="space-y-3">
                      <p className="text-white font-medium">How would you like to add a number?</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setAddMode('search')}
                          className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors"
                        >
                          <Search className="w-5 h-5 text-accent mb-2" />
                          <p className="text-white font-medium">Get New Number</p>
                          <p className="text-xs text-gray-400">
                            Search and provision a new Twilio number
                          </p>
                        </button>
                        <button
                          onClick={() => setAddMode('existing')}
                          className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors"
                        >
                          <Phone className="w-5 h-5 text-accent mb-2" />
                          <p className="text-white font-medium">Use Existing</p>
                          <p className="text-xs text-gray-400">
                            Register a number you already own
                          </p>
                        </button>
                      </div>
                      <button
                        onClick={handleCancelAdd}
                        className="text-sm text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : addMode === 'search' ? (
                    <div className="space-y-4">
                      <p className="text-white font-medium">Search for Available Numbers</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Area code (e.g. 415)"
                          value={areaCode}
                          onChange={(e) =>
                            setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))
                          }
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
                          maxLength={3}
                        />
                        <button
                          onClick={handleSearchNumbers}
                          disabled={isSearching || areaCode.length !== 3}
                          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSearching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                          Search
                        </button>
                      </div>

                      {availableNumbers.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {availableNumbers.map((num) => (
                            <div
                              key={num.phoneNumber}
                              className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                            >
                              <div>
                                <p className="text-white font-mono">
                                  {formatPhoneNumber(num.phoneNumber)}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {num.locality}, {num.region}
                                </p>
                              </div>
                              <button
                                onClick={() => handleProvisionNumber(num.phoneNumber)}
                                disabled={isProvisioning}
                                className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {isProvisioning && (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                )}
                                Select
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setAddMode(null);
                          setAvailableNumbers([]);
                          setAreaCode('');
                          setError(null);
                        }}
                        className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Back
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-white font-medium">Register Existing Number</p>
                      <p className="text-sm text-gray-400">
                        Enter a phone number you already own. Note: This won&apos;t enable full
                        Twilio features unless you configure forwarding.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={existingNumber}
                          onChange={(e) => setExistingNumber(e.target.value)}
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        <button
                          onClick={handleUseExisting}
                          disabled={isProvisioning || !existingNumber.trim()}
                          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isProvisioning && <Loader2 className="w-4 h-4 animate-spin" />}
                          Register
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setAddMode(null);
                          setExistingNumber('');
                          setError(null);
                        }}
                        className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Back
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Help Text */}
        <section className="text-center">
          <p className="text-sm text-gray-500">
            Need help setting up your phone? Check out our{' '}
            <a href="#" className="text-accent hover:underline">
              phone setup guide
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
