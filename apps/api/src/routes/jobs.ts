import { Router } from 'express';
import { prisma } from '@serviceflow/database';
import { createJobSchema, updateJobSchema, jobPaginationSchema } from '@serviceflow/shared';
import { events, JobCompletedEventData } from '../services/events';
import { logger } from '../lib/logger';

const router = Router();

// GET /api/jobs - List jobs
router.get('/', async (req, res) => {
  try {
    const { page, perPage, sortBy, sortOrder } = jobPaginationSchema.parse(req.query);
    const orgId = req.auth!.organizationId;
    const status = req.query.status as string | undefined;
    const customerId = req.query.customerId as string | undefined;

    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          customer: { select: { firstName: true, lastName: true, phone: true } },
          assignedTo: { select: { firstName: true, lastName: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
      success: true,
      data: jobs,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    logger.error('Error listing jobs', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to list jobs' },
    });
  }
});

// GET /api/jobs/:id - Get single job
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const job = await prisma.job.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        assignedTo: true,
        estimates: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' } },
        appointments: { orderBy: { scheduledAt: 'desc' } },
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Job not found' },
      });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    logger.error('Error getting job', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get job' },
    });
  }
});

// POST /api/jobs - Create job
router.post('/', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const data = createJobSchema.parse(req.body);

    // Verify customer belongs to org
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId: orgId },
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        error: { code: 'E3001', message: 'Customer not found' },
      });
    }

    const job = await prisma.job.create({
      data: {
        ...data,
        organizationId: orgId,
        type: data.type as any,
        priority: data.priority as any,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      } as any,
      include: {
        customer: { select: { firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    logger.error('Error creating job', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to create job' },
    });
  }
});

// PATCH /api/jobs/:id - Update job
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;
    const data = updateJobSchema.parse(req.body);

    // Build update data with proper date conversions
    const updateData: any = { ...data };
    if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt);
    if (data.startedAt) updateData.startedAt = new Date(data.startedAt);
    if (data.completedAt) updateData.completedAt = new Date(data.completedAt);
    // Auto-set completedAt when status is set to completed
    if (data.status === 'completed' && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }

    const job = await prisma.job.updateMany({
      where: { id, organizationId: orgId },
      data: updateData,
    });

    if (job.count === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Job not found' },
      });
    }

    const updated = await prisma.job.findUnique({
      where: { id },
      include: { customer: true },
    });

    // If job completed, emit event to trigger review request
    if (data.status === 'completed' && updated) {
      await events.emit<JobCompletedEventData>({
        type: 'job.completed',
        organizationId: orgId,
        aggregateType: 'job',
        aggregateId: id,
        data: {
          jobId: id,
          customerId: updated.customerId,
          actualValue: updated.actualValue,
          technicianId: updated.assignedToId,
        },
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating job', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to update job' },
    });
  }
});

// DELETE /api/jobs/:id - Delete job
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const job = await prisma.job.deleteMany({
      where: { id, organizationId: orgId },
    });

    if (job.count === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Job not found' },
      });
    }

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Error deleting job', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to delete job' },
    });
  }
});

export default router;
