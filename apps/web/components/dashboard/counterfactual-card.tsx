'use client';

/**
 * Counterfactual Comparison Card
 *
 * Shows what would have happened without ServiceFlow.
 */

import { PhoneOff, AlertTriangle, TrendingDown } from 'lucide-react';

interface CounterfactualCardProps {
  missedCallsWithoutServiceFlow: number;
  lostRevenueDollars: number;
  industryMissedCallRate: number;
  isLoading?: boolean;
}

export function CounterfactualCard({
  missedCallsWithoutServiceFlow,
  lostRevenueDollars,
  industryMissedCallRate,
  isLoading = false,
}: CounterfactualCardProps) {
  if (isLoading) {
    return (
      <div className="bg-navy-800 rounded-xl p-6 animate-pulse">
        <div className="h-6 w-48 bg-navy-700 rounded mb-4" />
        <div className="h-20 w-full bg-navy-700 rounded mb-4" />
        <div className="h-4 w-64 bg-navy-700 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-navy-800 rounded-xl p-6 border border-navy-700">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-red-500/10">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">
          Without ServiceFlow
        </h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-navy-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <PhoneOff className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-400">Missed Calls</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {missedCallsWithoutServiceFlow}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Based on {industryMissedCallRate}% industry average
          </div>
        </div>

        <div className="bg-navy-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-400">Lost Revenue</span>
          </div>
          <div className="text-2xl font-bold text-red-400">
            ${lostRevenueDollars.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Potential revenue from missed calls
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
        <p className="text-sm text-gray-300">
          <strong className="text-red-400">Industry data shows</strong> that{' '}
          {industryMissedCallRate}% of inbound calls to home service businesses
          go unanswered. ServiceFlow ensures you never miss an opportunity.
        </p>
      </div>
    </div>
  );
}

export default CounterfactualCard;
