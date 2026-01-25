/**
 * Job Completion API Routes (PRD-011)
 *
 * Handles the job completion flow including:
 * - Saving partial completion progress
 * - Finalizing job completion
 * - Photo uploads
 * - Triggering invoice creation and review requests
 */

import { Router } from 'express';
import { prisma } from '@serviceflow/database';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { events, JobCompletedEventData } from '../services/events';
import { logger } from '../lib/logger';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

// Parts used schema
const partUsedSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  price: z.number().int().nonnegative(), // cents
});

// Work summary step data
const workSummarySchema = z.object({
  description: z.string().min(1).max(5000),
  partsUsed: z.array(partUsedSchema).default([]),
  actualDuration: z.number().int().positive(), // minutes
  notes: z.string().max(2000).optional(),
});

// Customer approval step data
const customerApprovalSchema = z.object({
  signature: z.string().optional(), // Base64 encoded
  customerEmail: z.string().email().optional(),
  customerNotPresent: z.boolean().default(false),
});

// Payment step data
const paymentSchema = z.object({
  createInvoice: z.boolean().default(true),
  collectNow: z.boolean().default(false),
  paymentMethod: z.enum(['cash', 'check', 'card']).optional(),
  amount: z.number().int().positive().optional(), // cents
});

// Review request step data
const reviewRequestSchema = z.object({
  sent: z.boolean().default(true),
  skipped: z.boolean().default(false),
  skipReason: z.string().max(500).optional(),
});

// Completion step enum
const completionStepSchema = z.enum([
  'work_summary',
  'photos',
  'customer_approval',
  'payment',
  'review_request',
  'confirmation',
]);

// Partial completion state for saving progress
const saveCompletionProgressSchema = z.object({
  currentStep: completionStepSchema,
  workSummary: workSummarySchema.optional(),
  customerApproval: customerApprovalSchema.optional(),
  payment: paymentSchema.optional(),
  reviewRequest: reviewRequestSchema.optional(),
});

// Final completion data
const completeJobSchema = z.object({
  workSummary: workSummarySchema,
  customerApproval: customerApprovalSchema.optional(),
  payment: paymentSchema.optional(),
  reviewRequest: reviewRequestSchema.optional(),
});

// Line item for invoice
const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().int(), // cents
  total: z.number().int(), // cents
});

// ============================================
// PHOTO STORAGE
// ============================================

// Upload directory (for local storage - in production use S3/R2)
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/serviceflow-uploads';

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(orgId: string): Promise<string> {
  const orgDir = path.join(UPLOAD_DIR, orgId, 'jobs');
  await fs.mkdir(orgDir, { recursive: true });
  return orgDir;
}

/**
 * Save a photo file and return the URL
 */
async function savePhoto(
  orgId: string,
  jobId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const uploadDir = await ensureUploadDir(orgId);
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const filename = `${jobId}_${randomUUID()}.${ext}`;
  const filepath = path.join(uploadDir, filename);

  await fs.writeFile(filepath, buffer);

  // Return a relative URL path (in production, return S3/R2 URL)
  return `/uploads/${orgId}/jobs/${filename}`;
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/jobs/:id/completion - Get saved completion state
 * Used to resume a partially completed completion flow
 */
router.get('/:id/completion', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const job = await prisma.job.findFirst({
      where: { id, organizationId: orgId },
      select: {
        id: true,
        status: true,
        completionState: true,
        completionNotes: true,
        actualDuration: true,
        partsUsed: true,
        customerSignature: true,
        completedAt: true,
        jobPhotos: {
          select: {
            id: true,
            url: true,
            type: true,
            caption: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Job not found' },
      });
    }

    // If job is already completed, return the completed data
    if (job.status === 'completed') {
      return res.json({
        success: true,
        data: {
          status: 'completed',
          completedAt: job.completedAt,
          workSummary: {
            description: job.completionNotes,
            partsUsed: job.partsUsed,
            actualDuration: job.actualDuration,
          },
          photos: {
            before: job.jobPhotos.filter((p) => p.type === 'before'),
            after: job.jobPhotos.filter((p) => p.type === 'after'),
          },
          customerSignature: job.customerSignature,
        },
      });
    }

    // Return the partial completion state if exists
    res.json({
      success: true,
      data: {
        status: 'in_progress',
        completionState: job.completionState || null,
        photos: {
          before: job.jobPhotos.filter((p) => p.type === 'before'),
          after: job.jobPhotos.filter((p) => p.type === 'after'),
        },
      },
    });
  } catch (error) {
    logger.error('Error getting completion state', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get completion state' },
    });
  }
});

