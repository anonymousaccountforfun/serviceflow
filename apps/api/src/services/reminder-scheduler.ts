/**
 * Reminder Scheduler Service
 *
 * Schedules and manages appointment reminders.
 * Creates jobs in the queue for 24-hour and 2-hour reminders.
 */

import { prisma } from '@serviceflow/database';
import { jobQueue } from './job-queue';
import { sms } from './sms';
import { logger } from '../lib/logger';
import { format, subHours } from 'date-fns';

// ============================================
// TYPES
// ============================================

export interface AppointmentReminderPayload extends Record<string, unknown> {
  appointmentId: string;
  organizationId: string;
  customerId: string;
  reminderType: '24h' | '2h' | 'confirm';
  scheduledAt: string;
  technicianId?: string;
  technicianName?: string;
}

export interface ReminderScheduleResult {
  reminder24h?: string; // Job ID
  reminder2h?: string; // Job ID
}

// ============================================
// REMINDER SCHEDULER SERVICE
// ============================================

class ReminderSchedulerService {
  /**
   * Schedule reminders for an appointment
   * Called when an appointment is created or rescheduled
   */
  async scheduleReminders(
    appointmentId: string,
    organizationId: string,
    customerId: string,
    scheduledAt: Date,
    technicianId?: string | null
  ): Promise<ReminderScheduleResult> {
    const result: ReminderScheduleResult = {};

    // Cancel any existing reminders for this appointment
    await this.cancelReminders(appointmentId);

    // Get technician name if assigned
    let technicianName: string | undefined;
    if (technicianId) {
      const tech = await prisma.user.findUnique({
        where: { id: technicianId },
        select: { firstName: true, lastName: true },
      });
      if (tech) {
        technicianName = `${tech.firstName || ''} ${tech.lastName || ''}`.trim() || 'Our technician';
      }
    }

    const payload: Omit<AppointmentReminderPayload, 'reminderType'> = {
      appointmentId,
      organizationId,
      customerId,
      scheduledAt: scheduledAt.toISOString(),
      technicianId: technicianId || undefined,
      technicianName,
    };

    // Schedule 24-hour reminder
    const reminder24hTime = subHours(scheduledAt, 24);
    if (reminder24hTime > new Date()) {
      const jobId = await jobQueue.enqueue<AppointmentReminderPayload>({
        type: 'appointment_reminder',
        organizationId,
        payload: { ...payload, reminderType: '24h' } as AppointmentReminderPayload,
        processAfter: reminder24hTime,
        maxAttempts: 2,
      });
      result.reminder24h = jobId;
      logger.info('Scheduled 24h reminder', { appointmentId, processAt: reminder24hTime });
    }

    // Schedule 2-hour reminder
    const reminder2hTime = subHours(scheduledAt, 2);
    if (reminder2hTime > new Date()) {
      const jobId = await jobQueue.enqueue<AppointmentReminderPayload>({
        type: 'appointment_reminder',
        organizationId,
        payload: { ...payload, reminderType: '2h' } as AppointmentReminderPayload,
        processAfter: reminder2hTime,
        maxAttempts: 2,
      });
      result.reminder2h = jobId;
      logger.info('Scheduled 2h reminder', { appointmentId, processAt: reminder2hTime });
    }

    return result;
  }

  /**
   * Cancel all reminders for an appointment
   * Called when appointment is cancelled or rescheduled
   */
  async cancelReminders(appointmentId: string): Promise<number> {
    const result = await prisma.delayedJob.deleteMany({
      where: {
        type: 'appointment_reminder',
        processedAt: null, // Only pending jobs
        payload: {
          path: ['appointmentId'],
          equals: appointmentId,
        },
      },
    });

    if (result.count > 0) {
      logger.info('Cancelled appointment reminders', { appointmentId, count: result.count });
    }

    return result.count;
  }

  /**
   * Process an appointment reminder job
   * Called by the job queue when it's time to send
   */
  async processReminder(payload: AppointmentReminderPayload): Promise<void> {
    const { appointmentId, organizationId, customerId, reminderType, scheduledAt, technicianName } = payload;

    // Verify appointment still exists and is scheduled
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        customer: true,
        organization: true,
      },
    });

    if (!appointment) {
      logger.info('Appointment not found, skipping reminder', { appointmentId });
      return;
    }

    if (appointment.status !== 'scheduled' && appointment.status !== 'confirmed') {
      logger.info('Appointment not scheduled, skipping reminder', {
        appointmentId,
        status: appointment.status,
      });
      return;
    }

    // Get customer phone
    if (!appointment.customer.phone) {
      logger.warn('Customer has no phone number', { customerId });
      return;
    }

    // Determine template type
    const templateType = reminderType === '24h' ? 'appointment_reminder_24h' : 'appointment_reminder_2h';

    // Format time for display
    const appointmentTime = new Date(scheduledAt);
    const timeStr = format(appointmentTime, 'h:mm a');
    const dateStr = format(appointmentTime, 'EEEE, MMMM d');

    // Send reminder via SMS
    const result = await sms.sendTemplated({
      organizationId,
      customerId,
      to: appointment.customer.phone,
      templateType,
      variables: {
        customerName: appointment.customer.firstName || 'there',
        businessName: appointment.organization.name,
        technicianName: technicianName || 'Our technician',
        date: dateStr,
        time: timeStr,
      },
      urgent: true, // Reminders bypass quiet hours
    });

    if (result.success) {
      logger.info('Appointment reminder sent', {
        appointmentId,
        reminderType,
        customerId,
      });

      // Update appointment with reminder sent timestamp
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          metadata: {
            ...(appointment.metadata as object || {}),
            [`${reminderType}ReminderSentAt`]: new Date().toISOString(),
          },
        },
      });
    } else {
      logger.error('Failed to send appointment reminder', {
        appointmentId,
        reminderType,
        error: result.error,
      });
      throw new Error(result.error?.message || 'Failed to send reminder');
    }
  }

  /**
   * Send a confirmation request to a customer
   */
  async sendConfirmationRequest(appointmentId: string): Promise<boolean> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        customer: true,
        organization: true,
      },
    });

    if (!appointment || !appointment.customer.phone) {
      return false;
    }

    const appointmentTime = new Date(appointment.scheduledAt);
    const timeStr = format(appointmentTime, 'h:mm a');
    const dateStr = format(appointmentTime, 'EEEE, MMMM d');

    const result = await sms.sendTemplated({
      organizationId: appointment.organizationId,
      customerId: appointment.customerId,
      to: appointment.customer.phone,
      templateType: 'appointment_confirm_request',
      variables: {
        customerName: appointment.customer.firstName || 'there',
        businessName: appointment.organization.name,
        date: dateStr,
        time: timeStr,
      },
    });

    if (result.success) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          metadata: {
            ...(appointment.metadata as object || {}),
            confirmationRequestSentAt: new Date().toISOString(),
          },
        },
      });
    }

    return result.success;
  }
}

// Register the reminder handler with job queue
export function registerReminderHandler(): void {
  jobQueue.register<AppointmentReminderPayload>(
    'appointment_reminder',
    async (job) => {
      await reminderScheduler.processReminder(job.payload);
    }
  );
  logger.info('Appointment reminder handler registered');
}

// Singleton instance
export const reminderScheduler = new ReminderSchedulerService();

export default reminderScheduler;
