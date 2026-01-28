/**
 * ROI Calculator Service
 *
 * Calculates return on investment metrics for ServiceFlow organizations.
 * Uses call attribution data to track the customer journey and quantify value.
 */

import { prisma } from '@serviceflow/database';
import { logger } from '../lib/logger';

// ============================================
// TYPES
// ============================================

export interface ROIMetrics {
  // Revenue metrics
  totalRevenue: number; // cents - actual revenue from payment_collected attributions
  estimatedValue: number; // cents - total estimated value in funnel
  revenueFromRecoveredCalls: number; // cents - revenue from calls recovered by AI/text-back

  // Efficiency metrics
  callsRecovered: number; // total calls handled by AI or text-back
  callsAnsweredByAI: number;
  callsRecoveredByTextBack: number;
  callsRecoveredByHumanCallback: number;

  // Time savings (in minutes)
  timeSavedMinutes: number;
  aiCallsTimeSaved: number; // 5 min per AI call
  textBackTimeSaved: number; // 3 min per text-back
  reminderTimeSaved: number; // 1 min per reminder (future)

  // Conversion metrics
  conversionRate: number; // percentage of calls that became payments
  avgTimeToConversion: number | null; // hours from call to payment

  // ROI calculation
  roiDollars: number; // Total ROI in dollars
  roiMultiplier: number; // ROI as a multiplier (e.g., 3.5x)
  subscriptionCost: number; // cents - monthly subscription cost

  // Period info
  periodStart: Date;
  periodEnd: Date;
}

export interface FunnelMetrics {
  call_received: number;
  lead_created: number;
  quote_sent: number;
  quote_approved: number;
  job_scheduled: number;
  job_completed: number;
  payment_collected: number;
  lost: number;
}

export interface CounterfactualMetrics {
  missedCallsWithoutServiceFlow: number;
  lostRevenueWithoutServiceFlow: number; // cents
  avgJobValue: number; // cents - based on actual data or industry benchmark
  industryMissedCallRate: number; // percentage (62% industry benchmark)
}

// ============================================
// CONSTANTS
// ============================================

// Time saved per action (in minutes)
const TIME_SAVED = {
  AI_CALL: 5, // 5 minutes per AI-handled call
  TEXT_BACK: 3, // 3 minutes per text-back
  REMINDER: 1, // 1 minute per automated reminder
};

// Industry benchmarks for counterfactual calculations
const INDUSTRY_BENCHMARKS = {
  MISSED_CALL_RATE: 62, // 62% of calls go unanswered (Forbes)
  AVG_JOB_VALUE: 28000, // $280 average job value in cents
  AFTER_HOURS_CONVERSION: 0, // 0% conversion for after-hours calls without AI
};

// Hourly rate for time value calculation
const HOURLY_RATE = 7500; // $75/hour in cents

// Subscription costs by tier (monthly, in cents)
const SUBSCRIPTION_COSTS: Record<string, number> = {
  free: 0,
  starter: 4900, // $49/month
  growth: 9900, // $99/month
  pro: 19900, // $199/month
};

// ============================================
// MAIN CALCULATOR
// ============================================

/**
 * Calculate ROI metrics for an organization over a given period
 */
export async function calculateROI(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<ROIMetrics> {
  try {
    // Get organization to determine subscription tier
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionTier: true },
    });

    const subscriptionCost = SUBSCRIPTION_COSTS[org?.subscriptionTier || 'starter'] || 0;

    // Get all attributions for the period
    const attributions = await prisma.callAttribution.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate revenue metrics
    const paymentAttributions = attributions.filter(
      (a) => a.stage === 'payment_collected' && a.actualValue
    );
    const totalRevenue = paymentAttributions.reduce(
      (sum, a) => sum + (a.actualValue || 0),
      0
    );

    const estimatedValue = attributions
      .filter((a) => a.estimatedValue)
      .reduce((sum, a) => sum + (a.estimatedValue || 0), 0);

    // Calculate recovery method breakdown
    const callsAnsweredByAI = attributions.filter(
      (a) => a.recoveryMethod === 'ai_answered'
    ).length;
    const callsRecoveredByTextBack = attributions.filter(
      (a) => a.recoveryMethod === 'text_back'
    ).length;
    const callsRecoveredByHumanCallback = attributions.filter(
      (a) => a.recoveryMethod === 'human_callback'
    ).length;
    const callsRecovered =
      callsAnsweredByAI + callsRecoveredByTextBack + callsRecoveredByHumanCallback;

    // Calculate revenue from recovered calls (AI and text-back)
    const recoveredAttributions = attributions.filter(
      (a) =>
        a.stage === 'payment_collected' &&
        a.actualValue &&
        (a.recoveryMethod === 'ai_answered' || a.recoveryMethod === 'text_back')
    );
    const revenueFromRecoveredCalls = recoveredAttributions.reduce(
      (sum, a) => sum + (a.actualValue || 0),
      0
    );

    // Calculate time saved
    const aiCallsTimeSaved = callsAnsweredByAI * TIME_SAVED.AI_CALL;
    const textBackTimeSaved = callsRecoveredByTextBack * TIME_SAVED.TEXT_BACK;
    const reminderTimeSaved = 0; // TODO: Calculate from reminders sent
    const timeSavedMinutes = aiCallsTimeSaved + textBackTimeSaved + reminderTimeSaved;

    // Calculate conversion rate
    const totalCalls = attributions.length;
    const conversions = paymentAttributions.length;
    const conversionRate = totalCalls > 0 ? (conversions / totalCalls) * 100 : 0;

    // Calculate average time to conversion
    let avgTimeToConversion: number | null = null;
    if (paymentAttributions.length > 0) {
      const conversionTimes = paymentAttributions.map((a) => {
        const created = new Date(a.createdAt);
        const changed = a.stageChangedAt ? new Date(a.stageChangedAt) : created;
        return (changed.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
      });
      avgTimeToConversion =
        conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length;
    }

    // Calculate ROI
    const timeSavedValue = Math.round((timeSavedMinutes / 60) * HOURLY_RATE);
    const roiDollars = Math.round(
      (revenueFromRecoveredCalls + timeSavedValue - subscriptionCost) / 100
    );
    const roiMultiplier =
      subscriptionCost > 0
        ? Math.round(
            ((revenueFromRecoveredCalls + timeSavedValue) / subscriptionCost) * 10
          ) / 10
        : 0;

    return {
      totalRevenue,
      estimatedValue,
      revenueFromRecoveredCalls,
      callsRecovered,
      callsAnsweredByAI,
      callsRecoveredByTextBack,
      callsRecoveredByHumanCallback,
      timeSavedMinutes,
      aiCallsTimeSaved,
      textBackTimeSaved,
      reminderTimeSaved,
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgTimeToConversion: avgTimeToConversion
        ? Math.round(avgTimeToConversion * 10) / 10
        : null,
      roiDollars,
      roiMultiplier,
      subscriptionCost,
      periodStart: startDate,
      periodEnd: endDate,
    };
  } catch (error) {
    logger.error('Failed to calculate ROI', { organizationId, error });
    throw error;
  }
}