/**
 * POST /api/jobs/:id/completion - Save partial completion progress
 * Allows saving progress at any step to resume later
 */
router.post('/:id/completion', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;
    const data = saveCompletionProgressSchema.parse(req.body);

    // Verify job exists and belongs to org
    const job = await prisma.job.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Job not found' },
      });
    }

    // Don't allow saving progress for already completed jobs
    if (job.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: { code: 'E5001', message: 'Job is already completed' },
      });
    }

    // Update job status to in_progress if not already
    const updateData: Record<string, unknown> = {
      completionState: data,
    };

    if (job.status !== 'in_progress') {
      updateData.status = 'in_progress';
      updateData.startedAt = new Date();
    }

    const updated = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    logger.info('Completion progress saved', { jobId: id, step: data.currentStep });

    res.json({
      success: true,
      data: {
        jobId: id,
        currentStep: data.currentStep,
        savedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error saving completion progress', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to save completion progress' },
    });
  }
});

/**
 * POST /api/jobs/:id/complete - Finalize job completion
 * Completes the job with all provided data and triggers downstream actions
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;
    const data = completeJobSchema.parse(req.body);

    // Verify job exists and belongs to org
    const job = await prisma.job.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        organization: true,
        jobPhotos: true,
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Job not found' },
      });
    }

    // Don't allow completing already completed jobs
    if (job.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: { code: 'E5001', message: 'Job is already completed' },
      });
    }

    // Calculate actual value from parts
    const partsTotal = data.workSummary.partsUsed.reduce(
      (sum, part) => sum + part.price * part.quantity,
      0
    );

    // Update job with completion data
    const completedJob = await prisma.job.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        completionNotes: data.workSummary.description,
        actualDuration: data.workSummary.actualDuration,
        partsUsed: data.workSummary.partsUsed,
        customerSignature: data.customerApproval?.signature || null,
        notes: data.workSummary.notes || job.notes,
        actualValue: partsTotal || job.actualValue,
        completionState: null, // Clear the partial state
      },
      include: {
        customer: true,
      },
    });

    logger.info('Job completed', { jobId: id });

    // Track results of downstream actions
    const results: Record<string, unknown> = {
      jobId: id,
      completedAt: completedJob.completedAt,
    };

    // Create invoice if requested
    if (data.payment?.createInvoice) {
      try {
        const invoice = await createInvoiceFromCompletion(
          orgId,
          id,
          job.customerId,
          data.workSummary,
          job.organization
        );
        results.invoiceId = invoice.id;
        results.invoiceTotal = invoice.total;
        logger.info('Invoice created from completion', { jobId: id, invoiceId: invoice.id });
      } catch (err) {
        logger.error('Failed to create invoice from completion', err);
        results.invoiceError = 'Failed to create invoice';
      }
    }

    // Emit job completed event (triggers review request handler)
    const skipReview = data.reviewRequest?.skipped === true;
    if (!skipReview) {
      await events.emit<JobCompletedEventData>({
        type: 'job.completed',
        organizationId: orgId,
        aggregateType: 'job',
        aggregateId: id,
        data: {
          jobId: id,
          customerId: job.customerId,
          actualValue: completedJob.actualValue,
          technicianId: job.assignedToId,
        },
      });
      results.reviewRequestTriggered = true;
    } else {
      results.reviewRequestSkipped = true;
      results.reviewSkipReason = data.reviewRequest?.skipReason;
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error completing job', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to complete job' },
    });
  }
});

/**
 * POST /api/jobs/:id/photos - Upload photos for job
 * Handles multipart form data with photos
 */
