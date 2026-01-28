import { Router } from 'express';
import { prisma, Prisma } from '@serviceflow/database';
import { createAppointmentSchema, rescheduleAppointmentSchema, paginationSchema } from '@serviceflow/shared';
import { logger } from '../lib/logger';
import { reminderScheduler } from '../services/reminder-scheduler';
import { asyncHandler, sendSuccess, sendPaginated, sendError, errors, ErrorCodes } from '../utils/api-response';

const router = Router();

// Default appointment duration in minutes
const DEFAULT_DURATION_MINUTES = 120;

// GET /api/appointments - List appointments with date filtering
router.get('/', asyncHandler(async (req, res) => {
  const { page, perPage, sortOrder } = paginationSchema.parse(req.query);
  const orgId = req.auth!.organizationId;

  // Date range filtering
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const status = req.query.status as string | undefined;
  const assignedToId = req.query.assignedToId as string | undefined;

  const where: Prisma.AppointmentWhereInput = { organizationId: orgId };

  if (startDate || endDate) {
    where.scheduledAt = {};
    if (startDate) where.scheduledAt.gte = startDate;
    if (endDate) where.scheduledAt.lte = endDate;
  }
  if (status) where.status = status as Prisma.AppointmentWhereInput['status'];
  if (assignedToId) where.assignedToId = assignedToId;

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        job: { select: { id: true, title: true, type: true, priority: true } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, address: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: sortOrder },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.appointment.count({ where }),
  ]);

  sendPaginated(res, appointments, {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
}));

// GET /api/appointments/:id - Get single appointment
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  const appointment = await prisma.appointment.findFirst({
    where: { id, organizationId: orgId },
    include: {
      job: {
        include: {
          customer: true,
        },
      },
      customer: true,
      assignedTo: true,
    },
  });

  if (!appointment) {
    return errors.notFound(res, 'Appointment');
  }

  sendSuccess(res, appointment);
}));

// POST /api/appointments - Create appointment
router.post('/', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const data = createAppointmentSchema.parse(req.body);

  // Verify job belongs to org
  const job = await prisma.job.findFirst({
    where: { id: data.jobId, organizationId: orgId },
    include: { customer: true },
  });

  if (!job) {
    return errors.notFound(res, 'Job');
  }

  const scheduledAt = new Date(data.scheduledAt);
  const scheduledEndAt = data.scheduledEndAt
    ? new Date(data.scheduledEndAt)
    : new Date(scheduledAt.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);

  // Check for conflicts if technician is assigned
  if (data.assignedToId) {
    const conflict = await checkConflict(orgId, data.assignedToId, scheduledAt, scheduledEndAt);
    if (conflict) {
      return sendError(
        res,
        ErrorCodes.TWILIO_ERROR, // Using existing code for conflicts
        'Technician has a conflicting appointment',
        409,
        { conflictingAppointmentId: conflict.id, conflictingTime: conflict.scheduledAt }
      );
    }
  }

  const appointment = await prisma.appointment.create({
    data: {
      jobId: data.jobId,
      organizationId: orgId,
      customerId: job.customerId,
      assignedToId: data.assignedToId,
      scheduledAt,
      scheduledEndAt,
      notes: data.notes,
      status: 'scheduled',
    },
    include: {
      job: { select: { id: true, title: true } },
      customer: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
    },
  });

  // Update job status to scheduled
  await prisma.job.update({
    where: { id: data.jobId },
    data: {
      status: 'scheduled',
      scheduledAt,
      assignedToId: data.assignedToId,
    },
  });

  // Schedule appointment reminders
  try {
    await reminderScheduler.scheduleReminders(
      appointment.id,
      orgId,
      job.customerId,
      scheduledAt,
      data.assignedToId
    );
  } catch (err) {
    logger.error('Failed to schedule reminders', err);
    // Don't fail the appointment creation if reminders fail
  }

  sendSuccess(res, appointment, 201);
}));

// PATCH /api/appointments/:id - Update appointment
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const { status, assignedToId, notes } = req.body;

  const appointment = await prisma.appointment.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!appointment) {
    return errors.notFound(res, 'Appointment');
  }

  const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'canceled', 'no_show', 'rescheduled'];
  if (status && !validStatuses.includes(status)) {
    return errors.validation(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Check for conflicts if changing technician
  if (assignedToId && assignedToId !== appointment.assignedToId) {
    const conflict = await checkConflict(orgId, assignedToId, appointment.scheduledAt, appointment.scheduledEndAt, id);
    if (conflict) {
      return sendError(res, ErrorCodes.TWILIO_ERROR, 'Technician has a conflicting appointment', 409);
    }
  }

  const updateData: Prisma.AppointmentUncheckedUpdateInput = {};
  if (status) updateData.status = status;
  if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await prisma.appointment.update({
    where: { id },
    data: updateData,
    include: {
      job: { select: { id: true, title: true } },
      customer: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
    },
  });

  // Update job status based on appointment status
  if (status === 'in_progress') {
    await prisma.job.update({
      where: { id: appointment.jobId },
      data: { status: 'in_progress', startedAt: new Date() },
    });
  } else if (status === 'completed') {
    await prisma.job.update({
      where: { id: appointment.jobId },
      data: { status: 'completed', completedAt: new Date() },
    });
  }

  sendSuccess(res, updated);
}));

