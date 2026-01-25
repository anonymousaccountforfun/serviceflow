'use client';

import { User, Building, Plug, Bell, CreditCard, ChevronRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useCurrentUser } from '../../../lib/auth/context';

function getTrialDaysLeft(organization: any): number | null {
  if (organization?.subscriptionStatus !== 'trialing') return null;

  // Calculate days left from trial end date if available
  const trialEnd = organization?.settings?.trialEndsAt;
  if (trialEnd) {
    const daysLeft = Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  }

  // Default to 30 days if no end date set
  return 30;
}

function formatBusinessHours(settings: any): string {
  const hours = settings?.businessHours;
  if (!hours) return 'Not set';

  // Check if standard Mon-Fri 8-5
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const isStandard = weekdays.every(day =>
    hours[day]?.open === '08:00' && hours[day]?.close === '17:00'
  );

  if (isStandard) return 'Mon-Fri 8-5';

  // Count open days
  const openDays = Object.entries(hours).filter(([_, h]: [string, any]) => h?.open).length;
  return `${openDays} days/week`;
}

function getIntegrationCount(settings: any): { connected: number; items: string[] } {
  const items: string[] = [];

  // Check Twilio
  if (settings?.phoneSetup?.phoneNumber) {
    items.push('Twilio');
  }

  // Check Google (placeholder - would check actual connection)
  // if (settings?.googleConnected) items.push('GBP');

  return { connected: items.length, items };
}

export default function SettingsPage() {
  const { user, organization, isLoading } = useCurrentUser();

  const trialDaysLeft = getTrialDaysLeft(organization);
  const businessHours = formatBusinessHours(organization?.settings);
  const integrations = getIntegrationCount(organization?.settings);

  const tierLabel = organization?.subscriptionTier === 'starter' ? 'Starter' :
                    organization?.subscriptionTier === 'growth' ? 'Growth' :
                    organization?.subscriptionTier === 'scale' ? 'Scale' : 'Free';

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account and preferences</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-surface rounded-xl p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-24 bg-white/10 rounded" />
                  <div className="h-4 w-32 bg-white/10 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.email?.split('@')[0] || 'User';

  const settingsSections = [
    {
      title: 'Profile',
      icon: User,
      href: '/dashboard/settings/profile',
      color: 'bg-blue-500/20 text-blue-400',
      summary: displayName,
      detail: user?.email || '',
      alert: null,
    },
    {
      title: 'Business',
      icon: Building,
      href: '/dashboard/settings/business',
      color: 'bg-purple-500/20 text-purple-400',
      summary: organization?.name || 'My Business',
      detail: businessHours,
      alert: !organization?.settings?.businessHours ? 'Set hours' : null,
    },
    {
      title: 'Integrations',
      icon: Plug,
      href: '/dashboard/settings/integrations',
      color: 'bg-green-500/20 text-green-400',
      summary: integrations.connected > 0
        ? `${integrations.connected} connected`
        : 'None connected',
      detail: integrations.items.length > 0
        ? integrations.items.map(i => `✓ ${i}`).join('  ')
        : 'Connect services',
      alert: integrations.connected === 0 ? 'Setup' : null,
    },
    {
      title: 'Notifications',
      icon: Bell,
      href: '/dashboard/settings/notifications',
      color: 'bg-yellow-500/20 text-yellow-400',
      summary: 'All enabled',
      detail: 'Push, SMS, Email',
      alert: null,
    },
    {
      title: 'Billing',
      icon: CreditCard,
      href: '/dashboard/settings/billing',
      color: 'bg-accent/20 text-accent',
      summary: `${tierLabel} Plan`,
      detail: trialDaysLeft !== null
        ? `Trial: ${trialDaysLeft} days left`
        : 'Active subscription',
      alert: trialDaysLeft !== null && trialDaysLeft <= 7 ? 'Add payment' : null,
      fullWidth: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Settings Grid - 2 columns on desktop, Billing spans full width */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.title}
              href={section.href}
              className={`
                bg-surface rounded-xl p-5 hover:bg-surface-light transition-all
                border border-transparent hover:border-white/10
                group relative
                ${section.fullWidth ? 'md:col-span-2' : ''}
              `}
            >
              {/* Alert badge */}
              {section.alert && (
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                  <AlertCircle className="w-3 h-3" />
                  {section.alert}
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${section.color} flex-shrink-0`}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-lg">{section.title}</h3>
                  <p className="text-white/80 mt-0.5 truncate">{section.summary}</p>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{section.detail}</p>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0 mt-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
