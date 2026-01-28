/**
 * Call Attribution Service
 *
 * Tracks the customer journey from call to payment for ROI analysis.
 * Creates and updates CallAttribution records to track funnel progression.
 */

import { prisma } from '@serviceflow/database';
import { logger } from '../lib/logger';

// Funnel stages in order
export type FunnelStage =
  | 'call_received'
  | 'lead_created'
  | 'quote_sent'
  | 'quote_approved'
  | 'job_scheduled'
  | 'job_completed'
  | 'payment_collected'
  | 'lost';

// Recovery methods
export type RecoveryMethod =
  | 'ai_answered'
  | 'text_back'
  | 'human_callback'
  | 'voicemail_follow_up'
  | 'did_not_recover';

interface CreateAttributionParams {
  callId: string;
  organizationId: string;
  customerId?: string;
  recoveryMethod: RecoveryMethod;
  responseTimeMs?: number;
}

interface UpdateStageParams {
  callId?: string;
  jobId?: string;
  stage: FunnelStage;
  estimatedValue?: number;
  actualValue?: number;
  customerId?: string;
}

/**
 * Create initial call attribution when a call is handled
 */
export async function createAttribution(params: CreateAttributionParams) {
  const { callId, organizationId, customerId, recoveryMethod, responseTimeMs } = params;

  try {
    // Check if attribution already exists
    const existing = await prisma.callAttribution.findUnique({
      where: { callId },
    });

    if (existing) {
      logger.debug('Attribution already exists for call', { callId });
      return existing;
    }

    const attribution = await prisma.callAttribution.create({
      data: {
        callId,
        organizationId,
        customerId,
        stage: 'call_received',
        recoveryMethod,
        responseTimeMs,
      },
    });

    logger.info('Call attribution created', {
      attributionId: attribution.id,
      callId,
      recoveryMethod,
    });

    return attribution;
  } catch (error) {
    logger.error('Failed to create call attribution', { callId, error });
    throw error;
  }
}

/**
 * Update attribution when call is linked to a customer
 */
export async function linkAttributionToCustomer(callId: string, customerId: string) {
  try {
    const attribution = await prisma.callAttribution.findUnique({
      where: { callId },
    });

    if (!attribution) {
      logger.debug('No attribution found for call', { callId });
      return null;
    }

    const updated = await prisma.callAttribution.update({
      where: { callId },
      data: { customerId },
    });

    logger.debug('Attribution linked to customer', { callId, customerId });
    return updated;
  } catch (error) {
    logger.error('Failed to link attribution to customer', { callId, customerId, error });
    throw error;
  }
}

/**
 * Update attribution stage when funnel progresses
 */
export async function updateAttributionStage(params: UpdateStageParams) {
  const { callId, jobId, stage, estimatedValue, actualValue, customerId } = params;

  try {
    // Find attribution by callId or by jobId
    let attribution = null;

    if (callId) {
      attribution = await prisma.callAttribution.findUnique({
        where: { callId },
      });
    } else if (jobId) {
      // Find attribution linked to this job
      attribution = await prisma.callAttribution.findFirst({
        where: { jobId },
      });
    }

    if (!attribution) {
      logger.debug('No attribution found to update', { callId, jobId, stage });
      return null;
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      stage,
      stageChangedAt: new Date(),
    };

    if (jobId && !attribution.jobId) {
      updateData.jobId = jobId;
    }

    if (customerId && !attribution.customerId) {
      updateData.customerId = customerId;
    }

    if (estimatedValue !== undefined) {
      updateData.estimatedValue = estimatedValue;
    }

    if (actualValue !== undefined) {
      updateData.actualValue = actualValue;
    }

    const updated = await prisma.callAttribution.update({
      where: { id: attribution.id },
      data: updateData,
    });

    logger.info('Attribution stage updated', {
      attributionId: updated.id,
      stage,
      previousStage: attribution.stage,
    });

    return updated;
  } catch (error) {
    logger.error('Failed to update attribution stage', { callId, jobId, stage, error });
    throw error;
  }
}

/**
 * Link a job to the most recent call attribution for a customer
 */
export async function linkJobToAttribution(
  organizationId: string,
  customerId: string,
  jobId: string,
  estimatedValue?: number
) {
  try {
    // Find the most recent unlinked attribution for this customer
    const attribution = await prisma.callAttribution.findFirst({
      where: {
        organizationId,
        customerId,
        jobId: null,
        stage: { in: ['call_received', 'lead_created'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!attribution) {
      logger.debug('No unlinked attribution found for customer', { customerId, jobId });
      return null;
    }

    const updated = await prisma.callAttribution.update({
      where: { id: attribution.id },
      data: {
        jobId,
        stage: 'lead_created',
        stageChangedAt: new Date(),
        estimatedValue,
      },
    });

    logger.info('Job linked to attribution', {
      attributionId: updated.id,
      jobId,
      callId: attribution.callId,
    });

    return updated;
  } catch (error) {
    logger.error('Failed to link job to attribution', { customerId, jobId, error });
    throw error;
  }
}

/**
 * Mark attribution as lost (customer didn't convert)
 */
export async function markAttributionLost(callId: string) {
  try {
    const updated = await prisma.callAttribution.update({
      where: { callId },
      data: {
        stage: 'lost',
        stageChangedAt: new Date(),
      },
    });

    logger.info('Attribution marked as lost', { callId });
    return updated;
  } catch (error) {
    logger.error('Failed to mark attribution as lost', { callId, error });
    throw error;
  }
}

/**
 * Get attribution stats for an organization
 */
export async function getAttributionStats(
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  const attributions = await prisma.callAttribution.findMany({
    where: {
      organizationId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      stage: true,
      recoveryMethod: true,
      estimatedValue: true,
      actualValue: true,
      responseTimeMs: true,
    },
  });

  // Count by stage
  const stageBreakdown = attributions.reduce((acc, attr) => {
    acc[attr.stage] = (acc[attr.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count by recovery method
  const recoveryBreakdown = attributions.reduce((acc, attr) => {
    const method = attr.recoveryMethod || 'unknown';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate revenue
  const totalRevenue = attributions
    .filter((a) => a.stage === 'payment_collected' && a.actualValue)
    .reduce((sum, a) => sum + (a.actualValue || 0), 0);

  // Calculate average response time
  const responseTimes = attributions
    .filter((a) => a.responseTimeMs !== null)
    .map((a) => a.responseTimeMs!);
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null;

  // Calculate conversion rate
  const totalCalls = attributions.length;
  const conversions = attributions.filter((a) => a.stage === 'payment_collected').length;
  const conversionRate = totalCalls > 0 ? (conversions / totalCalls) * 100 : 0;

  return {
    totalCalls,
    conversions,
    conversionRate: Math.round(conversionRate * 100) / 100,
    totalRevenue,
    avgResponseTime,
    stageBreakdown,
    recoveryBreakdown,
  };
}
