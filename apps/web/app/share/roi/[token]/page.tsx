'use client';

/**
 * Shareable ROI Report Page
 *
 * Public page showing ROI metrics via share token.
 * Includes social sharing buttons and branding.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  TrendingUp,
  Phone,
  DollarSign,
  Clock,
  AlertTriangle,
  Share2,
  Twitter,
  Linkedin,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface ROIData {
  roiDollars: number;
  roiMultiplier: number;
  callsRecovered: number;
  callsAnsweredByAI: number;
  callsRecoveredByTextBack: number;
  revenueFromRecoveredCalls: number;
  hoursSaved: number;
}

interface CounterfactualData {
  missedCallsWithoutServiceFlow: number;
  lostRevenueWithoutServiceFlow: number;
  industryMissedCallRate: number;
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

interface ShareData {
  businessName: string;
  periodLabel: string;
  roi: ROIData;
  counterfactual: CounterfactualData;
  funnel: FunnelData;
  expiresAt: string;
}

export default function SharedROIPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/share/roi/${token}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to load data');
        }

        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTwitter = () => {
    if (!data) return;
    const text = `${data.businessName} achieved $${data.roi.roiDollars.toLocaleString()} ROI with @ServiceFlowApp! ${data.roi.callsRecovered} calls recovered, ${data.roi.hoursSaved} hours saved.`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`,
      '_blank'
    );
  };

  const handleShareLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
      '_blank'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading impact report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Report Not Available</h1>
          <p className="text-gray-400">
            {error || 'This report may have expired or the link is invalid.'}
          </p>
          <a
            href="https://serviceflow.app"
            className="mt-6 inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 transition-colors"
          >
            Learn About ServiceFlow
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#1e293b]/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">ServiceFlow</span>
          </div>
          <a
            href="https://serviceflow.app"
            className="text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            Get ServiceFlow
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {data.businessName}'s ServiceFlow Impact
          </h1>
          <p className="text-gray-400">{data.periodLabel}</p>
        </div>

        {/* ROI Hero */}
        <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 opacity-10">
            <DollarSign className="w-full h-full" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-white/80" />
            <span className="text-white/80 text-sm font-medium uppercase tracking-wider">
              Total ROI
            </span>
          </div>
          <div className="text-5xl md:text-6xl font-bold text-white mb-2">
            ${data.roi.roiDollars.toLocaleString()}
          </div>
          {data.roi.roiMultiplier > 0 && (
            <div className="text-xl text-white/90">
              {data.roi.roiMultiplier}x return on investment
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Calls Recovered */}
          <div className="bg-[#1e293b] rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Phone className="w-6 h-6 text-blue-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {data.roi.callsRecovered}
            </div>
            <div className="text-sm text-gray-400 mb-3">Calls Recovered</div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>
                <span className="text-blue-400 font-medium">
                  {data.roi.callsAnsweredByAI}
                </span>{' '}
                AI
              </span>
              <span>
                <span className="text-cyan-400 font-medium">
                  {data.roi.callsRecoveredByTextBack}
                </span>{' '}
                Text-back
              </span>
            </div>
          </div>

          {/* Revenue Captured */}
          <div className="bg-[#1e293b] rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              ${data.roi.revenueFromRecoveredCalls.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400 mb-3">Revenue Captured</div>
            <div className="text-xs text-gray-500">From recovered calls</div>
          </div>

          {/* Hours Saved */}
          <div className="bg-[#1e293b] rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {data.roi.hoursSaved}
            </div>
            <div className="text-sm text-gray-400 mb-3">Hours Saved</div>
            <div className="text-xs text-gray-500">Through automation</div>
          </div>
        </div>

        {/* Counterfactual */}
        <div className="bg-[#1e293b] rounded-xl p-6 border border-red-500/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Without ServiceFlow
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#0f172a] rounded-lg p-4">
              <div className="text-2xl font-bold text-white">
                {data.counterfactual.missedCallsWithoutServiceFlow}
              </div>
              <div className="text-sm text-gray-400">Missed Calls</div>
              <div className="text-xs text-gray-500 mt-1">
                Based on {data.counterfactual.industryMissedCallRate}% industry avg
              </div>
            </div>
            <div className="bg-[#0f172a] rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">
                ${data.counterfactual.lostRevenueWithoutServiceFlow.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Lost Revenue</div>
              <div className="text-xs text-gray-500 mt-1">Potential revenue lost</div>
            </div>
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
            <p className="text-sm text-gray-300">
              <strong className="text-red-400">Industry data shows</strong> that{' '}
              {data.counterfactual.industryMissedCallRate}% of inbound calls to home
              service businesses go unanswered. ServiceFlow ensures you never miss an
              opportunity.
            </p>
          </div>
        </div>

        {/* Share Section */}
        <div className="bg-[#1e293b] rounded-xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-white">Share This Report</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleShareTwitter}
              className="flex items-center gap-2 px-4 py-2 bg-[#1DA1F2]/20 text-[#1DA1F2] rounded-lg hover:bg-[#1DA1F2]/30 transition-colors"
            >
              <Twitter className="w-5 h-5" />
              Twitter
            </button>
            <button
              onClick={handleShareLinkedIn}
              className="flex items-center gap-2 px-4 py-2 bg-[#0A66C2]/20 text-[#0A66C2] rounded-lg hover:bg-[#0A66C2]/30 transition-colors"
            >
              <Linkedin className="w-5 h-5" />
              LinkedIn
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-8">
          <h3 className="text-xl font-bold text-white mb-2">
            Ready to Never Miss Another Call?
          </h3>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            ServiceFlow helps home service businesses recover missed calls, automate
            follow-ups, and grow revenue with AI.
          </p>
          <a
            href="https://serviceflow.app/signup"
            className="inline-block px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 transition-colors"
          >
            Start Free Trial
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-8 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Powered by ServiceFlow - Never miss another call.</p>
          <p className="mt-2">
            Report expires: {new Date(data.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </footer>
    </div>
  );
}
