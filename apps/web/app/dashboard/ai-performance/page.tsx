'use client';

import { useQuery } from '@tanstack/react-query';
import { Bot, Phone, Calendar, DollarSign, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';

function MetricCard({ label, value, subValue, icon: Icon, color = 'blue' }: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
}) {
  const colorMap = {
    blue: { icon: 'text-blue-400', bg: 'bg-blue-500/20' },
    green: { icon: 'text-green-400', bg: 'bg-green-500/20' },
    orange: { icon: 'text-orange-400', bg: 'bg-orange-500/20' },
    purple: { icon: 'text-purple-400', bg: 'bg-purple-500/20' },
    red: { icon: 'text-red-400', bg: 'bg-red-500/20' },
  };

  return (
    <div className="bg-surface rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
        <div className={`p-2 rounded-lg ${colorMap[color].bg}`}>
          <Icon className={`w-5 h-5 ${colorMap[color].icon}`} />
        </div>
      </div>
      <div className="text-4xl font-bold text-white">{value}</div>
      {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="text-gray-400">Loading AI performance metrics...</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-surface rounded-lg p-5 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-24 mb-4" />
            <div className="h-10 bg-gray-700 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AIPerformancePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'ai-roi'],
    queryFn: () => api.getAIROIAnalytics(),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
        <p className="text-red-400">Failed to load AI performance metrics. Please try again.</p>
      </div>
    );
  }

  const stats = data?.data || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-400" />
          AI Voice Performance
        </h1>
        <p className="text-gray-500 mt-1">See how your AI assistant is driving revenue</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Calls Answered"
          value={stats.callsAnsweredByAI?.total || 0}
          subValue={`${stats.callsAnsweredByAI?.percentage || 0}% of all calls`}
          icon={Phone}
          color="green"
        />
        <MetricCard
          label="Appointments Booked"
          value={stats.appointmentsBookedByAI?.count || 0}
          subValue="by AI this period"
          icon={Calendar}
          color="blue"
        />
        <MetricCard
          label="Estimated Value"
          value={stats.appointmentsBookedByAI?.formatted || '$0'}
          subValue="from AI bookings"
          icon={DollarSign}
          color="orange"
        />
        <MetricCard
          label="After-Hours Handled"
          value={stats.afterHoursCallsHandled || 0}
          subValue="calls you would have missed"
          icon={Clock}
          color="purple"
        />
      </div>

      <div className="bg-surface rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Call Breakdown</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stats.emergencyVsRoutine?.emergency || 0}</p>
              <p className="text-sm text-gray-500">Emergency Calls</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stats.emergencyVsRoutine?.routine || 0}</p>
              <p className="text-sm text-gray-500">Routine Bookings</p>
            </div>
          </div>
        </div>
      </div>

      {stats.period && (
        <p className="text-xs text-gray-600">
          Data from {new Date(stats.period.start).toLocaleDateString()} to {new Date(stats.period.end).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
