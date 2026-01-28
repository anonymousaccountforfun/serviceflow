'use client';

/**
 * Funnel Visualization Component
 *
 * Visual representation of the call-to-payment conversion funnel.
 */

import {
  Phone,
  UserPlus,
  FileText,
  ThumbsUp,
  Calendar,
  CheckCircle,
  DollarSign,
  XCircle,
} from 'lucide-react';

interface FunnelMetrics {
  call_received: number;
  lead_created: number;
  quote_sent: number;
  quote_approved: number;
  job_scheduled: number;
  job_completed: number;
  payment_collected: number;
  lost: number;
}

interface FunnelVisualizationProps {
  metrics: FunnelMetrics;
  isLoading?: boolean;
}

const FUNNEL_STAGES = [
  { key: 'call_received', label: 'Calls Received', icon: Phone, color: 'blue' },
  { key: 'lead_created', label: 'Leads Created', icon: UserPlus, color: 'cyan' },
  { key: 'quote_sent', label: 'Quotes Sent', icon: FileText, color: 'indigo' },
  { key: 'quote_approved', label: 'Quotes Approved', icon: ThumbsUp, color: 'purple' },
  { key: 'job_scheduled', label: 'Jobs Scheduled', icon: Calendar, color: 'pink' },
  { key: 'job_completed', label: 'Jobs Completed', icon: CheckCircle, color: 'amber' },
  { key: 'payment_collected', label: 'Payments Collected', icon: DollarSign, color: 'green' },
] as const;

const COLOR_CLASSES: Record<string, { bg: string; text: string; bar: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', bar: 'bg-blue-500' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', bar: 'bg-cyan-500' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', bar: 'bg-indigo-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', bar: 'bg-purple-500' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', bar: 'bg-pink-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', bar: 'bg-amber-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', bar: 'bg-green-500' },
};

export function FunnelVisualization({
  metrics,
  isLoading = false,
}: FunnelVisualizationProps) {
  if (isLoading) {
    return (
      <div className="bg-navy-800 rounded-xl p-6 animate-pulse">
        <div className="h-6 w-32 bg-navy-700 rounded mb-6" />
        <div className="space-y-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-16 bg-navy-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate max for percentage widths
  const maxCount = Math.max(...FUNNEL_STAGES.map((s) => metrics[s.key as keyof FunnelMetrics] as number), 1);

  // Calculate conversion rates between stages
  const conversionRates: (number | null)[] = FUNNEL_STAGES.map((stage, idx) => {
    if (idx === 0) return null;
    const prevStage = FUNNEL_STAGES[idx - 1];
    const prevValue = metrics[prevStage.key as keyof FunnelMetrics] as number;
    const currentValue = metrics[stage.key as keyof FunnelMetrics] as number;
    if (prevValue === 0) return 0;
    return Math.round((currentValue / prevValue) * 100);
  });

  // Overall conversion rate
  const overallConversion =
    metrics.call_received > 0
      ? Math.round((metrics.payment_collected / metrics.call_received) * 100)
      : 0;

  return (
    <div className="bg-navy-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Conversion Funnel</h3>
        <div className="text-sm text-gray-400">
          Overall: <span className="text-green-400 font-medium">{overallConversion}%</span>
        </div>
      </div>

      {/* Funnel stages */}
      <div className="space-y-3">
        {FUNNEL_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const colors = COLOR_CLASSES[stage.color];
          const count = metrics[stage.key as keyof FunnelMetrics] as number;
          const percentage = (count / maxCount) * 100;
          const conversionRate = conversionRates[idx];

          return (
            <div key={stage.key} className="relative">
              {/* Conversion arrow (except for first stage) */}
              {idx > 0 && conversionRate !== null && (
                <div className="absolute -top-2 left-8 text-xs text-gray-500">
                  ↓ {conversionRate}%
                </div>
              )}

              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>

                {/* Bar container */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{stage.label}</span>
                    <span className="text-sm font-medium text-white">{count}</span>
                  </div>
                  <div className="h-2 bg-navy-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lost leads */}
      {metrics.lost > 0 && (
        <div className="mt-6 pt-4 border-t border-navy-700">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Lost / Did Not Convert</span>
                <span className="text-sm font-medium text-red-400">{metrics.lost}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FunnelVisualization;