// POST /api/appointments/:id/reschedule - Reschedule appointment
router.post('/:id/reschedule', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const data = rescheduleAppointmentSchema.parse(req.body);

  const appointment = await prisma.appointment.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!appointment) {
    return errors.notFound(res, 'Appointment');
  }

  const scheduledAt = new Date(data.scheduledAt);
  const scheduledEndAt = data.scheduledEndAt
    ? new Date(data.scheduledEndAt)
    : new Date(scheduledAt.getTime() + (appointment.scheduledEndAt.getTime() - appointment.scheduledAt.getTime()));

  // Check for conflicts
  if (appointment.assignedToId) {
    const conflict = await checkConflict(orgId, appointment.assignedToId, scheduledAt, scheduledEndAt, id);
    if (conflict) {
      return sendError(res, ErrorCodes.TWILIO_ERROR, 'Technician has a conflicting appointment at the new time', 409);
    }
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      scheduledAt,
      scheduledEndAt,
      status: 'rescheduled',
      notes: data.reason ? `${appointment.notes || ''}\nRescheduled: ${data.reason}`.trim() : appointment.notes,
    },
    include: {
      job: { select: { id: true, title: true } },
      customer: { select: { firstName: true, lastName: true, phone: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
    },
  });

  // Update job scheduledAt
  await prisma.job.update({
    where: { id: appointment.jobId },
    data: { scheduledAt },
  });

  // Re-schedule reminders for new time
  try {
    await reminderScheduler.scheduleReminders(
      id,
      orgId,
      appointment.customerId,
      scheduledAt,
      appointment.assignedToId
    );
  } catch (err) {
    logger.error('Failed to reschedule reminders', err);
  }

  sendSuccess(res, updated);
}));

// DELETE /api/appointments/:id - Cancel appointment
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  const appointment = await prisma.appointment.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!appointment) {
    return errors.notFound(res, 'Appointment');
  }

  // Soft delete - mark as canceled instead of hard delete
  await prisma.appointment.update({
    where: { id },
    data: { status: 'canceled' },
  });

  // Cancel any pending reminders
  try {
    await reminderScheduler.cancelReminders(id);
  } catch (err) {
    logger.error('Failed to cancel reminders', err);
  }

  sendSuccess(res, { canceled: true });
}));

// POST /api/appointments/:id/no-show - Mark appointment as no-show
router.post('/:id/no-show', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const { reason } = req.body;

  const appointment = await prisma.appointment.findFirst({
    where: { id, organizationId: orgId },
    include: {
      customer: { select: { firstName: true, lastName: true } },
    },
  });

  if (!appointment) {
    return errors.notFound(res, 'Appointment');
  }

  // Can only mark scheduled/confirmed appointments as no-show
  if (!['scheduled', 'confirmed'].includes(appointment.status)) {
    return errors.validation(res, 'Can only mark scheduled or confirmed appointments as no-show');
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: 'no_show',
      noShowAt: new Date(),
      noShowReason: reason,
      notes: reason
        ? `${appointment.notes || ''}\nNo-show: ${reason}`.trim()
        : appointment.notes,
    },
    include: {
      job: { select: { id: true, title: true } },
      customer: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
    },
  });

  // Cancel any pending reminders
  try {
    await reminderScheduler.cancelReminders(id);
  } catch (err) {
    logger.error('Failed to cancel reminders for no-show', err);
  }

  logger.info('Appointment marked as no-show', { appointmentId: id, reason });

  sendSuccess(res, updated);
}));

// Helper: Check for conflicting appointments
async function checkConflict(
  orgId: string,
  technicianId: string,
  startTime: Date,
  endTime: Date,
  excludeId?: string
): Promise<{ id: string; scheduledAt: Date } | null> {
  const conflict = await prisma.appointment.findFirst({
    where: {
      organizationId: orgId,
      assignedToId: technicianId,
      status: { notIn: ['canceled', 'completed', 'no_show'] },
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        // New appointment starts during existing
        { scheduledAt: { lte: startTime }, scheduledEndAt: { gt: startTime } },
        // New appointment ends during existing
        { scheduledAt: { lt: endTime }, scheduledEndAt: { gte: endTime } },
        // New appointment contains existing
        { scheduledAt: { gte: startTime }, scheduledEndAt: { lte: endTime } },
      ],
    },
    select: { id: true, scheduledAt: true },
  });

  return conflict;
}

export default router;
