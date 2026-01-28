'use client';

/**
 * ROI Hero Card Component
 *
 * Large display card showing the headline ROI metric with multiplier.
 */

import { TrendingUp, DollarSign, Sparkles } from 'lucide-react';

interface ROIHeroCardProps {
  roiDollars: number;
  roiMultiplier: number;
  periodLabel: string;
  isLoading?: boolean;
}

export function ROIHeroCard({
  roiDollars,
  roiMultiplier,
  periodLabel,
  isLoading = false,
}: ROIHeroCardProps) {
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-8 animate-pulse">
        <div className="h-6 w-48 bg-white/20 rounded mb-4" />
        <div className="h-16 w-64 bg-white/20 rounded mb-2" />
        <div className="h-8 w-32 bg-white/20 rounded" />
      </div>
    );
  }

  const isPositive = roiDollars > 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-8 ${
        isPositive
          ? 'bg-gradient-to-br from-green-600 to-emerald-700'
          : 'bg-gradient-to-br from-gray-600 to-gray-700'
      }`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
        <DollarSign className="w-full h-full" />
      </div>

      {/* Sparkle icon */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-white/80" />
        <span className="text-white/80 text-sm font-medium uppercase tracking-wider">
          Your ROI {periodLabel}
        </span>
      </div>

      {/* Main ROI value */}
      <div className="relative">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl md:text-6xl font-bold text-white">
            ${roiDollars.toLocaleString()}
          </span>
          {roiMultiplier > 0 && (
            <span className="text-2xl font-semibold text-white/90">
              ({roiMultiplier}x return)
            </span>
          )}
        </div>

        {/* Trend indicator */}
        {isPositive && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full">
              <TrendingUp className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">
                Growing your business
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Caption */}
      <p className="mt-6 text-white/70 text-sm max-w-md">
        This includes revenue from recovered calls and time saved by ServiceFlow
        automation, minus your subscription cost.
      </p>
    </div>
  );
}

export default ROIHeroCard;
