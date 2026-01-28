/**
 * Reschedule Routes
 *
 * Public API for customer appointment rescheduling.
 * Handles token generation, validation, and appointment updates.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@serviceflow/database';
import { logger } from '../lib/logger';
import { sms } from '../services/sms';
import { reminderScheduler } from '../services/reminder-scheduler';
import { pushNotifications } from '../services/push-notifications';
import { format, addDays, startOfDay, endOfDay, setHours, setMinutes, isBefore, isAfter } from 'date-fns';
import crypto from 'crypto';

const router = Router();

// Token expiry time (48 hours)
const TOKEN_EXPIRY_HOURS = 48;

// Available time slots (configurable per org in future)
const DEFAULT_SLOT_DURATION = 120; // minutes
const DEFAULT_SLOTS = [
  { hour: 8, minute: 0 },
  { hour: 10, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 14, minute: 0 },
  { hour: 16, minute: 0 },
];

/**
 * POST /api/reschedule/token
 *
 * Generate a reschedule token for an appointment.
 * Requires authentication.
 */
router.post('/token', async (req: Request, res: Response) => {
  const { appointmentId } = req.body;

  if (!req.auth) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const { organizationId } = req.auth;

  try {
    // Verify appointment exists and belongs to org
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        organizationId,
        status: { in: ['scheduled', 'confirmed', 'rescheduled'] },
      },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Appointment not found' },
      });
    }

    // Generate token
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Create reschedule token
    const rescheduleToken = await prisma.rescheduleToken.create({
      data: {
        token,
        appointmentId,
        customerId: appointment.customerId,
        organizationId,
        expiresAt,
      },
    });

    const rescheduleUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.serviceflow.app'}/reschedule/${token}`;

    logger.info('Reschedule token created', { appointmentId, tokenId: rescheduleToken.id });

    return res.json({
      success: true,
      data: {
        token,
        rescheduleUrl,
        expiresAt,
      },
    });
  } catch (error: any) {
    logger.error('Failed to create reschedule token', error);
    return res.status(500).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: 'Failed to create reschedule link' },
    });
  }
});

/**
 * GET /api/reschedule/:token
 *
 * Get appointment details and available time slots for rescheduling.
 * Public endpoint - no auth required (validated by token).
 */
router.get('/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    // Find and validate token
    const rescheduleToken = await prisma.rescheduleToken.findUnique({
      where: { token },
    });

    if (!rescheduleToken) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Reschedule link not found or expired' },
      });
    }

    // Check if expired
    if (rescheduleToken.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        error: { code: 'EXPIRED', message: 'This reschedule link has expired' },
      });
    }

    // Check if already used
    if (rescheduleToken.usedAt) {
      return res.status(410).json({
        success: false,
        error: { code: 'USED', message: 'This reschedule link has already been used' },
      });
    }

    // Get appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: rescheduleToken.appointmentId },
      include: {
        organization: { select: { name: true, timezone: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
        customer: { select: { firstName: true, lastName: true } },
        job: { select: { title: true, type: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Appointment not found' },
      });
    }

    // Generate available time slots for the next 7 days
    const availableSlots = await generateAvailableSlots(
      appointment.organizationId,
      appointment.assignedToId,
      7
    );

    return res.json({
      success: true,
      data: {
        appointment: {
          id: appointment.id,
          currentTime: appointment.scheduledAt,
          duration: Math.round(
            (appointment.scheduledEndAt.getTime() - appointment.scheduledAt.getTime()) / 60000
          ),
          jobTitle: appointment.job?.title || 'Service Appointment',
          jobType: appointment.job?.type,
        },
        business: {
          name: appointment.organization.name,
        },
        technician: appointment.assignedTo
          ? `${appointment.assignedTo.firstName || ''} ${appointment.assignedTo.lastName || ''}`.trim()
          : null,
        customer: {
          firstName: appointment.customer.firstName,
        },
        availableSlots,
        expiresAt: rescheduleToken.expiresAt,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get reschedule data', error);
    return res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to load reschedule options' },
    });
  }
});

/**
 * POST /api/reschedule/:token
 *
 * Submit the reschedule request with new time.
 * Public endpoint - validated by token.
 */
