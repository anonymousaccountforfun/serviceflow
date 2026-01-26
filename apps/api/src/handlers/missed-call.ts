/**
 * Missed Call Handler
 *
 * Handles the call.missed event by sending a text-back message to the caller.
 * This is the core "missed call text-back" feature.
 */

import { prisma } from '@serviceflow/database';
import { events, DomainEvent, CallMissedEventData } from '../services/events';
import { sms } from '../services/sms';
import { isBusinessHours, TIMING } from '@serviceflow/shared';
import { logger } from '../lib/logger';

/**
 * Register the missed call handler
 */
export function registerMissedCallHandler(): void {
  events.on('call.missed', handleMissedCall);
  events.on('call.voicemail', handleMissedCall); // Also handle voicemails
  logger.info('Missed call handler registered');
}

/**
 * Handle a missed call by sending a text-back
 */
async function handleMissedCall(event: DomainEvent<CallMissedEventData>): Promise<void> {
  const { callId, customerId, from } = event.data;
  const { organizationId } = event;

  logger.info('Processing missed call text-back', { callId });

  try {
    // 1. Get the call with customer and organization data
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        organization: true,
        customer: true,
      },
    });

    if (!call) {
      logger.error('Call not found', { callId });
      return;
    }

    // 2. Check if text-back already sent
    if (call.textBackSentAt) {
      logger.debug('Text-back already sent', { callId });
      return;
    }

    // 3. Make sure we have a customer
    if (!call.customer) {
      logger.debug('No customer for call, cannot send text-back', { callId });
      return;
    }

    // 4. Determine if we're in business hours
    const settings = call.organization.settings as any;
    const businessHours = settings?.businessHours;
    const inBusinessHours = businessHours
      ? isBusinessHours(businessHours, call.organization.timezone)
      : true; // Default to business hours if not configured

    // 5. Select the appropriate template
    const templateType = inBusinessHours
      ? 'missed_call_textback'
      : 'missed_call_after_hours';

    // 6. Build variables for the template
    const variables = {
      businessName: call.organization.name,
      customerName: call.customer.firstName,
    };

    // 7. Wait the configured delay before sending (prevents sending if they call right back)
    const delay = TIMING.MISSED_CALL_DELAY_MS;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // 8. Re-check if call was answered or text-back was sent during delay
    const refreshedCall = await prisma.call.findUnique({
      where: { id: callId },
      select: { status: true, textBackSentAt: true, aiHandled: true },
    });

    // Skip if:
    // - Call is still in progress
    // - Text-back was already sent
    // - Call was answered by AI (aiHandled = true) - they already got help
    // But ALLOW if status is voicemail, no_answer, busy, or missed
    const skipStatuses = ['in_progress'];
    const allowedStatuses = ['voicemail', 'no_answer', 'busy', 'missed', 'failed'];

    if (
      refreshedCall?.textBackSentAt ||
      (refreshedCall?.status && skipStatuses.includes(refreshedCall.status)) ||
      refreshedCall?.aiHandled
    ) {
      logger.debug('Call was handled or text-back already sent, skipping', { callId });
      return;
    }

    // If call was completed without a recording, someone actually answered
    if (refreshedCall?.status === 'completed') {
      logger.debug('Call was answered, skipping text-back', { callId });
      return;
    }

    // 9. Send the text-back
    const result = await sms.sendTemplated({
      organizationId,
      customerId: call.customer.id,
      to: call.customer.phone,
      templateType,
      variables,
    });

    if (result.success) {
      // 10. Update call record with text-back info
      await prisma.call.update({
        where: { id: callId },
        data: {
          textBackSentAt: new Date(),
          textBackMessageId: result.messageId,
        },
      });

      logger.info('Text-back sent', { callId, messageId: result.messageId });
    } else {
      logger.error('Failed to send text-back', { callId, error: result.error });
    }
  } catch (error) {
    logger.error('Error handling missed call', { callId, error });
    // Don't throw - we don't want to break the event pipeline
  }
}

export default registerMissedCallHandler;
