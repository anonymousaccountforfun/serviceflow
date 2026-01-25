import { Router } from 'express';
import { prisma, Prisma } from '@serviceflow/database';
import { createAppointmentSchema, rescheduleAppointmentSchema, paginationSchema } from '@serviceflow/shared';
import { logger } from '../lib/logger';

const router = Router();

// Default appointment duration in minutes
const DEFAULT_DURATION_MINUTES = 120;

// GET /api/appointments - List appointments with date filtering
router.get('/', async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: appointments,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    logger.error('Error listing appointments', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to list appointments' },
    });
  }
});

// GET /api/appointments/:id - Get single appointment
router.get('/:id', async (req, res) => {
  try {
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
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Appointment not found' },
      });
    }

    res.json({ success: true, data: appointment });
  } catch (error) {
    logger.error('Error getting appointment', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get appointment' },
    });
  }
});

// POST /api/appointments - Create appointment
router.post('/', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const data = createAppointmentSchema.parse(req.body);

    // Verify job belongs to org
    const job = await prisma.job.findFirst({
      where: { id: data.jobId, organizationId: orgId },
      include: { customer: true },
    });

    if (!job) {
      return res.status(400).json({
        success: false,
        error: { code: 'E3001', message: 'Job not found' },
      });
    }

    const scheduledAt = new Date(data.scheduledAt);
    const scheduledEndAt = data.scheduledEndAt
      ? new Date(data.scheduledEndAt)
      : new Date(scheduledAt.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);

    // Check for conflicts if technician is assigned
    if (data.assignedToId) {
      const conflict = await checkConflict(orgId, data.assignedToId, scheduledAt, scheduledEndAt);
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'E4001',
            message: 'Technician has a conflicting appointment',
            details: {
              conflictingAppointmentId: conflict.id,
              conflictingTime: conflict.scheduledAt,
            },
          },
        });
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

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    logger.error('Error creating appointment', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to create appointment' },
    });
  }
});

// PATCH /api/appointments/:id - Update appointment
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;
    const { status, assignedToId, notes } = req.body;

    const appointment = await prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Appointment not found' },
      });
    }

    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'canceled', 'no_show', 'rescheduled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      });
    }

    // Check for conflicts if changing technician
    if (assignedToId && assignedToId !== appointment.assignedToId) {
      const conflict = await checkConflict(orgId, assignedToId, appointment.scheduledAt, appointment.scheduledEndAt, id);
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: { code: 'E4001', message: 'Technician has a conflicting appointment' },
        });
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

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating appointment', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to update appointment' },
    });
  }
});

// POST /api/appointments/:id/reschedule - Reschedule appointment
router.post('/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;
    const data = rescheduleAppointmentSchema.parse(req.body);

    const appointment = await prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Appointment not found' },
      });
    }

    const scheduledAt = new Date(data.scheduledAt);
    const scheduledEndAt = data.scheduledEndAt
      ? new Date(data.scheduledEndAt)
      : new Date(scheduledAt.getTime() + (appointment.scheduledEndAt.getTime() - appointment.scheduledAt.getTime()));

    // Check for conflicts
    if (appointment.assignedToId) {
      const conflict = await checkConflict(orgId, appointment.assignedToId, scheduledAt, scheduledEndAt, id);
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: { code: 'E4001', message: 'Technician has a conflicting appointment at the new time' },
        });
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

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error rescheduling appointment', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to reschedule appointment' },
    });
  }
});

// DELETE /api/appointments/:id - Cancel appointment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const appointment = await prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Appointment not found' },
      });
    }

    // Soft delete - mark as canceled instead of hard delete
    await prisma.appointment.update({
      where: { id },
      data: { status: 'canceled' },
    });

    res.json({ success: true, data: { canceled: true } });
  } catch (error) {
    logger.error('Error canceling appointment', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to cancel appointment' },
    });
  }
});

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
