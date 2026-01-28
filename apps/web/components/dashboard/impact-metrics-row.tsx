'use client';

/**
 * Impact Metrics Row Component
 *
 * Three-card row showing key impact metrics: calls recovered, revenue captured, hours saved.
 */

import { Phone, DollarSign, Clock, TrendingUp } from 'lucide-react';

interface ImpactMetricsRowProps {
  callsRecovered: number;
  callsAnsweredByAI: number;
  callsRecoveredByTextBack: number;
  revenueDollars: number;
  hoursSaved: number;
  isLoading?: boolean;
}

export function ImpactMetricsRow({
  callsRecovered,
  callsAnsweredByAI,
  callsRecoveredByTextBack,
  revenueDollars,
  hoursSaved,
  isLoading = false,
}: ImpactMetricsRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-navy-800 rounded-xl p-6 animate-pulse">
            <div className="h-10 w-10 bg-navy-700 rounded-lg mb-4" />
            <div className="h-8 w-24 bg-navy-700 rounded mb-2" />
            <div className="h-4 w-32 bg-navy-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Calls Recovered */}
      <div className="bg-navy-800 rounded-xl p-6 border border-navy-700">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-lg bg-blue-500/10">
            <Phone className="w-6 h-6 text-blue-400" />
          </div>
          <TrendingUp className="w-5 h-5 text-green-400" />
        </div>
        <div className="text-3xl font-bold text-white mb-1">
          {callsRecovered}
        </div>
        <div className="text-sm text-gray-400 mb-3">Calls Recovered</div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span>
            <span className="text-blue-400 font-medium">{callsAnsweredByAI}</span> AI
          </span>
          <span>
            <span className="text-cyan-400 font-medium">{callsRecoveredByTextBack}</span> Text-back
          </span>
        </div>
      </div>

      {/* Revenue Captured */}
      <div className="bg-navy-800 rounded-xl p-6 border border-navy-700">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-lg bg-green-500/10">
            <DollarSign className="w-6 h-6 text-green-400" />
          </div>
          <TrendingUp className="w-5 h-5 text-green-400" />
        </div>
        <div className="text-3xl font-bold text-white mb-1">
          ${revenueDollars.toLocaleString()}
        </div>
        <div className="text-sm text-gray-400 mb-3">Revenue Captured</div>
        <div className="text-xs text-gray-500">
          From recovered calls that converted to jobs
        </div>
      </div>

      {/* Hours Saved */}
      <div className="bg-navy-800 rounded-xl p-6 border border-navy-700">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-lg bg-amber-500/10">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
          <TrendingUp className="w-5 h-5 text-green-400" />
        </div>
        <div className="text-3xl font-bold text-white mb-1">
          {hoursSaved.toFixed(1)}
        </div>
        <div className="text-sm text-gray-400 mb-3">Hours Saved</div>
        <div className="text-xs text-gray-500">
          From AI calls and automated text-backs
        </div>
      </div>
    </div>
  );
}

export default ImpactMetricsRow;
