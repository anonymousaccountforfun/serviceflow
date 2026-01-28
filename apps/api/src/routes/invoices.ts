/**
 * Invoices API Routes
 *
 * CRUD operations for job invoices and payment handling.
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

// Line item schema
const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().int(), // cents
  total: z.number().int(), // cents
});

type InvoiceLineItem = z.infer<typeof lineItemSchema>;

// Create invoice schema
const createInvoiceSchema = z.object({
  jobId: z.string(),
  estimateId: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  dueDate: z.string().datetime().optional(),
  taxRate: z.number().min(0).max(100).optional(), // percentage
});

// Update invoice schema
const updateInvoiceSchema = z.object({
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'void']).optional(),
  lineItems: z.array(lineItemSchema).optional(),
  dueDate: z.string().datetime().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  paidAmount: z.number().int().optional(),
});

/**
 * Calculate totals from line items
 */
function calculateTotals(lineItems: InvoiceLineItem[], taxRate: number = 0) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tax = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

// GET /api/invoices - List invoices
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

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        job: { select: { id: true, title: true, type: true } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        estimate: { select: { id: true } },
      },
      orderBy: { createdAt: sortOrder },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.invoice.count({ where }),
  ]);

  sendPaginated(res, invoices, {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
}));

// GET /api/invoices/:id - Get single invoice
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
    include: {
      job: true,
      customer: true,
      estimate: true,
    },
  });

  if (!invoice) {
    return errors.notFound(res, 'Invoice');
  }

  sendSuccess(res, invoice);
}));

// POST /api/invoices - Create invoice
router.post('/', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const data = createInvoiceSchema.parse(req.body);

  // Verify job belongs to org and get customer
  const job = await prisma.job.findFirst({
    where: { id: data.jobId, organizationId: orgId },
    include: { customer: true },
  });

  if (!job) {
    return errors.notFound(res, 'Job');
  }

  // Verify estimate if provided
  if (data.estimateId) {
    const estimate = await prisma.estimate.findFirst({
      where: { id: data.estimateId, organizationId: orgId },
    });
    if (!estimate) {
      return errors.notFound(res, 'Estimate');
    }
  }

  const { subtotal, tax, total } = calculateTotals(data.lineItems as InvoiceLineItem[], data.taxRate);

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: orgId,
      jobId: data.jobId,
      customerId: job.customerId,
      estimateId: data.estimateId,
      lineItems: data.lineItems,
      subtotal,
      tax,
      total,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      status: 'draft',
    },
    include: {
      job: { select: { id: true, title: true } },
      customer: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  sendSuccess(res, invoice, 201);
}));

// PATCH /api/invoices/:id - Update invoice
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const data = updateInvoiceSchema.parse(req.body);

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!invoice) {
    return errors.notFound(res, 'Invoice');
  }

  // Don't allow editing paid/void invoices
  if (['paid', 'void'].includes(invoice.status)) {
    return errors.validation(res, 'Cannot edit finalized invoice');
  }

  const updateData: Record<string, unknown> = {};

  if (data.status) {
    updateData.status = data.status;
    if (data.status === 'sent' && !invoice.sentAt) {
      updateData.sentAt = new Date();
    }
    if (data.status === 'paid') {
      updateData.paidAt = new Date();
      updateData.paidAmount = invoice.total;
    }
  }

  if (data.lineItems) {
    const { subtotal, tax, total } = calculateTotals(data.lineItems as InvoiceLineItem[], data.taxRate);
    updateData.lineItems = data.lineItems;
    updateData.subtotal = subtotal;
    updateData.tax = tax;
    updateData.total = total;
  }

  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
  if (data.paidAmount !== undefined) {
    updateData.paidAmount = data.paidAmount;
    // Update status based on payment
    if (data.paidAmount >= invoice.total) {
      updateData.status = 'paid';
      updateData.paidAt = new Date();
    } else if (data.paidAmount > 0) {
      updateData.status = 'partial';
    }
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: updateData,
    include: {
      job: { select: { id: true, title: true } },
      customer: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  sendSuccess(res, updated);
}));

// DELETE /api/invoices/:id - Void invoice (soft delete)
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!invoice) {
    return errors.notFound(res, 'Invoice');
  }

  // Don't allow voiding already paid invoices
  if (invoice.status === 'paid') {
    return errors.validation(res, 'Cannot void paid invoice');
  }

  await prisma.invoice.update({
    where: { id },
    data: { status: 'canceled' },
  });

  sendSuccess(res, { voided: true });
}));

