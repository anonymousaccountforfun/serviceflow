'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Plus,
  Briefcase,
  MessageSquare,
  CheckCircle2,
  Users,
  Clock,
  MapPin,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { api } from '../../lib/api';

// Large metric display component
function MetricBlock({
  label,
  value,
  subValue,
  trend,
  trendLabel,
  variant = 'default',
  icon: Icon,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number | null;
  trendLabel?: string;
  variant?: 'default' | 'success' | 'danger' | 'accent';
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const variantStyles = {
    default: 'bg-surface',
    success: 'bg-success/10 border-l-4 border-success',
    danger: 'bg-danger/10 border-l-4 border-danger',
    accent: 'bg-accent/10 border-l-4 border-accent',
  };

  return (
    <div className={`${variantStyles[variant]} rounded-lg p-5 lg:p-6`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        {Icon && <Icon className="w-5 h-5 text-gray-500" />}
      </div>
      <div className="flex items-end gap-3">
        <span className="text-5xl lg:text-6xl font-bold text-white tabular-nums">
          {value}
        </span>
        {subValue && (
          <span className="text-lg text-gray-500 mb-2">{subValue}</span>
        )}
      </div>
      {trend !== undefined && trend !== null && (
        <div className="flex items-center gap-1 mt-3">
          {trend >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          {trendLabel && (
            <span className="text-sm text-gray-500 ml-1">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Call stats with visual split bar
function CallStats({ answered, missed }: { answered: number; missed: number }) {
  const total = answered + missed;
  const answeredPercent = total > 0 ? (answered / total) * 100 : 100;

  return (
    <div className="bg-surface rounded-lg p-5 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Today's Calls
        </span>
        <Phone className="w-5 h-5 text-gray-500" />
      </div>

      {/* Large total */}
      <div className="text-6xl lg:text-7xl font-bold text-white tabular-nums mb-6">
        {total}
      </div>

      {/* Split bar visualization */}
      <div className="h-3 bg-navy-800 rounded-full overflow-hidden flex mb-4">
        <div
          className="bg-green-500 transition-all duration-500"
          style={{ width: `${answeredPercent}%` }}
        />
        <div
          className="bg-red-500 transition-all duration-500"
          style={{ width: `${100 - answeredPercent}%` }}
        />
      </div>

      {/* Side by side stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
            <PhoneIncoming className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white tabular-nums">{answered}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Answered</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
            <PhoneOff className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white tabular-nums">{missed}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Missed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Revenue display - prominent
function RevenueBlock({ amount, trend }: { amount: number; trend?: number | null }) {
  const formatted = (amount / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-lg p-5 lg:p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-orange-400 uppercase tracking-wide">
          Revenue This Month
        </span>
        <DollarSign className="w-5 h-5 text-orange-400" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl text-orange-400 font-bold">$</span>
        <span className="text-6xl lg:text-7xl font-bold text-white tabular-nums">{formatted}</span>
      </div>
      {trend !== undefined && trend !== null && (
        <div className="flex items-center gap-1 mt-4">
          {trend >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend > 0 ? '+' : ''}{trend}% vs last month
          </span>
        </div>
      )}
    </div>
  );
}

// Action required section
function ActionRequired({ jobs }: { jobs: any[] }) {
  if (jobs.length === 0) return null;

  return (
    <div className="bg-yellow-500/10 border-l-4 border-yellow-500 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        <span className="text-sm font-semibold text-yellow-500 uppercase tracking-wide">
          Needs Attention
        </span>
      </div>
      <div className="space-y-3">
        {jobs.slice(0, 3).map((job) => (
          <Link
            key={job.id}
            href={`/dashboard/jobs/${job.id}`}
            className="flex items-center justify-between p-3 bg-navy-900/50 rounded-lg hover:bg-navy-800 transition-colors min-h-[44px]"
          >
            <div>
              <p className="text-white font-medium">{job.title}</p>
              <p className="text-sm text-gray-500">{job.customer?.firstName} {job.customer?.lastName}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// Empty state with action
function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="bg-surface rounded-lg p-8 text-center">
      <div className="w-16 h-16 rounded-xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
      <Link
        href={actionHref}
        className="inline-flex items-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors min-h-[44px]"
      >
        <Plus className="w-4 h-4" />
        {actionLabel}
      </Link>
    </div>
  );
}

// Today's Schedule widget - accepts appointments as prop to avoid separate API call
function TodaySchedule({ appointments, isLoading }: { appointments: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-surface rounded-lg p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Today's Schedule
          </span>
          <Clock className="w-5 h-5 text-gray-500" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-navy-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg p-5 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Today's Schedule
        </span>
        <Link href="/dashboard/calendar" className="text-sm text-orange-500 hover:text-orange-400 font-medium">
          View All
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-6">
          <Clock className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500">No appointments today</p>
          <Link
            href="/dashboard/calendar"
            className="inline-block mt-3 text-sm text-orange-500 hover:text-orange-400 font-medium"
          >
            View calendar
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.slice(0, 4).map((apt: any) => {
            const address = apt.customer?.address
              ? `${apt.customer.address}, ${apt.customer.city || ''}`
              : '';
            const mapsUrl = address
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
              : '';

            return (
              <Link
                key={apt.id}
                href={`/dashboard/jobs/${apt.job?.id}`}
                className="flex items-start gap-3 p-3 bg-navy-800 rounded-lg hover:bg-navy-700 transition-colors min-h-[72px]"
              >
                <div className="w-12 text-center flex-shrink-0">
                  <p className="text-lg font-bold text-white">
                    {format(new Date(apt.scheduledAt), 'h:mm')}
                  </p>
                  <p className="text-xs text-gray-500 uppercase">
                    {format(new Date(apt.scheduledAt), 'a')}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{apt.job?.title}</p>
                  <p className="text-sm text-gray-400 truncate">
                    {apt.customer?.firstName} {apt.customer?.lastName}
                  </p>
                  {address && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
                    >
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{apt.customer?.city || 'Get directions'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1" />
              </Link>
            );
          })}
          {appointments.length > 4 && (
            <p className="text-center text-sm text-gray-500">
              + {appointments.length - 4} more appointments
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Quick action buttons
function QuickActions() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Link
        href="/dashboard/jobs"
        className="flex items-center gap-3 p-4 bg-surface rounded-lg hover:bg-surface-light transition-colors min-h-[56px]"
      >
        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
          <Plus className="w-5 h-5 text-orange-500" />
        </div>
        <span className="text-sm font-semibold text-white">New Job</span>
      </Link>
      <Link
        href="/dashboard/calendar"
        className="flex items-center gap-3 p-4 bg-surface rounded-lg hover:bg-surface-light transition-colors min-h-[56px]"
      >
        <div className="w-10 h-10 rounded-lg bg-navy-700 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        <span className="text-sm font-semibold text-white">Schedule</span>
      </Link>
      <Link
        href="/dashboard/inbox"
        className="flex items-center gap-3 p-4 bg-surface rounded-lg hover:bg-surface-light transition-colors min-h-[56px]"
      >
        <div className="w-10 h-10 rounded-lg bg-navy-700 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-gray-400" />
        </div>
        <span className="text-sm font-semibold text-white">Messages</span>
      </Link>
      <Link
        href="/dashboard/customers"
        className="flex items-center gap-3 p-4 bg-surface rounded-lg hover:bg-surface-light transition-colors min-h-[56px]"
      >
        <div className="w-10 h-10 rounded-lg bg-navy-700 flex items-center justify-center">
          <Users className="w-5 h-5 text-gray-400" />
        </div>
        <span className="text-sm font-semibold text-white">Customers</span>
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  // Single API call for all dashboard data - optimized from 3 calls to 1
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboardData(),
    // Cache for 30 seconds to prevent unnecessary refetches
    staleTime: 30 * 1000,
  });

  const data = dashboardData?.data;

  const callsAnswered = data?.calls?.answered || 0;
  const callsMissed = data?.calls?.missed || 0;
  const revenue = data?.revenue?.total || 0;
  const revenueTrend = data?.revenue?.change || null;
  const jobsCompleted = data?.jobs?.completed || 0;
  const jobsTrend = data?.jobs?.change || null;
  const newCustomers = data?.customers?.new || 0;
  const customersTrend = data?.customers?.change || null;
  const pendingJobs = data?.pendingJobs || [];
  const todayAppointments = data?.todayAppointments || [];

  const hasData = callsAnswered > 0 || callsMissed > 0 || revenue > 0;

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <QuickActions />

      {/* Primary Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calls - Most important for immediate awareness */}
        <CallStats answered={callsAnswered} missed={callsMissed} />

        {/* Revenue - The number they care about most */}
        <RevenueBlock amount={revenue} trend={revenueTrend} />

        {/* Jobs completed */}
        <MetricBlock
          label="Jobs Completed"
          value={jobsCompleted}
          subValue="this week"
          trend={jobsTrend}
          trendLabel="vs last week"
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Today's Schedule - appointments passed as prop to avoid separate API call */}
      <TodaySchedule appointments={todayAppointments} isLoading={isLoading} />

      {/* Secondary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Action Required */}
        {pendingJobs.length > 0 ? (
          <ActionRequired jobs={pendingJobs} />
        ) : (
          <div className="bg-surface rounded-lg p-5 lg:p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                All Caught Up
              </span>
            </div>
            <p className="text-gray-500">No pending items need your attention right now.</p>
          </div>
        )}

        {/* New Customers */}
        <MetricBlock
          label="New Customers"
          value={newCustomers}
          subValue="this week"
          trend={customersTrend}
          trendLabel="vs last week"
          icon={Users}
        />
      </div>

      {/* Empty State for new users */}
      {!hasData && (
        <EmptyState
          icon={Briefcase}
          title="Ready to get started?"
          description="Create your first job to start tracking your work and see your metrics come to life."
          actionLabel="Create First Job"
          actionHref="/dashboard/jobs"
        />
      )}
    </div>
  );
}
