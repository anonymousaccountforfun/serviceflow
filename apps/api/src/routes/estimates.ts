/**
 * Estimates API Routes
 *
 * CRUD operations for job estimates/quotes with line items.
 * Implements PRD-007: Estimates & Quotes
 */

import { Router } from 'express';
import { prisma } from '@serviceflow/database';
import { paginationSchema } from '@serviceflow/shared';
import { z } from 'zod';

const router = Router();

// Line item schema for create/update
const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive(), // quantity * 100 for precision
  unitPrice: z.number().int(), // cents
  total: z.number().int(), // cents
  sortOrder: z.number().int().optional(),
});

type LineItem = z.infer<typeof lineItemSchema>;

// Create estimate schema
const createEstimateSchema = z.object({
  customerId: z.string(),
  jobId: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  notes: z.string().optional(),
  terms: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  taxRate: z.number().int().min(0).max(10000).optional(), // percentage * 100 (e.g., 825 = 8.25%)
});

// Update estimate schema
const updateEstimateSchema = z.object({
  lineItems: z.array(lineItemSchema).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  taxRate: z.number().int().min(0).max(10000).optional(),
});

/**
 * Generate the next estimate number for an organization
 * Format: EST-001, EST-002, etc.
 */
async function generateEstimateNumber(organizationId: string): Promise<string> {
  // Get the latest estimate number for this organization
  const latestEstimate = await prisma.estimate.findFirst({
    where: { organizationId },
    orderBy: { number: 'desc' },
    select: { number: true },
  });

  if (!latestEstimate) {
    return 'EST-001';
  }

  // Extract the number part and increment
  const match = latestEstimate.number.match(/EST-(\d+)/);
  if (!match) {
    return 'EST-001';
  }

  const nextNumber = parseInt(match[1], 10) + 1;
  return `EST-${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Calculate totals from line items
 */
function calculateTotals(
  lineItems: LineItem[],
  taxRate: number = 0
) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = Math.round(subtotal * (taxRate / 10000)); // taxRate is percentage * 100
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
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
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          lineItems: { orderBy: { sortOrder: 'asc' } },
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
        lineItems: { orderBy: { sortOrder: 'asc' } },
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

    // Verify job if provided
    if (data.jobId) {
      const job = await prisma.job.findFirst({
        where: { id: data.jobId, organizationId: orgId },
      });
      if (!job) {
        return res.status(400).json({
          success: false,
          error: { code: 'E3001', message: 'Job not found' },
        });
      }
    }

    // Generate estimate number
    const estimateNumber = await generateEstimateNumber(orgId);

    // Calculate totals
    const taxRate = data.taxRate || 0;
    const { subtotal, taxAmount, total } = calculateTotals(
      data.lineItems as LineItem[],
      taxRate
    );

    // Create estimate with line items in a transaction
    const estimate = await prisma.$transaction(async (tx) => {
      const newEstimate = await tx.estimate.create({
        data: {
          number: estimateNumber,
          organizationId: orgId,
          customerId: data.customerId,
          jobId: data.jobId,
          status: 'draft',
          subtotal,
          taxRate,
          taxAmount,
          total,
          notes: data.notes,
          terms: data.terms,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        },
      });

      // Create line items
      await tx.estimateLineItem.createMany({
        data: data.lineItems.map((item, index) => ({
          estimateId: newEstimate.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          sortOrder: item.sortOrder ?? index,
        })),
      });

      return tx.estimate.findUnique({
        where: { id: newEstimate.id },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
          job: { select: { id: true, title: true } },
          lineItems: { orderBy: { sortOrder: 'asc' } },
        },
      });
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

// PATCH /api/estimates/:id - Update draft estimate
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

    // Only allow editing draft estimates
    if (estimate.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E5001',
          message: 'Can only edit draft estimates',
        },
      });
    }

    // Update in transaction if line items are being updated
    const updated = await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {};

      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.terms !== undefined) updateData.terms = data.terms;
      if (data.validUntil) updateData.validUntil = new Date(data.validUntil);
      if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;

      if (data.lineItems) {
        // Delete existing line items
        await tx.estimateLineItem.deleteMany({
          where: { estimateId: id },
        });

        // Create new line items
        await tx.estimateLineItem.createMany({
          data: data.lineItems.map((item, index) => ({
            estimateId: id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            sortOrder: item.sortOrder ?? index,
          })),
        });

        // Recalculate totals
        const taxRate = data.taxRate ?? estimate.taxRate;
        const { subtotal, taxAmount, total } = calculateTotals(
          data.lineItems as LineItem[],
          taxRate
        );
        updateData.subtotal = subtotal;
        updateData.taxAmount = taxAmount;
        updateData.total = total;
      }

      return tx.estimate.update({
        where: { id },
        data: updateData,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
          job: { select: { id: true, title: true } },
          lineItems: { orderBy: { sortOrder: 'asc' } },
        },
      });
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

// POST /api/estimates/:id/void - Void an estimate
router.post('/:id/void', async (req, res) => {
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

    // Cannot void already voided, converted, or approved estimates
    if (['voided', 'converted', 'approved'].includes(estimate.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E5001',
          message: `Cannot void an estimate with status: ${estimate.status}`,
        },
      });
    }

    const updated = await prisma.estimate.update({
      where: { id },
      data: { status: 'voided' },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error voiding estimate:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to void estimate' },
    });
  }
});

// POST /api/estimates/:id/send - Mark estimate as sent
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

    // Can only send draft estimates
    if (estimate.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E5001',
          message: 'Can only send draft estimates',
        },
      });
    }

    // Update status to sent
    const updated = await prisma.estimate.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    });

    // Return the public token for generating the customer-facing URL
    res.json({
      success: true,
      data: updated,
      publicUrl: `/quote/${updated.publicToken}`,
    });
  } catch (error) {
    console.error('Error sending estimate:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to send estimate' },
    });
  }
});

// POST /api/estimates/:id/convert - Convert approved estimate to invoice
router.post('/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const estimate = await prisma.estimate.findFirst({
      where: { id, organizationId: orgId },
      include: { lineItems: true },
    });

    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Estimate not found' },
      });
    }

    if (estimate.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E5001',
          message: 'Can only convert approved estimates to invoices',
        },
      });
    }

    // Require a job for invoice creation
    if (!estimate.jobId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E5002',
          message: 'Estimate must be linked to a job before converting to invoice',
        },
      });
    }

    // Create invoice from estimate with line items as JSON
    const lineItemsJson = estimate.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    }));

    const invoice = await prisma.$transaction(async (tx) => {
      // Update estimate status to converted
      await tx.estimate.update({
        where: { id },
        data: { status: 'converted' },
      });

      // Create the invoice
      return tx.invoice.create({
        data: {
          organizationId: orgId,
          jobId: estimate.jobId!,
          customerId: estimate.customerId,
          estimateId: estimate.id,
          lineItems: lineItemsJson,
          subtotal: estimate.subtotal,
          tax: estimate.taxAmount,
          total: estimate.total,
          status: 'draft',
        },
        include: {
          job: { select: { id: true, title: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
        },
      });
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