/**
 * Get funnel metrics showing conversion through each stage
 */
export async function getFunnelMetrics(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<FunnelMetrics> {
  try {
    const attributions = await prisma.callAttribution.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { stage: true },
    });

    // Count attributions by stage
    const stageCounts = attributions.reduce(
      (acc, a) => {
        acc[a.stage] = (acc[a.stage] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // For funnel display, we need cumulative counts
    // (e.g., all call_received includes those that progressed further)
    const stages = [
      'call_received',
      'lead_created',
      'quote_sent',
      'quote_approved',
      'job_scheduled',
      'job_completed',
      'payment_collected',
    ];

    // Current stage represents the furthest point in the funnel
    // So call_received count = total, lead_created = those at lead_created or beyond, etc.
    const funnel: FunnelMetrics = {
      call_received: attributions.filter((a) => a.stage !== 'lost').length,
      lead_created: 0,
      quote_sent: 0,
      quote_approved: 0,
      job_scheduled: 0,
      job_completed: 0,
      payment_collected: 0,
      lost: stageCounts['lost'] || 0,
    };

    // Calculate cumulative counts for each stage
    const stageIndex: Record<string, number> = {};
    stages.forEach((s, i) => (stageIndex[s] = i));

    attributions.forEach((a) => {
      if (a.stage === 'lost') return;
      const idx = stageIndex[a.stage];
      if (idx === undefined) return;

      // Count this attribution for its current stage and all previous stages
      for (let i = 1; i <= idx; i++) {
        const stage = stages[i] as keyof FunnelMetrics;
        funnel[stage]++;
      }
    });

    return funnel;
  } catch (error) {
    logger.error('Failed to get funnel metrics', { organizationId, error });
    throw error;
  }
}

/**
 * Calculate counterfactual metrics (what would have happened without ServiceFlow)
 */
export async function calculateCounterfactual(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<CounterfactualMetrics> {
  try {
    // Get all calls in the period
    const totalCalls = await prisma.call.count({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        direction: 'inbound',
      },
    });

    // Get average job value from actual completed jobs
    const completedJobs = await prisma.job.findMany({
      where: {
        organizationId,
        status: 'completed',
        actualValue: { not: null },
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { actualValue: true },
    });

    const avgJobValue =
      completedJobs.length > 0
        ? Math.round(
            completedJobs.reduce((sum, j) => sum + (j.actualValue || 0), 0) /
              completedJobs.length
          )
        : INDUSTRY_BENCHMARKS.AVG_JOB_VALUE;

    // Calculate missed calls without ServiceFlow (using industry benchmark)
    const missedCallsWithoutServiceFlow = Math.round(
      totalCalls * (INDUSTRY_BENCHMARKS.MISSED_CALL_RATE / 100)
    );

    // Calculate lost revenue (missed calls * avg job value * conversion assumption)
    // Assuming each missed call has ~30% chance of being a potential job
    const conversionPotential = 0.3;
    const lostRevenueWithoutServiceFlow = Math.round(
      missedCallsWithoutServiceFlow * avgJobValue * conversionPotential
    );

    return {
      missedCallsWithoutServiceFlow,
      lostRevenueWithoutServiceFlow,
      avgJobValue,
      industryMissedCallRate: INDUSTRY_BENCHMARKS.MISSED_CALL_RATE,
    };
  } catch (error) {
    logger.error('Failed to calculate counterfactual', { organizationId, error });
    throw error;
  }
}

/**
 * Get a summary of ROI for quick display (e.g., dashboard card)
 */
export async function getROISummary(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  roiDollars: number;
  roiMultiplier: number;
  callsRecovered: number;
  revenueCaptureddollars: number;
  hoursSaved: number;
}> {
  const metrics = await calculateROI(organizationId, startDate, endDate);

  return {
    roiDollars: metrics.roiDollars,
    roiMultiplier: metrics.roiMultiplier,
    callsRecovered: metrics.callsRecovered,
    revenueCaptureddollars: Math.round(metrics.revenueFromRecoveredCalls / 100),
    hoursSaved: Math.round((metrics.timeSavedMinutes / 60) * 10) / 10,
  };
}

export const roiCalculator = {
  calculateROI,
  getFunnelMetrics,
  calculateCounterfactual,
  getROISummary,
};

export default roiCalculator;
