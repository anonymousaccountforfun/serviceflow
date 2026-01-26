'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Download,
  AlertCircle,
  Sparkles,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthContext } from '../../../../lib/auth/context';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 149,
    features: [
      '1 phone number',
      '500 SMS/month',
      '2 team members',
      '50 AI minutes',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 299,
    popular: true,
    features: [
      '3 phone numbers',
      '1,500 SMS/month',
      '5 team members',
      '100 AI minutes',
      'Priority support',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 499,
    features: [
      '10 phone numbers',
      'Unlimited SMS',
      'Unlimited team members',
      '300 AI minutes',
      'Dedicated support',
      'Custom integrations',
    ],
  },
];

function UsageMeter({
  label,
  used,
  total,
  unit,
}: {
  label: string;
  used: number;
  total: number | 'unlimited';
  unit?: string;
}) {
  const isUnlimited = total === 'unlimited';
  const percentage = isUnlimited ? 0 : Math.min((used / (total as number)) * 100, 100);
  const isWarning = !isUnlimited && percentage >= 80;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-400">{label}</span>
        <span className={isWarning ? 'text-amber-400' : 'text-white'}>
          {used.toLocaleString()} {isUnlimited ? '' : `/ ${(total as number).toLocaleString()}`}
          {unit && ` ${unit}`}
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isWarning ? 'bg-amber-400' : 'bg-accent'
          }`}
          style={{ width: isUnlimited ? '0%' : `${percentage}%` }}
        />
      </div>
      {isWarning && (
        <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Approaching limit
        </p>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  isCurrentPlan,
  onSelect,
  isLoading,
}: {
  plan: typeof PLANS[0];
  isCurrentPlan: boolean;
  onSelect: () => void;
  isLoading?: boolean;
}) {
  return (
    <div
      className={`
        bg-surface rounded-xl p-5 border-2 transition-all relative
        ${isCurrentPlan ? 'border-accent' : 'border-transparent hover:border-white/20'}
        ${plan.popular ? 'ring-1 ring-accent/50' : ''}
      `}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent rounded-full text-xs font-semibold text-white flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Popular
        </div>
      )}

      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
        <div className="mt-2">
          <span className="text-3xl font-bold text-white">${plan.price}</span>
          <span className="text-gray-500">/mo</span>
        </div>
      </div>

      <ul className="space-y-2 mb-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrentPlan || isLoading}
        className={`
          w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
          ${isCurrentPlan
            ? 'bg-white/10 text-gray-400 cursor-not-allowed'
            : 'bg-accent text-white hover:bg-accent/90 disabled:opacity-50'
          }
        `}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {isCurrentPlan ? 'Current Plan' : 'Upgrade'}
      </button>
    </div>
  );
}

export default function BillingSettingsPage() {
  const { organization, isLoading, refetch } = useAuthContext();
  const searchParams = useSearchParams();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const currentTier = organization?.subscriptionTier || 'starter';
  const isTrialing = organization?.subscriptionStatus === 'trialing';

  // Handle Stripe redirect results
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast.success('Subscription activated successfully!');
      refetch?.();
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/settings/billing');
    } else if (canceled === 'true') {
      toast.info('Checkout was cancelled');
      window.history.replaceState({}, '', '/dashboard/settings/billing');
    }
  }, [searchParams, refetch]);

  // Calculate trial days remaining
  const trialEndsAt = organization?.settings?.trialEndsAt;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30;

  // Mock usage data - would come from API
  const usage = {
    sms: { used: 342, total: currentTier === 'scale' ? 'unlimited' as const : currentTier === 'growth' ? 1500 : 500 },
    aiMinutes: { used: 23, total: currentTier === 'scale' ? 300 : currentTier === 'growth' ? 100 : 50 },
    teamMembers: { used: 2, total: currentTier === 'scale' ? 'unlimited' as const : currentTier === 'growth' ? 5 : 2 },
  };

  // Mock billing history
  const invoices = [
    { date: 'Jan 25, 2026', description: 'Growth Plan', amount: 299 },
    { date: 'Dec 25, 2025', description: 'Growth Plan', amount: 299 },
    { date: 'Nov 25, 2025', description: 'Starter Plan', amount: 149 },
  ];

  const handleUpgrade = async (planId: string) => {
    setIsUpgrading(true);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to start checkout');
      }

      // Redirect to Stripe Checkout
      if (data.data?.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
      setIsUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    setIsOpeningPortal(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to open billing portal');
      }

      // Redirect to Stripe Portal
      if (data.data?.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open billing portal');
      setIsOpeningPortal(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }

    setIsCancelling(true);
    try {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediately: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to cancel subscription');
      }

      toast.success('Subscription will be cancelled at the end of your billing period');
      refetch?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings" className="p-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Billing</h1>
        </div>
        <div className="max-w-4xl animate-pulse space-y-6">
          <div className="bg-surface rounded-xl p-6 h-32" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-surface rounded-xl p-6 h-64" />
            ))}
          </div>
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
        <h1 className="text-2xl font-bold text-white">Billing</h1>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Trial Banner or Current Plan */}
        {isTrialing ? (
          <div className="bg-gradient-to-r from-accent/20 to-purple-500/20 rounded-xl p-6 border border-accent/30">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  You're on a free trial!
                </h2>
                <p className="text-gray-300">
                  Your trial includes all Starter features. Add payment to continue after your trial ends.
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{trialDaysLeft}</p>
                <p className="text-sm text-gray-400">days left</p>
              </div>
            </div>

            <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full"
                style={{ width: `${((30 - trialDaysLeft) / 30) * 100}%` }}
              />
            </div>

            <button
              onClick={() => handleUpgrade('starter')}
              disabled={isUpgrading}
              className="mt-4 px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isUpgrading && <Loader2 className="w-4 h-4 animate-spin" />}
              Start Subscription
            </button>
          </div>
        ) : (
          <div className="bg-surface rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Plan</p>
                <h2 className="text-xl font-bold text-white capitalize">
                  {currentTier} Plan
                </h2>
                <p className="text-gray-400">
                  ${PLANS.find(p => p.id === currentTier)?.price}/month
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleManageBilling}
                  disabled={isOpeningPortal}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isOpeningPortal && <Loader2 className="w-4 h-4 animate-spin" />}
                  Manage Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={isCancelling}
                  className="px-4 py-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isCancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Plan Selection */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            {isTrialing ? 'Choose Your Plan' : 'Available Plans'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={currentTier === plan.id}
                onSelect={() => handleUpgrade(plan.id)}
                isLoading={isUpgrading}
              />
            ))}
          </div>
        </section>

        {/* Usage Section */}
        {!isTrialing && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Usage This Month
            </h2>
            <div className="bg-surface rounded-xl p-6 space-y-5">
              <UsageMeter
                label="SMS Messages"
                used={usage.sms.used}
                total={usage.sms.total}
              />
              <UsageMeter
                label="AI Voice Minutes"
                used={usage.aiMinutes.used}
                total={usage.aiMinutes.total}
                unit="min"
              />
              <UsageMeter
                label="Team Members"
                used={usage.teamMembers.used}
                total={usage.teamMembers.total}
              />
            </div>
          </section>
        )}

        {/* Payment Method */}
        {!isTrialing && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Payment Method
            </h2>
            <div className="bg-surface rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Visa ending in 4242</p>
                    <p className="text-sm text-gray-500">Expires 12/2027</p>
                  </div>
                </div>
                <button
                  onClick={handleManageBilling}
                  className="text-accent hover:text-accent/80 text-sm font-medium"
                >
                  Update Card
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Billing History */}
        {!isTrialing && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Billing History
            </h2>
            <div className="bg-surface rounded-xl divide-y divide-white/10">
              {invoices.map((invoice, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-white">{invoice.date}</p>
                    <p className="text-sm text-gray-500">{invoice.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white font-medium">${invoice.amount}</span>
                    <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
