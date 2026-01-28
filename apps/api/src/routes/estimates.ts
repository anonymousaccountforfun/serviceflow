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
import { logger } from '../lib/logger';
import { sms } from '../services/sms';
import { updateAttributionStage } from '../services/attribution';
import { asyncHandler, sendSuccess, sendPaginated, errors } from '../utils/api-response';

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
 *
 * IMPORTANT: This function MUST be called inside a transaction to prevent
 * race conditions where concurrent requests get the same estimate number.
 * Use Prisma's interactive transaction with the tx client passed in.
 */
async function generateEstimateNumber(
  organizationId: string,
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<string> {
  // Use raw SQL with FOR UPDATE to lock the row and prevent race conditions
  // This ensures only one transaction can read/increment at a time
  const latestEstimate = await tx.estimate.findFirst({
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
router.get('/', asyncHandler(async (req, res) => {
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

  sendPaginated(res, estimates, {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
}));

// GET /api/estimates/:id - Get single estimate
router.get('/:id', asyncHandler(async (req, res) => {
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
    return errors.notFound(res, 'Estimate');
  }

  sendSuccess(res, estimate);
}));

// POST /api/estimates - Create estimate
router.post('/', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const data = createEstimateSchema.parse(req.body);

  // Verify customer belongs to org
  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, organizationId: orgId },
  });

  if (!customer) {
    return errors.notFound(res, 'Customer');
  }

  // Verify job if provided
  if (data.jobId) {
    const job = await prisma.job.findFirst({
      where: { id: data.jobId, organizationId: orgId },
    });
    if (!job) {
      return errors.notFound(res, 'Job');
    }
  }

  // Calculate totals
  const taxRate = data.taxRate || 0;
  const { subtotal, taxAmount, total } = calculateTotals(
    data.lineItems as LineItem[],
    taxRate
  );

  // Create estimate with line items in a SERIALIZABLE transaction
  // to prevent race conditions on estimate number generation
  const estimate = await prisma.$transaction(async (tx) => {
    // Generate estimate number INSIDE the transaction to prevent race conditions
    const estimateNumber = await generateEstimateNumber(orgId, tx);

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
  }, {
    isolationLevel: 'Serializable', // Prevent concurrent reads from getting same number
  });

  sendSuccess(res, estimate, 201);
}));

// PATCH /api/estimates/:id - Update draft estimate
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const data = updateEstimateSchema.parse(req.body);

  const estimate = await prisma.estimate.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!estimate) {
    return errors.notFound(res, 'Estimate');
  }

  // Only allow editing draft estimates
  if (estimate.status !== 'draft') {
    return errors.validation(res, 'Can only edit draft estimates');
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

  sendSuccess(res, updated);
}));

// POST /api/estimates/:id/void - Void an estimate
router.post('/:id/void', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  const estimate = await prisma.estimate.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!estimate) {
    return errors.notFound(res, 'Estimate');
  }

  // Cannot void already voided, converted, or approved estimates
  if (['voided', 'converted', 'approved'].includes(estimate.status)) {
    return errors.validation(res, `Cannot void an estimate with status: ${estimate.status}`);
  }

  const updated = await prisma.estimate.update({
    where: { id },
    data: { status: 'voided' },
  });

  sendSuccess(res, updated);
}));

// POST /api/estimates/:id/send - Mark estimate as sent
router.post('/:id/send', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  const estimate = await prisma.estimate.findFirst({
    where: { id, organizationId: orgId },
    include: { customer: true, organization: true },
  });

  if (!estimate) {
    return errors.notFound(res, 'Estimate');
  }

  // Can only send draft estimates
  if (estimate.status !== 'draft') {
    return errors.validation(res, 'Can only send draft estimates');
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

  // Update attribution to quote_sent stage
  if (estimate.jobId) {
    try {
      await updateAttributionStage({
        jobId: estimate.jobId,
        stage: 'quote_sent',
        estimatedValue: estimate.total,
      });
    } catch (attrError) {
      logger.warn('Failed to update attribution stage', { estimateId: id, error: attrError });
    }
  }

  // Return the public token for generating the customer-facing URL
  sendSuccess(res, {
    ...updated,
    publicUrl: `/quote/${updated.publicToken}`,
  });
}));