// POST /api/invoices/:id/send - Send invoice to customer
router.post('/:id/send', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
    include: { customer: true, organization: true },
  });

  if (!invoice) {
    return errors.notFound(res, 'Invoice');
  }

  // Update status to sent
  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status: 'sent',
      sentAt: new Date(),
    },
  });

  // Send SMS with invoice/payment link
  if (invoice.customer?.phone) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const paymentLink = `${appUrl}/pay/${invoice.id}`;
    const customerName = [invoice.customer.firstName, invoice.customer.lastName]
      .filter(Boolean)
      .join(' ') || 'Customer';
    const businessName = invoice.organization?.name || 'Our business';
    // Format amount: convert cents to dollars with 2 decimal places
    const amount = (invoice.total / 100).toFixed(2);

    try {
      await sms.sendTemplated({
        organizationId: orgId,
        customerId: invoice.customerId,
        to: invoice.customer.phone,
        templateType: 'invoice_sent',
        variables: {
          customerName,
          amount,
          businessName,
          paymentLink,
        },
      });
      logger.info('Invoice SMS sent', { invoiceId: id, to: invoice.customer.phone });
    } catch (smsError) {
      // Log error but don't fail the request - invoice is still marked as sent
      logger.error('Failed to send invoice SMS', { invoiceId: id, error: smsError });
    }
  } else {
    logger.warn('Cannot send invoice SMS - no customer phone', { invoiceId: id });
  }

  sendSuccess(res, updated);
}));

// POST /api/invoices/:id/record-payment - Record a manual payment
router.post('/:id/record-payment', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const { amount, method, note } = req.body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return errors.validation(res, 'Valid payment amount is required');
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
    include: {
      customer: true,
      organization: true,
    },
  });

  if (!invoice) {
    return errors.notFound(res, 'Invoice');
  }

  if (invoice.status === 'paid') {
    return errors.validation(res, 'Invoice is already paid');
  }

  const newPaidAmount = (invoice.paidAmount || 0) + amount;
  const isPaid = newPaidAmount >= invoice.total;
  const currentUserId = req.auth!.userId;

  // Use transaction to ensure atomicity
  const [payment, updated] = await prisma.$transaction([
    // Create Payment record
    prisma.payment.create({
      data: {
        invoiceId: id,
        organizationId: orgId,
        customerId: invoice.customerId,
        amount,
        method: (method || 'cash') as 'card' | 'ach' | 'cash' | 'check' | 'other',
        status: 'succeeded',
        note,
        recordedBy: currentUserId,
        processedAt: new Date(),
      },
    }),
    // Update invoice
    prisma.invoice.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status: isPaid ? 'paid' : 'partial',
        paidAt: isPaid ? new Date() : undefined,
      },
      include: {
        job: { select: { id: true, title: true } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    }),
  ]);

  logger.info('Payment recorded', { paymentId: payment.id, invoiceId: id, amount, method: method || 'cash' });

  // Send payment confirmation SMS
  if (invoice.customer?.phone) {
    const customerName = [invoice.customer.firstName, invoice.customer.lastName]
      .filter(Boolean)
      .join(' ') || 'Customer';
    const businessName = invoice.organization?.name || 'Our business';
    const formattedAmount = (amount / 100).toFixed(2);

    try {
      await sms.sendTemplated({
        organizationId: orgId,
        customerId: invoice.customerId,
        to: invoice.customer.phone,
        templateType: 'payment_received',
        variables: {
          customerName,
          amount: formattedAmount,
          businessName,
        },
      });
      logger.info('Payment confirmation SMS sent', { invoiceId: id, amount, to: invoice.customer.phone });
    } catch (smsError) {
      // Log error but don't fail - payment is already recorded
      logger.error('Failed to send payment confirmation SMS', { invoiceId: id, error: smsError });
    }
  }

  // Update attribution to payment_collected stage when fully paid
  if (isPaid && invoice.jobId) {
    try {
      await updateAttributionStage({
        jobId: invoice.jobId,
        stage: 'payment_collected',
        actualValue: newPaidAmount,
      });
    } catch (attrError) {
      logger.warn('Failed to update attribution stage', { invoiceId: id, error: attrError });
    }
  }

  sendSuccess(res, {
    ...updated,
    payment: {
      id: payment.id,
      amount,
      method: method || 'cash',
      status: payment.status,
      note,
      recordedBy: currentUserId,
      recordedAt: payment.processedAt,
    },
  });
}));

// GET /api/invoices/:id/payments - Get payments for an invoice
router.get('/:id/payments', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  // Verify invoice exists and belongs to org
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });

  if (!invoice) {
    return errors.notFound(res, 'Invoice');
  }

  const payments = await prisma.payment.findMany({
    where: { invoiceId: id },
    orderBy: { createdAt: 'desc' },
  });

  sendPaginated(res, payments, {
    page: 1,
    perPage: payments.length,
    total: payments.length,
    totalPages: 1,
  });
}));

export default router;