router.post('/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { newTime } = req.body;

  if (!newTime) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'newTime is required' },
    });
  }

  try {
    // ATOMIC token consumption: Find and mark as used in one operation
    // This prevents TOCTOU race conditions where two concurrent requests
    // could both check usedAt=null before either updates it
    const tokenUpdateResult = await prisma.rescheduleToken.updateMany({
      where: {
        token,
        usedAt: null, // Only update if not already used
        expiresAt: { gt: new Date() }, // Only update if not expired
      },
      data: { usedAt: new Date() },
    });

    // If no rows updated, the token was already used, expired, or doesn't exist
    if (tokenUpdateResult.count === 0) {
      // Fetch token to determine the specific error
      const existingToken = await prisma.rescheduleToken.findUnique({
        where: { token },
        select: { usedAt: true, expiresAt: true },
      });

      if (!existingToken) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Reschedule link not found' },
        });
      }

      if (existingToken.expiresAt < new Date()) {
        return res.status(410).json({
          success: false,
          error: { code: 'EXPIRED', message: 'This reschedule link has expired' },
        });
      }

      if (existingToken.usedAt) {
        return res.status(410).json({
          success: false,
          error: { code: 'USED', message: 'This reschedule link has already been used' },
        });
      }
    }

    // Now fetch the full token data (we know it's valid and now marked as used)
    const rescheduleToken = await prisma.rescheduleToken.findUnique({
      where: { token },
    });

    if (!rescheduleToken) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Reschedule link not found' },
      });
    }

    // Get appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: rescheduleToken.appointmentId },
      include: {
        organization: { select: { name: true } },
        customer: { select: { phone: true, firstName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!appointment) {
      // Revert the token usage since we can't complete the operation
      await prisma.rescheduleToken.update({
        where: { id: rescheduleToken.id },
        data: { usedAt: null },
      });
      return res.status(404).json({
        success: false,
        error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Appointment not found' },
      });
    }

    const newScheduledAt = new Date(newTime);
    const duration = appointment.scheduledEndAt.getTime() - appointment.scheduledAt.getTime();
    const newScheduledEndAt = new Date(newScheduledAt.getTime() + duration);

    // Validate new time is in the future
    if (newScheduledAt < new Date()) {
      // Revert the token usage since we can't complete the operation
      await prisma.rescheduleToken.update({
        where: { id: rescheduleToken.id },
        data: { usedAt: null },
      });
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TIME', message: 'New time must be in the future' },
      });
    }

    // Check for conflicts if technician is assigned
    if (appointment.assignedToId) {
      const conflict = await prisma.appointment.findFirst({
        where: {
          organizationId: appointment.organizationId,
          assignedToId: appointment.assignedToId,
          status: { notIn: ['canceled', 'completed', 'no_show'] },
          id: { not: appointment.id },
          OR: [
            { scheduledAt: { lte: newScheduledAt }, scheduledEndAt: { gt: newScheduledAt } },
            { scheduledAt: { lt: newScheduledEndAt }, scheduledEndAt: { gte: newScheduledEndAt } },
            { scheduledAt: { gte: newScheduledAt }, scheduledEndAt: { lte: newScheduledEndAt } },
          ],
        },
      });

      if (conflict) {
        // Revert the token usage since we can't complete the operation
        await prisma.rescheduleToken.update({
          where: { id: rescheduleToken.id },
          data: { usedAt: null },
        });
        return res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: 'Selected time slot is no longer available' },
        });
      }
    }

    // Update appointment
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        scheduledAt: newScheduledAt,
        scheduledEndAt: newScheduledEndAt,
        status: 'scheduled',
        notes: `${appointment.notes || ''}\nRescheduled by customer on ${format(new Date(), 'MM/dd/yyyy')}`.trim(),
        metadata: {
          ...(appointment.metadata as object || {}),
          rescheduledAt: new Date().toISOString(),
          rescheduledVia: 'customer_link',
          previousTime: appointment.scheduledAt.toISOString(),
        },
      },
    });

    // Token already marked as used above (atomic operation)

    // Update job scheduledAt
    await prisma.job.update({
      where: { id: appointment.jobId },
      data: { scheduledAt: newScheduledAt },
    });

    // Re-schedule reminders
    await reminderScheduler.scheduleReminders(
      appointment.id,
      appointment.organizationId,
      appointment.customerId,
      newScheduledAt,
      appointment.assignedToId
    );

    // Send confirmation SMS
    if (appointment.customer.phone) {
      const timeStr = format(newScheduledAt, 'h:mm a');
      const dateStr = format(newScheduledAt, 'EEEE, MMMM d');
      const techName = appointment.assignedTo
        ? `${appointment.assignedTo.firstName || ''} ${appointment.assignedTo.lastName || ''}`.trim()
        : 'Our technician';

      await sms.send({
        organizationId: appointment.organizationId,
        customerId: appointment.customerId,
        to: appointment.customer.phone,
        message: `Your appointment with ${appointment.organization.name} has been rescheduled to ${dateStr} at ${timeStr}. ${techName} will see you then!`,
        senderType: 'system',
        metadata: {
          appointmentId: appointment.id,
          rescheduleConfirmation: true,
        },
      });
    }

    // Notify technician of reschedule via push notification
    if (appointment.assignedTo) {
      const customerName = appointment.customer.firstName || 'Customer';
      const timeStr = format(newScheduledAt, 'h:mm a');
      const dateStr = format(newScheduledAt, 'EEE, MMM d');

      await pushNotifications.sendPushNotification(appointment.assignedTo.id, {
        type: 'job_updated',
        title: 'Appointment Rescheduled',
        body: `${customerName} rescheduled to ${dateStr} at ${timeStr}`,
        tag: `reschedule-${appointment.id}`,
        url: `/dashboard/jobs/${appointment.jobId}`,
        priority: 'high',
        data: {
          appointmentId: appointment.id,
          jobId: appointment.jobId,
          newTime: newScheduledAt.toISOString(),
        },
      });

      logger.info('Technician notified of reschedule', {
        technicianId: appointment.assignedTo.id,
        appointmentId: appointment.id,
      });
    }

    logger.info('Appointment rescheduled via customer link', {
      appointmentId: appointment.id,
      newTime: newScheduledAt,
    });

    return res.json({
      success: true,
      data: {
        appointment: {
          id: updated.id,
          scheduledAt: updated.scheduledAt,
          scheduledEndAt: updated.scheduledEndAt,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to reschedule appointment', error);
    return res.status(500).json({
      success: false,
      error: { code: 'RESCHEDULE_FAILED', message: 'Failed to reschedule appointment' },
    });
  }
});

/**
 * Generate available time slots for the next N days
 */
async function generateAvailableSlots(
  organizationId: string,
  technicianId: string | null,
  days: number
): Promise<Array<{ date: string; slots: string[] }>> {
  const result: Array<{ date: string; slots: string[] }> = [];
  const today = new Date();

  for (let i = 1; i <= days; i++) {
    const date = addDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = format(date, 'EEEE').toLowerCase();

    // Skip weekends (could be configurable per org)
    if (dayOfWeek === 'sunday') continue;

    // Get existing appointments for this day and technician
    const existingAppointments = technicianId
      ? await prisma.appointment.findMany({
          where: {
            organizationId,
            assignedToId: technicianId,
            status: { notIn: ['canceled', 'completed', 'no_show'] },
            scheduledAt: {
              gte: startOfDay(date),
              lt: endOfDay(date),
            },
          },
          select: { scheduledAt: true, scheduledEndAt: true },
        })
      : [];

    // Generate available slots
    const availableSlots: string[] = [];
    const adjustedSlots = dayOfWeek === 'saturday'
      ? DEFAULT_SLOTS.filter(s => s.hour >= 9 && s.hour <= 12)
      : DEFAULT_SLOTS;

    for (const slot of adjustedSlots) {
      const slotStart = setMinutes(setHours(date, slot.hour), slot.minute);
      const slotEnd = new Date(slotStart.getTime() + DEFAULT_SLOT_DURATION * 60 * 1000);

      // Skip if slot is in the past
      if (slotStart < new Date()) continue;

      // Check for conflicts
      const hasConflict = existingAppointments.some((apt) => {
        return (
          (slotStart >= apt.scheduledAt && slotStart < apt.scheduledEndAt) ||
          (slotEnd > apt.scheduledAt && slotEnd <= apt.scheduledEndAt) ||
          (slotStart <= apt.scheduledAt && slotEnd >= apt.scheduledEndAt)
        );
      });

      if (!hasConflict) {
        availableSlots.push(slotStart.toISOString());
      }
    }

    if (availableSlots.length > 0) {
      result.push({ date: dateStr, slots: availableSlots });
    }
  }

  return result;
}

export default router;
