/**
 * Public Payment Routes
 *
 * Handles public payment endpoints for customers paying invoices.
 * These routes don't require authentication.
 *
 * Routes:
 * - GET /api/payments/invoice/:id - Get invoice details for payment
 * - POST /api/payments/invoice/:id/intent - Create payment intent
 * - GET /api/payments/invoice/:id/status - Get payment status
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@serviceflow/database';
import { sendSuccess, errors } from '../utils/api-response';
import stripeService from '../services/stripe';
import { logger } from '../lib/logger';

const router = Router();

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * GET /api/payments/invoice/:id
 * Get invoice details for payment page
 */
router.get('/invoice/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        organization: {
          select: {
            name: true,
            phone: true,
            settings: true,
          },
        },
      },
    });

    if (!invoice) {
      return errors.notFound(res, 'Invoice');
    }

    // Parse lineItems from JSON
    const lineItems = (invoice.lineItems as unknown as LineItem[]) || [];

    // Don't expose internal IDs or sensitive data
    return sendSuccess(res, {
      id: invoice.id,
      invoiceNumber: invoice.id.slice(-8).toUpperCase(), // Use last 8 chars of ID as "number"
      status: invoice.status,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      customer: {
        name: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
        email: invoice.customer.email,
      },
      business: {
        name: invoice.organization.name,
      },
      lineItems: lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    });
  } catch (error) {
    logger.error('Failed to get invoice for payment', { error });
    return errors.internal(res, 'Failed to get invoice');
  }
});

/**
 * POST /api/payments/invoice/:id/intent
 * Create a Stripe payment intent for the invoice
 */
router.post('/invoice/:id/intent', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!stripeService.isStripeEnabled()) {
      return errors.serviceUnavailable(res, 'Payment processing');
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invoice) {
      return errors.notFound(res, 'Invoice');
    }

    if (invoice.status === 'paid') {
      return errors.validation(res, 'Invoice is already paid');
    }

    if (invoice.status === 'canceled') {
      return errors.validation(res, 'Invoice has been canceled');
    }

    // Check if there's already a payment intent
    if (invoice.stripePaymentIntentId) {
      try {
        const existingIntent = await stripeService.getPaymentIntent(
          invoice.stripePaymentIntentId
        );

        // If the intent is still valid, return it
        if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingIntent.status)) {
          // Get the client secret again (we don't store it)
          const paymentIntent = await stripeService.createPaymentIntent({
            amount: invoice.total,
            invoiceId: invoice.id,
            customerEmail: invoice.customer.email || '',
            description: `Invoice ${invoice.id.slice(-8).toUpperCase()} - ${invoice.organization.name}`,
            organizationId: invoice.organizationId,
          });

          // Update with new intent
          await prisma.invoice.update({
            where: { id },
            data: { stripePaymentIntentId: paymentIntent.paymentIntentId },
          });

          return sendSuccess(res, {
            clientSecret: paymentIntent.clientSecret,
          });
        }
      } catch (error) {
        // Intent no longer valid, create new one
        logger.info('Existing payment intent invalid, creating new one', { invoiceId: id });
      }
    }

    // Create new payment intent
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: invoice.total, // Already in cents
      invoiceId: invoice.id,
      customerEmail: invoice.customer.email || '',
      description: `Invoice ${invoice.id.slice(-8).toUpperCase()} - ${invoice.organization.name}`,
      organizationId: invoice.organizationId,
    });

    // Save payment intent ID on invoice
    await prisma.invoice.update({
      where: { id },
      data: { stripePaymentIntentId: paymentIntent.paymentIntentId },
    });

    logger.info('Created payment intent for invoice', {
      invoiceId: id,
      paymentIntentId: paymentIntent.paymentIntentId,
    });

    return sendSuccess(res, {
      clientSecret: paymentIntent.clientSecret,
    });
  } catch (error) {
    logger.error('Failed to create payment intent', { error });
    return errors.internal(res, 'Failed to initialize payment');
  }
});

/**
 * GET /api/payments/invoice/:id/status
 * Get current payment status for an invoice
 */
router.get('/invoice/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        status: true,
        paidAt: true,
        stripePaymentIntentId: true,
      },
    });

    if (!invoice) {
      return errors.notFound(res, 'Invoice');
    }

    let paymentStatus = null;
    if (invoice.stripePaymentIntentId && stripeService.isStripeEnabled()) {
      try {
        paymentStatus = await stripeService.getPaymentIntent(
          invoice.stripePaymentIntentId
        );
      } catch (error) {
        logger.warn('Failed to get payment intent status', { error });
      }
    }

    return sendSuccess(res, {
      invoiceStatus: invoice.status,
      paidAt: invoice.paidAt,
      paymentStatus: paymentStatus?.status || null,
    });
  } catch (error) {
    logger.error('Failed to get payment status', { error });
    return errors.internal(res, 'Failed to get payment status');
  }
});

export default router;