router.post('/:id/photos', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    // Verify job exists and belongs to org
    const job = await prisma.job.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Job not found' },
      });
    }

    // Get photo type from query or default to 'after'
    const photoType = (req.query.type as string) || 'after';
    if (!['before', 'after'].includes(photoType)) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: 'Photo type must be "before" or "after"' },
      });
    }

    // Check content type
    const contentType = req.headers['content-type'] || '';

    // Handle base64 encoded photo in JSON body
    if (contentType.includes('application/json')) {
      const { photo, caption } = req.body as { photo?: string; caption?: string };

      if (!photo) {
        return res.status(400).json({
          success: false,
          error: { code: 'E2001', message: 'Photo data is required' },
        });
      }

      // Extract base64 data (handle data URI format)
      let base64Data = photo;
      let mimeType = 'image/jpeg';

      if (photo.startsWith('data:')) {
        const matches = photo.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const url = await savePhoto(orgId, id, buffer, mimeType);

      const jobPhoto = await prisma.jobPhoto.create({
        data: {
          jobId: id,
          url,
          type: photoType as 'before' | 'after',
          caption: caption || null,
        },
      });

      logger.info('Photo uploaded', { jobId: id, photoId: jobPhoto.id, type: photoType });

      return res.status(201).json({
        success: true,
        data: jobPhoto,
      });
    }

    // Handle multipart form data
    if (contentType.includes('multipart/form-data')) {
      // For multipart, we need the raw body
      // In a real implementation, use multer or busboy middleware
      // For now, we'll return an error suggesting to use base64
      return res.status(400).json({
        success: false,
        error: {
          code: 'E2001',
          message: 'Use JSON body with base64-encoded photo for now. Multipart upload coming soon.',
        },
      });
    }

    return res.status(400).json({
      success: false,
      error: { code: 'E2001', message: 'Unsupported content type' },
    });
  } catch (error) {
    logger.error('Error uploading photo', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to upload photo' },
    });
  }
});

/**
 * DELETE /api/jobs/:id/photos/:photoId - Delete a job photo
 */
router.delete('/:id/photos/:photoId', async (req, res) => {
  try {
    const { id, photoId } = req.params;
    const orgId = req.auth!.organizationId;

    // Verify job exists and belongs to org
    const job = await prisma.job.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Job not found' },
      });
    }

    // Delete the photo
    const deleted = await prisma.jobPhoto.deleteMany({
      where: { id: photoId, jobId: id },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Photo not found' },
      });
    }

    logger.info('Photo deleted', { jobId: id, photoId });

    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    logger.error('Error deleting photo', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to delete photo' },
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create an invoice from completion data
 */
async function createInvoiceFromCompletion(
  organizationId: string,
  jobId: string,
  customerId: string,
  workSummary: z.infer<typeof workSummarySchema>,
  organization: { settings: unknown }
): Promise<{ id: string; total: number }> {
  // Build line items from parts used
  const lineItems = workSummary.partsUsed.map((part) => ({
    description: part.name,
    quantity: part.quantity,
    unitPrice: part.price,
    total: part.price * part.quantity,
  }));

  // Add labor line item based on duration
  const settings = organization.settings as { laborRate?: number } | null;
  const laborRate = settings?.laborRate || 8500; // Default $85/hour in cents
  const laborHours = workSummary.actualDuration / 60;
  const laborTotal = Math.round(laborHours * laborRate);

  if (laborTotal > 0) {
    lineItems.push({
      description: `Labor (${workSummary.actualDuration} minutes)`,
      quantity: 1,
      unitPrice: laborTotal,
      total: laborTotal,
    });
  }

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = (settings as { taxRate?: number } | null)?.taxRate || 0;
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  // Create the invoice
  const invoice = await prisma.invoice.create({
    data: {
      organizationId,
      jobId,
      customerId,
      status: 'draft',
      lineItems,
      subtotal,
      tax,
      total,
    },
  });

  return { id: invoice.id, total: invoice.total };
}

export default router;