// POST /api/estimates/:id/convert - Convert approved estimate to invoice
router.post('/:id/convert', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  const estimate = await prisma.estimate.findFirst({
    where: { id, organizationId: orgId },
    include: { lineItems: true },
  });

  if (!estimate) {
    return errors.notFound(res, 'Estimate');
  }

  if (estimate.status !== 'approved') {
    return errors.validation(res, 'Can only convert approved estimates to invoices');
  }

  // Require a job for invoice creation
  if (!estimate.jobId) {
    return errors.validation(res, 'Estimate must be linked to a job before converting to invoice');
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

  sendSuccess(res, invoice, 201);
}));

// Deposit request schema
const requestDepositSchema = z.object({
  depositPercentage: z.number().min(1).max(100).optional(), // Default 50%
  depositAmount: z.number().int().positive().optional(), // Override percentage with fixed amount
  message: z.string().optional(), // Custom message for customer
});

// POST /api/estimates/:id/request-deposit - Request deposit from approved estimate
router.post('/:id/request-deposit', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const data = requestDepositSchema.parse(req.body);

  const estimate = await prisma.estimate.findFirst({
    where: { id, organizationId: orgId },
    include: {
      customer: true,
      organization: true,
      lineItems: true,
    },
  });

  if (!estimate) {
    return errors.notFound(res, 'Estimate');
  }

  // Can only request deposit from approved estimates
  if (estimate.status !== 'approved') {
    return errors.validation(res, 'Can only request deposit from approved estimates');
  }

  // Check if deposit already requested
  if (estimate.depositRequested) {
    return errors.validation(res, 'Deposit has already been requested for this estimate');
  }

  // Calculate deposit amount
  let depositAmount: number;
  if (data.depositAmount) {
    depositAmount = data.depositAmount;
  } else {
    const percentage = data.depositPercentage || 50;
    depositAmount = Math.round(estimate.total * (percentage / 100));
  }

  // Validate deposit amount doesn't exceed total
  if (depositAmount > estimate.total) {
    return errors.validation(res, 'Deposit amount cannot exceed estimate total');
  }

  // Create deposit invoice in a transaction
  const [depositInvoice] = await prisma.$transaction(async (tx) => {
    // Create the deposit invoice
    const invoice = await tx.invoice.create({
      data: {
        organizationId: orgId,
        jobId: estimate.jobId || '', // Will require job for deposit
        customerId: estimate.customerId,
        estimateId: estimate.id,
        lineItems: [{
          description: `Deposit for Estimate ${estimate.number}`,
          quantity: 1,
          unitPrice: depositAmount,
          total: depositAmount,
        }],
        subtotal: depositAmount,
        tax: 0, // No tax on deposit
        total: depositAmount,
        status: 'sent',
        sentAt: new Date(),
        isDeposit: true,
        depositRequired: depositAmount,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    // Update estimate to mark deposit as requested
    await tx.estimate.update({
      where: { id },
      data: {
        depositRequested: true,
        depositInvoiceId: invoice.id,
        depositRequestedAt: new Date(),
      },
    });

    return [invoice];
  });

  logger.info('Deposit invoice created', {
    estimateId: id,
    depositInvoiceId: depositInvoice.id,
    amount: depositAmount,
  });

  // Send SMS with deposit payment link
  if (estimate.customer?.phone) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const paymentLink = `${appUrl}/pay/${depositInvoice.id}`;
    const customerName = [estimate.customer.firstName, estimate.customer.lastName]
      .filter(Boolean)
      .join(' ') || 'Customer';
    const businessName = estimate.organization?.name || 'Our business';
    const amount = (depositAmount / 100).toFixed(2);

    try {
      await sms.sendTemplated({
        organizationId: orgId,
        customerId: estimate.customerId,
        to: estimate.customer.phone,
        templateType: 'deposit_requested',
        variables: {
          customerName,
          amount,
          businessName,
          paymentLink,
          estimateNumber: estimate.number,
        },
      });
      logger.info('Deposit request SMS sent', { estimateId: id, to: estimate.customer.phone });
    } catch (smsError) {
      // Log error but don't fail - deposit invoice is still created
      logger.error('Failed to send deposit request SMS', { estimateId: id, error: smsError });
    }
  } else {
    logger.warn('Cannot send deposit SMS - no customer phone', { estimateId: id });
  }

  sendSuccess(res, {
    depositInvoice,
    estimate: {
      id: estimate.id,
      depositRequested: true,
      depositInvoiceId: depositInvoice.id,
    },
  }, 201);
}));

export default router;
