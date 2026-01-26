/**
 * Missed Call Handler
 *
 * Handles the call.missed event by enqueueing a delayed text-back job.
 * The job queue ensures the text-back is sent even if the server restarts.
 */

import { prisma } from '@serviceflow/database';
import { events, DomainEvent, CallMissedEventData } from '../services/events';
import { jobQueue, Job, JobPayload } from '../services/job-queue';
import { sms } from '../services/sms';
import { isBusinessHours, TIMING } from '@serviceflow/shared';
import { logger } from '../lib/logger';

// ============================================
// JOB PAYLOAD TYPES
// ============================================

export interface MissedCallTextbackPayload extends JobPayload {
  callId: string;
  customerId: string;
  from: string;
}

// ============================================
// EVENT HANDLER (enqueues job)
// ============================================

/**
 * Register the missed call handler
 */
export function registerMissedCallHandler(): void {
  // Register event handlers (enqueue jobs)
  events.on('call.missed', handleMissedCallEvent);
  events.on('call.voicemail', handleMissedCallEvent);
  logger.info('Missed call handler registered');

  // Register job handler (processes jobs)
  jobQueue.register<MissedCallTextbackPayload>('missed_call_textback', processMissedCallTextback);
  logger.info('Missed call textback job handler registered');
}

/**
 * Handle missed call event by enqueueing a delayed job
 */
async function handleMissedCallEvent(event: DomainEvent<CallMissedEventData>): Promise<void> {
  const { callId, customerId, from } = event.data;
  const { organizationId } = event;

  logger.info('Enqueueing missed call text-back job', { callId });

  try {
    // Verify call exists and has a customer
    const call = await prisma.call.findUnique({
      where: { id: callId },
      select: { customerId: true, textBackSentAt: true },
    });

    if (!call) {
      logger.error('Call not found', { callId });
      return;
    }

    if (call.textBackSentAt) {
      logger.debug('Text-back already sent', { callId });
      return;
    }

    if (!call.customerId) {
      logger.debug('No customer for call, cannot enqueue text-back', { callId });
      return;
    }

    // Enqueue job with delay
    // The delay prevents sending if customer calls back quickly
    await jobQueue.enqueue<MissedCallTextbackPayload>({
      type: 'missed_call_textback',
      organizationId,
      payload: {
        callId,
        customerId: call.customerId,
        from,
      },
      delayMs: TIMING.MISSED_CALL_DELAY_MS,
    });

    logger.info('Missed call text-back job enqueued', {
      callId,
      delayMs: TIMING.MISSED_CALL_DELAY_MS,
    });
  } catch (error) {
    logger.error('Error enqueueing missed call text-back', { callId, error });
  }
}

// ============================================
// JOB HANDLER (processes job)
// ============================================

/**
 * Process the missed call text-back job
 * This runs after the delay, checking if we should still send
 */
async function processMissedCallTextback(job: Job<MissedCallTextbackPayload>): Promise<void> {
  const { callId, customerId } = job.payload;
  const { organizationId } = job;

  logger.info('Processing missed call text-back job', { callId, jobId: job.id });

  try {
    // Get the call with customer and organization data
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        organization: true,
        customer: true,
      },
    });

    if (!call) {
      logger.error('Call not found during job processing', { callId });
      return;
    }

    // Check if text-back was already sent (another job or manual send)
    if (call.textBackSentAt) {
      logger.debug('Text-back already sent, skipping job', { callId });
      return;
    }

    if (!call.customer) {
      logger.debug('No customer for call', { callId });
      return;
    }

    // Check if call was handled in the meantime
    // Skip if: in_progress, completed (answered), or AI handled
    const skipStatuses = ['in_progress', 'completed'];
    if (
      (call.status && skipStatuses.includes(call.status)) ||
      call.aiHandled
    ) {
      logger.debug('Call was handled, skipping text-back', { callId, status: call.status });
      return;
    }

    // Determine if we're in business hours
    const settings = call.organization.settings as any;
    const businessHours = settings?.businessHours;
    const inBusinessHours = businessHours
      ? isBusinessHours(businessHours, call.organization.timezone)
      : true;

    // Select the appropriate template
    const templateType = inBusinessHours
      ? 'missed_call_textback'
      : 'missed_call_after_hours';

    // Build variables for the template
    const variables = {
      businessName: call.organization.name,
      customerName: call.customer.firstName,
    };

    // Send the text-back
    const result = await sms.sendTemplated({
      organizationId,
      customerId: call.customer.id,
      to: call.customer.phone,
      templateType,
      variables,
    });

    if (result.success) {
      // Update call record
      await prisma.call.update({
        where: { id: callId },
        data: {
          textBackSentAt: new Date(),
          textBackMessageId: result.messageId,
        },
      });

      logger.info('Text-back sent successfully', { callId, messageId: result.messageId });
    } else {
      // Throw to trigger retry
      throw new Error(result.error?.message || 'Failed to send text-back');
    }
  } catch (error) {
    logger.error('Error processing missed call text-back', { callId, error });
    throw error; // Re-throw to trigger retry
  }
}

export default registerMissedCallHandler;
