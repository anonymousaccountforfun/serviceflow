/**
 * Appointment Confirmation Handler
 *
 * Handles incoming SMS messages that are replies to appointment reminders.
 * Detects Y/N/C/R responses and updates appointment status accordingly.
 */

import { prisma } from '@serviceflow/database';
import { events, DomainEvent, SmsReceivedEventData } from '../services/events';
import { sms } from '../services/sms';
import { reminderScheduler } from '../services/reminder-scheduler';
import { logger } from '../lib/logger';
import { format, addHours } from 'date-fns';

// Confirmation keywords
const CONFIRM_KEYWORDS = ['Y', 'YES', 'CONFIRM', 'C', 'OK', 'CONFIRMED', 'YEP', 'YEAH'];
const RESCHEDULE_KEYWORDS = ['R', 'RESCHEDULE', 'CHANGE', 'MOVE', 'NO', 'N', 'CANCEL', 'CANT', "CAN'T"];

/**
 * Register the appointment confirmation handler
 */
export function registerAppointmentConfirmationHandler(): void {
  events.on('sms.received', handleConfirmationReply);
  logger.info('Appointment confirmation handler registered');
}

/**
 * Handle an incoming SMS to check if it's a confirmation reply
 */
async function handleConfirmationReply(event: DomainEvent<SmsReceivedEventData>): Promise<void> {
  const { messageId, conversationId, customerId, content, from } = event.data;
  const { organizationId } = event;

  // Normalize the message for keyword matching
  const normalized = content.trim().toUpperCase();

  // Check if this is a simple confirmation/reschedule response
  const isConfirmation = CONFIRM_KEYWORDS.includes(normalized);
  const isReschedule = RESCHEDULE_KEYWORDS.includes(normalized);

  if (!isConfirmation && !isReschedule) {
    // Not a confirmation reply, skip
    return;
  }

  logger.info('Processing appointment confirmation reply', {
    messageId,
    isConfirmation,
    isReschedule,
  });

  try {
    // Find the customer's upcoming appointment
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      logger.debug('Customer not found', { customerId });
      return;
    }

    // Find the next scheduled appointment for this customer
    const appointment = await prisma.appointment.findFirst({
      where: {
        customerId,
        organizationId,
        status: { in: ['scheduled', 'rescheduled'] },
        scheduledAt: { gt: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        organization: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });

    if (!appointment) {
      // No upcoming appointment found - might be a general message
      logger.debug('No upcoming appointment found for customer', { customerId });
      return;
    }

    const techName = appointment.assignedTo
      ? `${appointment.assignedTo.firstName || ''} ${appointment.assignedTo.lastName || ''}`.trim()
      : 'Our technician';

    if (isConfirmation) {
      // Mark appointment as confirmed
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'confirmed',
          metadata: {
            ...(appointment.metadata as object || {}),
            confirmedAt: new Date().toISOString(),
            confirmedVia: 'sms',
          },
        },
      });

      // Send confirmation response
      const timeStr = format(appointment.scheduledAt, 'h:mm a');
      const dateStr = format(appointment.scheduledAt, 'EEEE, MMMM d');

      await sms.send({
        organizationId,
        customerId,
        conversationId,
        to: from,
        message: `Great! Your appointment is confirmed for ${dateStr} at ${timeStr}. ${techName} will see you then! We'll text when we're on the way.`,
        senderType: 'system',
        metadata: {
          appointmentId: appointment.id,
          confirmationType: 'confirmed',
        },
      });

      logger.info('Appointment confirmed via SMS', { appointmentId: appointment.id });
    } else if (isReschedule) {
      // Generate a reschedule link
      // For now, send options - in Phase 6.2 we'll add the reschedule page
      const token = Buffer.from(`${appointment.id}-${Date.now()}`).toString('base64url');
      const rescheduleUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.serviceflow.app'}/reschedule/${token}`;

      // Mark that customer wants to reschedule
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          metadata: {
            ...(appointment.metadata as object || {}),
            rescheduleRequestedAt: new Date().toISOString(),
            rescheduleRequestedVia: 'sms',
          },
        },
      });

      // Send reschedule options
      await sms.send({
        organizationId,
        customerId,
        conversationId,
        to: from,
        message: `No problem! You can reschedule your appointment here: ${rescheduleUrl}\n\nOr reply with a day and time that works better for you, and we'll help you find a new slot.`,
        senderType: 'system',
        metadata: {
          appointmentId: appointment.id,
          confirmationType: 'reschedule_requested',
        },
      });

      // Cancel existing reminders since they want to reschedule
      await reminderScheduler.cancelReminders(appointment.id);

      logger.info('Reschedule requested via SMS', { appointmentId: appointment.id });
    }

    // Mark the incoming message as a confirmation reply
    await prisma.message.update({
      where: { id: messageId },
      data: {
        metadata: {
          appointmentConfirmationReply: true,
          appointmentId: appointment.id,
          replyType: isConfirmation ? 'confirmed' : 'reschedule_requested',
        },
      },
    });
  } catch (error) {
    logger.error('Error handling appointment confirmation', { messageId, error });
  }
}

export default registerAppointmentConfirmationHandler;
