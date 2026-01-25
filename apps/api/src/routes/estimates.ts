/**
 * Estimates API Routes
 *
 * CRUD operations for job estimates/quotes.
 */

import { Router } from 'express';
import { prisma } from '@serviceflow/database';
import { paginationSchema } from '@serviceflow/shared';
import { z } from 'zod';

const router = Router();

// Line item schema
const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().int(), // cents
  total: z.number().int(), // cents
});

// Create estimate schema
const createEstimateSchema = z.object({
  jobId: z.string(),
  lineItems: z.array(lineItemSchema).min(1),
  notes: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  taxRate: z.number().min(0).max(100).optional(), // percentage
});

// Update estimate schema
const updateEstimateSchema = z.object({
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']).optional(),
  lineItems: z.array(lineItemSchema).optional(),
  notes: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  taxRate: z.number().min(0).max(100).optional(),
});

/**
 * Calculate totals from line items
 */
function calculateTotals(lineItems: Array<{ total: number }>, taxRate: number = 0) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tax = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

// GET /api/estimates - List estimates
router.get('/', async (req, res) => {
  try {
    const { page, perPage, sortOrder } = paginationSchema.parse(req.query);
    const orgId = req.auth!.organizationId;
    const status = req.query.status as string | undefined;
    const jobId = req.query.jobId as string | undefined;
    const customerId = req.query.customerId as string | undefined;

    const where: Record<string, unknown> = { organizationId: orgId };
    if (status) where.status = status;
    if (jobId) where.jobId = jobId;
    if (customerId) where.customerId = customerId;

    const [estimates, total] = await Promise.all([
      prisma.estimate.findMany({
        where,
        include: {
          job: { select: { id: true, title: true, type: true } },
          customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        },
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.estimate.count({ where }),
    ]);

    res.json({
      success: true,
      data: estimates,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error listing estimates:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to list estimates' },
    });
  }
});

// GET /api/estimates/:id - Get single estimate
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const estimate = await prisma.estimate.findFirst({
      where: { id, organizationId: orgId },
      include: {
        job: true,
        customer: true,
        invoices: true,
      },
    });

    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Estimate not found' },
      });
    }

    res.json({ success: true, data: estimate });
  } catch (error) {
    console.error('Error getting estimate:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get estimate' },
    });
  }
});

// POST /api/estimates - Create estimate
router.post('/', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const data = createEstimateSchema.parse(req.body);

    // Verify job belongs to org and get customer
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

    const { subtotal, tax, total } = calculateTotals(data.lineItems, data.taxRate);

    const estimate = await prisma.estimate.create({
      data: {
        organizationId: orgId,
        jobId: data.jobId,
        customerId: job.customerId,
        lineItems: data.lineItems,
        subtotal,
        tax,
        total,
        notes: data.notes,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        status: 'draft',
      },
      include: {
        job: { select: { id: true, title: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ success: true, data: estimate });
  } catch (error) {
    console.error('Error creating estimate:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to create estimate' },
    });
  }
});

// PATCH /api/estimates/:id - Update estimate
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;
    const data = updateEstimateSchema.parse(req.body);

    const estimate = await prisma.estimate.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Estimate not found' },
      });
    }

    // Don't allow editing accepted/rejected estimates
    if (['accepted', 'rejected'].includes(estimate.status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'E5001', message: 'Cannot edit finalized estimate' },
      });
    }

    const updateData: Record<string, unknown> = {};

    if (data.status) {
      updateData.status = data.status;
      if (data.status === 'sent' && !estimate.sentAt) {
        updateData.sentAt = new Date();
      }
      if (data.status === 'accepted') {
        updateData.signedAt = new Date();
      }
    }

    if (data.lineItems) {
      const { subtotal, tax, total } = calculateTotals(data.lineItems, data.taxRate);
      updateData.lineItems = data.lineItems;
      updateData.subtotal = subtotal;
      updateData.tax = tax;
      updateData.total = total;
    }

    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.validUntil) updateData.validUntil = new Date(data.validUntil);

    const updated = await prisma.estimate.update({
      where: { id },
      data: updateData,
      include: {
        job: { select: { id: true, title: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating estimate:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to update estimate' },
    });
  }
});

// DELETE /api/estimates/:id - Delete estimate
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const estimate = await prisma.estimate.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Estimate not found' },
      });
    }

    // Only allow deleting draft estimates
    if (estimate.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: { code: 'E5001', message: 'Can only delete draft estimates' },
      });
    }

    await prisma.estimate.delete({ where: { id } });

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('Error deleting estimate:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to delete estimate' },
    });
  }
});

// POST /api/estimates/:id/send - Send estimate to customer
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const estimate = await prisma.estimate.findFirst({
      where: { id, organizationId: orgId },
      include: { customer: true, organization: true },
    });

    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Estimate not found' },
      });
    }

    // Update status to sent
    const updated = await prisma.estimate.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    // TODO: Send email/SMS with estimate link

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error sending estimate:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to send estimate' },
    });
  }
});

// POST /api/estimates/:id/convert - Convert estimate to invoice
router.post('/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const estimate = await prisma.estimate.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Estimate not found' },
      });
    }

    if (estimate.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        error: { code: 'E5001', message: 'Can only convert accepted estimates to invoices' },
      });
    }

    // Create invoice from estimate
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        jobId: estimate.jobId,
        customerId: estimate.customerId,
        estimateId: estimate.id,
        lineItems: estimate.lineItems,
        subtotal: estimate.subtotal,
        tax: estimate.tax,
        total: estimate.total,
        status: 'draft',
      },
      include: {
        job: { select: { id: true, title: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error converting estimate:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to convert estimate to invoice' },
    });
  }
});

export default router;
