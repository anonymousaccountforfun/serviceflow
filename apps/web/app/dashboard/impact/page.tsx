'use client';

/**
 * Impact Dashboard Page
 *
 * Shows ROI metrics, funnel visualization, and counterfactual comparison.
 */

import { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Calendar, Download, Share2, RefreshCw, ChevronDown, Copy, Check, X } from 'lucide-react';
import { ROIHeroCard } from '../../../components/dashboard/roi-hero-card';
import { ImpactMetricsRow } from '../../../components/dashboard/impact-metrics-row';
import { FunnelVisualization } from '../../../components/dashboard/funnel-visualization';
import { CounterfactualCard } from '../../../components/dashboard/counterfactual-card';

type Period = 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days';

interface ROIData {
  roiDollars: number;
  roiMultiplier: number;
  callsRecovered: number;
  callsAnsweredByAI: number;
  callsRecoveredByTextBack: number;
  revenueFromRecoveredCalls: number;
  timeSavedMinutes: number;
}

interface FunnelData {
  call_received: number;
  lead_created: number;
  quote_sent: number;
  quote_approved: number;
  job_scheduled: number;
  job_completed: number;
  payment_collected: number;
  lost: number;
}

interface CounterfactualData {
  missedCallsWithoutServiceFlow: number;
  lostRevenueWithoutServiceFlow: number;
  industryMissedCallRate: number;
}

export default function ImpactDashboard() {
  const [period, setPeriod] = useState<Period>('this_month');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roiData, setRoiData] = useState<ROIData | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [counterfactualData, setCounterfactualData] = useState<CounterfactualData | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get date range for period
  function getDateRange(p: Period): { start: string; end: string } {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (p) {
      case 'this_month':
        start = startOfMonth(now);
        end = now;
        break;
      case 'last_month':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case 'last_30_days':
        start = subDays(now, 30);
        end = now;
        break;
      case 'last_90_days':
        start = subDays(now, 90);
        end = now;
        break;
      default:
        start = startOfMonth(now);
        end = now;
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // Get period label for display
  function getPeriodLabel(p: Period): string {
    switch (p) {
      case 'this_month':
        return 'This Month';
      case 'last_month':
        return 'Last Month';
      case 'last_30_days':
        return 'Last 30 Days';
      case 'last_90_days':
        return 'Last 90 Days';
      default:
        return 'This Month';
    }
  }

  // Fetch all data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { start, end } = getDateRange(period);

      try {
        const [roiRes, funnelRes, counterfactualRes] = await Promise.all([
          fetch(`/api/analytics/roi?start=${start}&end=${end}`),
          fetch(`/api/analytics/funnel?start=${start}&end=${end}`),
          fetch(`/api/analytics/counterfactual?start=${start}&end=${end}`),
        ]);

        if (roiRes.ok) {
          const data = await roiRes.json();
          setRoiData(data.data);
        }

        if (funnelRes.ok) {
          const data = await funnelRes.json();
          setFunnelData(data.data);
        }

        if (counterfactualRes.ok) {
          const data = await counterfactualRes.json();
          setCounterfactualData(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch impact data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [period]);

  // Generate share link
  async function generateShareLink() {
    setShareLoading(true);
    try {
      const response = await fetch('/api/share/roi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, expiresInDays: 7 }),
      });
      const data = await response.json();
      if (data.success) {
        setShareUrl(data.data.shareUrl);
        setShowShareModal(true);
      }
    } catch (error) {
      console.error('Failed to generate share link:', error);
    } finally {
      setShareLoading(false);
    }
  }

  // Copy share URL
  function copyShareUrl() {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Your ServiceFlow Impact</h1>
          <p className="text-gray-400 mt-1">
            See how ServiceFlow is growing your business
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="relative">
            <button
              onClick={() => setShowPeriodMenu(!showPeriodMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white hover:bg-navy-700 transition-colors"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{getPeriodLabel(period)}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showPeriodMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowPeriodMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-navy-800 border border-navy-700 rounded-lg shadow-lg z-20 py-1">
                  {(['this_month', 'last_month', 'last_30_days', 'last_90_days'] as Period[]).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setPeriod(p);
                          setShowPeriodMenu(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-navy-700 transition-colors ${
                          period === p ? 'text-blue-400' : 'text-white'
                        }`}
                      >
                        {getPeriodLabel(p)}
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* Share button */}
          <button
            onClick={generateShareLink}
            disabled={shareLoading}
            className="p-2 bg-navy-800 border border-navy-700 rounded-lg text-gray-400 hover:text-white hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            <Share2 className={`w-5 h-5 ${shareLoading ? 'animate-pulse' : ''}`} />
          </button>

          {/* Refresh button */}
          <button
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 500);
            }}
            className="p-2 bg-navy-800 border border-navy-700 rounded-lg text-gray-400 hover:text-white hover:bg-navy-700 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ROI Hero Card */}
      <ROIHeroCard
        roiDollars={roiData?.roiDollars || 0}
        roiMultiplier={roiData?.roiMultiplier || 0}
        periodLabel={getPeriodLabel(period)}
        isLoading={loading}
      />

      {/* Metrics Row */}
      <ImpactMetricsRow
        callsRecovered={roiData?.callsRecovered || 0}
        callsAnsweredByAI={roiData?.callsAnsweredByAI || 0}
        callsRecoveredByTextBack={roiData?.callsRecoveredByTextBack || 0}
        revenueDollars={Math.round((roiData?.revenueFromRecoveredCalls || 0) / 100)}
        hoursSaved={(roiData?.timeSavedMinutes || 0) / 60}
        isLoading={loading}
      />

      {/* Two-column layout for funnel and counterfactual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Visualization */}
        <FunnelVisualization
          metrics={
            funnelData || {
              call_received: 0,
              lead_created: 0,
              quote_sent: 0,
              quote_approved: 0,
              job_scheduled: 0,
              job_completed: 0,
              payment_collected: 0,
              lost: 0,
            }
          }
          isLoading={loading}
        />

        {/* Counterfactual Card */}
        <CounterfactualCard
          missedCallsWithoutServiceFlow={
            counterfactualData?.missedCallsWithoutServiceFlow || 0
          }
          lostRevenueDollars={Math.round(
            (counterfactualData?.lostRevenueWithoutServiceFlow || 0) / 100
          )}
          industryMissedCallRate={counterfactualData?.industryMissedCallRate || 62}
          isLoading={loading}
        />
      </div>

      {/* Footer note */}
      <div className="text-center text-sm text-gray-500 py-4">
        <p>
          Data is calculated in real-time from your ServiceFlow call attribution.{' '}
          <a href="#" className="text-blue-400 hover:underline">
            Learn how we calculate ROI
          </a>
        </p>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setShowShareModal(false)}
          />
          <div className="relative bg-navy-800 rounded-xl p-6 max-w-md w-full border border-navy-700 shadow-xl">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-white mb-2">
              Share Your Impact
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Share your ROI results with others. This link expires in 7 days.
            </p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={shareUrl || ''}
                className="flex-1 px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm"
              />
              <button
                onClick={copyShareUrl}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="flex gap-2">
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl || '')}&text=${encodeURIComponent('Check out my ServiceFlow impact!')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-[#1DA1F2] text-white rounded-lg text-center text-sm font-medium hover:bg-[#1DA1F2]/80 transition-colors"
              >
                Share on Twitter
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-[#0A66C2] text-white rounded-lg text-center text-sm font-medium hover:bg-[#0A66C2]/80 transition-colors"
              >
                Share on LinkedIn
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
