'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Check,
  X,
  AlertTriangle,
  Bot,
  Loader2,
  Plus,
  Trash2,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthContext } from '../../../../lib/auth/context';
import { api } from '../../../../lib/api';
import type { PhoneStatus, AvailablePhoneNumber } from '../../../../lib/types';

type ConnectionStatus = 'connected' | 'error' | 'disconnected';

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: ConnectionStatus;
  statusText?: string;
  stats?: { label: string; value: string }[];
  actions?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean }[];
  children?: React.ReactNode;
}

function IntegrationCard({
  name,
  description,
  icon,
  status,
  statusText,
  stats,
  actions,
  children,
}: IntegrationCardProps) {
  const statusConfig = {
    connected: {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      icon: <Check className="w-4 h-4" />,
      label: statusText || 'Connected',
    },
    error: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      icon: <AlertTriangle className="w-4 h-4" />,
      label: statusText || 'Connection Error',
    },
    disconnected: {
      bg: 'bg-gray-500/20',
      text: 'text-gray-400',
      icon: <X className="w-4 h-4" />,
      label: statusText || 'Not Connected',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="bg-surface rounded-xl p-5">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 rounded-lg bg-white/10 text-white flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white">{name}</h3>
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} mt-1`}>
            {config.icon}
            {config.label}
          </div>
        </div>
      </div>

      {status === 'disconnected' && (
        <p className="text-gray-400 text-sm mb-4">{description}</p>
      )}

      {children}

      {stats && stats.length > 0 && (
        <div className="border-t border-white/10 pt-4 mt-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">This Month</p>
          <div className="flex gap-6">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-white font-semibold">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${action.variant === 'primary'
                  ? 'bg-accent text-white hover:bg-accent/90'
                  : action.variant === 'danger'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }
              `}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UsageBar({ used, total, label }: { used: number; total: number; label: string }) {
  const percentage = Math.min((used / total) * 100, 100);
  const isWarning = percentage >= 80;

  return (
    <div className="mt-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={isWarning ? 'text-amber-400' : 'text-white'}>
          {used} / {total}
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isWarning ? 'bg-amber-400' : 'bg-accent'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Phone Number Management Component
function PhoneNumberManager() {
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddNumber, setShowAddNumber] = useState(false);
  const [addMode, setAddMode] = useState<'search' | 'existing' | null>(null);
  const [areaCode, setAreaCode] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
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

  const handleProvisionNumber = async (phoneNumber: string) => {
    setIsProvisioning(true);
    setError(null);
    try {
      await api.provisionPhoneNumber(phoneNumber);
      await fetchPhoneStatus();
      setShowAddNumber(false);
      setAddMode(null);
      setAvailableNumbers([]);
      setAreaCode('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to provision phone number';
      setError(message);
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleUseExisting = async () => {
    if (!existingNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setIsProvisioning(true);
    setError(null);
    try {
      await api.useExistingPhoneNumber(existingNumber);
      await fetchPhoneStatus();
      setShowAddNumber(false);
      setAddMode(null);
      setExistingNumber('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to register phone number';
      setError(message);
    } finally {
      setIsProvisioning(false);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete phone number';
      setError(message);
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

  if (isLoading) {
    return (
      <div className="bg-surface rounded-xl p-5">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          <span className="text-gray-400">Loading phone configuration...</span>
        </div>
      </div>
    );
  }

  const twilioStatus: ConnectionStatus = phoneStatus?.twilioConfigured ? 'connected' : 'error';
  const hasNumbers = phoneStatus?.phoneNumbers && phoneStatus.phoneNumbers.length > 0;

  return (
    <div className="bg-surface rounded-xl p-5">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 rounded-lg bg-white/10 text-white flex-shrink-0">
          <Phone className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white">Phone Numbers (Twilio)</h3>
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
            phoneStatus?.twilioConfigured
              ? 'bg-green-500/20 text-green-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}>
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

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!phoneStatus?.twilioConfigured && (
        <p className="text-gray-400 text-sm mb-4">
          Twilio credentials are not configured. Contact your administrator to set up TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.
        </p>
      )}

      {/* Current Phone Numbers */}
      {hasNumbers && (
        <div className="space-y-2 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Your Phone Numbers</p>
          {phoneStatus?.phoneNumbers.map((phone) => (
            <div
              key={phone.id}
              className="flex items-center justify-between bg-white/5 rounded-lg p-3"
            >
              <div>
                <p className="text-white font-mono">{formatPhoneNumber(phone.number)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    phone.type === 'main' ? 'bg-accent/20 text-accent' : 'bg-gray-500/20 text-gray-400'
                  }`}>
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
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
                  <p className="text-xs text-gray-400">Search and provision a new Twilio number</p>
                </button>
                <button
                  onClick={() => setAddMode('existing')}
                  className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors"
                >
                  <Phone className="w-5 h-5 text-accent mb-2" />
                  <p className="text-white font-medium">Use Existing</p>
                  <p className="text-xs text-gray-400">Register a number you already own</p>
                </button>
              </div>
              <button
                onClick={() => setShowAddNumber(false)}
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
                  onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
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
                        <p className="text-white font-mono">{formatPhoneNumber(num.phoneNumber)}</p>
                        <p className="text-xs text-gray-400">
                          {num.locality}, {num.region}
                        </p>
                      </div>
                      <button
                        onClick={() => handleProvisionNumber(num.phoneNumber)}
                        disabled={isProvisioning}
                        className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50"
                      >
                        {isProvisioning ? 'Provisioning...' : 'Select'}
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
                }}
                className="text-sm text-gray-400 hover:text-white"
              >
                ← Back
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-white font-medium">Register Existing Number</p>
              <p className="text-sm text-gray-400">
                Enter a phone number you already own. Note: This won&apos;t enable full Twilio features unless you configure forwarding.
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
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProvisioning ? 'Registering...' : 'Register'}
                </button>
              </div>
              <button
                onClick={() => {
                  setAddMode(null);
                  setExistingNumber('');
                }}
                className="text-sm text-gray-400 hover:text-white"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IntegrationsSettingsPage() {
  const { organization, isLoading } = useAuthContext();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  const settings = organization?.settings || {};

  // Google status - would check actual OAuth connection
  const googleConnected = false; // Placeholder
  const googleStatus: ConnectionStatus = googleConnected ? 'connected' : 'disconnected';

  // Vapi status
  const vapiEnabled = settings.aiSettings?.voiceEnabled;
  const vapiStatus: ConnectionStatus = vapiEnabled ? 'connected' : 'disconnected';

  const handleGoogleConnect = () => {
    // Would initiate OAuth flow
    alert('Google OAuth flow would start here');
  };

  const handleGoogleSync = async () => {
    setIsSyncing(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsSyncing(false);
  };

  const handleTestAI = async () => {
    setIsTesting('ai');
    await new Promise(r => setTimeout(r, 2000));
    setIsTesting(null);
    alert('Test AI call initiated!');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings" className="p-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
        </div>
        <div className="max-w-2xl space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface rounded-xl p-5 h-40 animate-pulse" />
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
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Phone & SMS Section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Phone & SMS
          </h2>
          <PhoneNumberManager />
        </section>

        {/* Reviews Section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Reviews
          </h2>
          <IntegrationCard
            name="Google Business Profile"
            description="Connect to sync and respond to Google reviews automatically."
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            }
            status={googleStatus}
            statusText={googleConnected ? 'Connected' : 'Not Connected'}
            stats={googleConnected ? [
              { label: 'Reviews', value: '47' },
              { label: 'Avg Rating', value: '4.8' },
            ] : undefined}
            actions={googleConnected ? [
              {
                label: isSyncing ? 'Syncing...' : 'Sync Now',
                onClick: handleGoogleSync,
              },
              {
                label: 'Disconnect',
                onClick: () => {},
                variant: 'danger',
              },
            ] : [
              {
                label: 'Connect Google',
                onClick: handleGoogleConnect,
                variant: 'primary',
              },
            ]}
          >
            {googleConnected && (
              <div className="space-y-1">
                <p className="text-white">Mike&apos;s Plumbing</p>
                <p className="text-xs text-gray-500">Last synced: 2 hours ago</p>
              </div>
            )}
          </IntegrationCard>
        </section>

        {/* AI Voice Section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            AI Voice
          </h2>
          <IntegrationCard
            name="Vapi Voice AI"
            description="AI-powered voice assistant for handling calls."
            icon={<Bot className="w-6 h-6" />}
            status={vapiStatus}
            statusText={vapiEnabled ? 'Active' : 'Disabled'}
            actions={vapiEnabled ? [
              {
                label: isTesting === 'ai' ? 'Calling...' : 'Test AI Call',
                onClick: handleTestAI,
              },
            ] : [
              {
                label: 'Enable in Business Settings',
                onClick: () => window.location.href = '/dashboard/settings/business',
                variant: 'primary',
              },
            ]}
          >
            {vapiEnabled && (
              <UsageBar used={23} total={100} label="AI minutes this month" />
            )}
          </IntegrationCard>
        </section>

        {/* Coming Soon */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Coming Soon
          </h2>
          <div className="bg-surface/50 rounded-xl p-5 border border-dashed border-white/10">
            <div className="flex items-center gap-3 text-gray-500">
              <MessageSquare className="w-5 h-5" />
              <div>
                <p className="text-white/60 font-medium">Facebook Reviews</p>
                <p className="text-sm">Sync and respond to Facebook reviews</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
