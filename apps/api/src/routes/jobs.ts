import { Router } from 'express';
import { prisma, Prisma } from '@serviceflow/database';
import { createJobSchema, updateJobSchema, jobPaginationSchema } from '@serviceflow/shared';
import { events, JobCompletedEventData } from '../services/events';
import { linkJobToAttribution, updateAttributionStage } from '../services/attribution';
import { logger } from '../lib/logger';
import { asyncHandler, sendSuccess, sendPaginated, errors } from '../utils/api-response';

const router = Router();

// GET /api/jobs - List jobs
router.get('/', asyncHandler(async (req, res) => {
  const { page, perPage, sortBy, sortOrder } = jobPaginationSchema.parse(req.query);
  const orgId = req.auth!.organizationId;
  const status = req.query.status as string | undefined;
  const customerId = req.query.customerId as string | undefined;

  const where: Prisma.JobWhereInput = { organizationId: orgId };
  if (status) where.status = status as Prisma.JobWhereInput['status'];
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

  sendPaginated(res, jobs, {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
}));

// GET /api/jobs/:id - Get single job
router.get('/:id', asyncHandler(async (req, res) => {
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
    return errors.notFound(res, 'Job');
  }

  sendSuccess(res, job);
}));

// POST /api/jobs - Create job
router.post('/', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const data = createJobSchema.parse(req.body);

  // Verify customer belongs to org
  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, organizationId: orgId },
  });

  if (!customer) {
    return errors.notFound(res, 'Customer');
  }

  const job = await prisma.job.create({
    data: {
      title: data.title || 'Untitled Job',
      customerId: data.customerId!,
      organizationId: orgId,
      type: data.type,
      priority: data.priority,
      description: data.description,
      assignedToId: data.assignedToId,
      estimatedValue: data.estimatedValue,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    },
    include: {
      customer: { select: { firstName: true, lastName: true } },
    },
  });

  // Link job to call attribution if one exists for this customer
  try {
    await linkJobToAttribution(
      orgId,
      data.customerId!,
      job.id,
      data.estimatedValue
    );
  } catch (attrError) {
    // Don't fail job creation if attribution linking fails
    logger.warn('Failed to link job to attribution', { jobId: job.id, error: attrError });
  }

  sendSuccess(res, job, 201);
}));

// PATCH /api/jobs/:id - Update job
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const data = updateJobSchema.parse(req.body);

  // Build update data with proper date conversions
  const updateData: Prisma.JobUncheckedUpdateManyInput = { ...data };
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
    return errors.notFound(res, 'Job');
  }

  const updated = await prisma.job.findUnique({
    where: { id },
    include: { customer: true },
  });

  // If job completed, emit event to trigger review request and update attribution
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

    // Update attribution to job_completed stage
    try {
      await updateAttributionStage({
        jobId: id,
        stage: 'job_completed',
        actualValue: updated.actualValue || undefined,
      });
    } catch (attrError) {
      logger.warn('Failed to update attribution stage', { jobId: id, error: attrError });
    }
  }

  // Handle other status changes for attribution
  if (data.status === 'scheduled' && updated) {
    try {
      await updateAttributionStage({
        jobId: id,
        stage: 'job_scheduled',
      });
    } catch (attrError) {
      logger.warn('Failed to update attribution stage', { jobId: id, error: attrError });
    }
  }

  sendSuccess(res, updated);
}));

// DELETE /api/jobs/:id - Delete job
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  const job = await prisma.job.deleteMany({
    where: { id, organizationId: orgId },
  });

  if (job.count === 0) {
    return errors.notFound(res, 'Job');
  }

  sendSuccess(res, { deleted: true });
}));

export default router;
