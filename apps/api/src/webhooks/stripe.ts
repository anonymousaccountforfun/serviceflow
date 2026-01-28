/**
 * Stripe Webhook Handler
 *
 * Handles Stripe events:
 * - checkout.session.completed - Subscription created
 * - customer.subscription.updated - Subscription changed
 * - customer.subscription.deleted - Subscription cancelled
 * - payment_intent.succeeded - Invoice payment completed
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@serviceflow/database';
import stripeService from '../services/stripe';
import { logger } from '../lib/logger';
import { sms } from '../services/sms';
import { updateAttributionStage } from '../services/attribution';

const router = Router();

/**
 * POST /webhooks/stripe
 * Handle Stripe webhook events
 */
router.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    logger.warn('Stripe webhook missing signature');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event;
  try {
    // req.body is raw Buffer from express.raw() middleware
    event = stripeService.verifyWebhookSignature(req.body, signature);
  } catch (error) {
    logger.error('Stripe webhook signature verification failed', { error });
    return res.status(400).json({ error: 'Invalid signature' });
  }

  logger.info('Received Stripe webhook', { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        logger.info('Unhandled Stripe event type', { type: event.type });
    }

    return res.json({ received: true });
  } catch (error) {
    logger.error('Failed to process Stripe webhook', { error, eventType: event.type });
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * Handle checkout.session.completed
 * Update organization with subscription info
 */
async function handleCheckoutCompleted(session: any) {
  const { organizationId, planId } = session.metadata || {};

  if (!organizationId) {
    logger.warn('Checkout completed without organizationId in metadata');
    return;
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      subscriptionTier: planId || 'starter',
      subscriptionStatus: 'active',
    },
  });

  logger.info('Subscription activated', {
    organizationId,
    planId,
    subscriptionId: session.subscription,
  });
}

/**
 * Handle customer.subscription.updated
 * Sync subscription status and plan changes
 */
async function handleSubscriptionUpdated(subscription: any) {
  const { organizationId, planId } = subscription.metadata || {};

  if (!organizationId) {
    // Try to find by stripeSubscriptionId
    const org = await prisma.organization.findFirst({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true },
    });

    if (!org) {
      logger.warn('Subscription update for unknown organization', {
        subscriptionId: subscription.id,
      });
      return;
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: {
        subscriptionStatus: mapStripeStatus(subscription.status),
        subscriptionTier: planId || undefined,
      },
    });

    logger.info('Subscription updated', {
      organizationId: org.id,
      status: subscription.status,
    });
    return;
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      subscriptionStatus: mapStripeStatus(subscription.status),
      subscriptionTier: planId || undefined,
    },
  });

  logger.info('Subscription updated', {
    organizationId,
    status: subscription.status,
    planId,
  });
}

/**
 * Handle customer.subscription.deleted
 * Mark subscription as cancelled
 */
async function handleSubscriptionDeleted(subscription: any) {
  const org = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true },
  });

  if (!org) {
    logger.warn('Subscription deleted for unknown organization', {
      subscriptionId: subscription.id,
    });
    return;
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
    },
  });

  logger.info('Subscription canceled', {
    organizationId: org.id,
    subscriptionId: subscription.id,
  });
}

/**
 * Detect payment method type from Stripe payment_intent
 */
function detectPaymentMethod(paymentIntent: any): 'card' | 'ach' | 'other' {
  const paymentMethodType = paymentIntent.payment_method_types?.[0] || '';
  if (paymentMethodType === 'card') return 'card';
  if (paymentMethodType === 'us_bank_account' || paymentMethodType === 'ach_debit') return 'ach';
  return 'other';
}

/**
 * Handle payment_intent.succeeded
 * Mark invoice as paid, create Payment record, and send confirmation SMS
 */
async function handlePaymentSucceeded(paymentIntent: any) {
  const { invoiceId } = paymentIntent.metadata || {};

  if (!invoiceId) {
    // Not an invoice payment, could be subscription
    return;
  }

  // Check for duplicate payment (idempotency)
  const existingPayment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (existingPayment) {
    logger.info('Duplicate payment webhook, already processed', {
      paymentId: existingPayment.id,
      paymentIntentId: paymentIntent.id,
    });
    return;
  }

  // Fetch invoice with customer and organization details for SMS
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      organization: true,
    },
  });

  if (!invoice) {
    logger.warn('Payment succeeded for unknown invoice', { invoiceId });
    return;
  }

  const paymentMethod = detectPaymentMethod(paymentIntent);

  // Create Payment record and update invoice in a transaction
  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId,
        organizationId: invoice.organizationId,
        customerId: invoice.customerId,
        amount: paymentIntent.amount,
        method: paymentMethod,
        status: 'succeeded',
        stripePaymentIntentId: paymentIntent.id,
        processedAt: new Date(),
      },
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paidAmount: paymentIntent.amount,
        stripePaymentIntentId: paymentIntent.id,
      },
    }),
  ]);

  logger.info('Invoice paid', {
    invoiceId,
    paymentId: payment.id,
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    method: paymentMethod,
  });

  // Update attribution to payment_collected stage
  if (invoice.jobId) {
    try {
      await updateAttributionStage({
        jobId: invoice.jobId,
        stage: 'payment_collected',
        actualValue: paymentIntent.amount,
      });
    } catch (attrError) {
      logger.warn('Failed to update attribution stage', { invoiceId, error: attrError });
    }
  }

  // Send payment confirmation SMS
  if (invoice.customer?.phone) {
    const customerName = [invoice.customer.firstName, invoice.customer.lastName]
      .filter(Boolean)
      .join(' ') || 'Customer';
    const businessName = invoice.organization?.name || 'Our business';
    const amount = (paymentIntent.amount / 100).toFixed(2);

    try {
      await sms.sendTemplated({
        organizationId: invoice.organizationId,
        customerId: invoice.customerId,
        to: invoice.customer.phone,
        templateType: 'payment_received',
        variables: {
          customerName,
          amount,
          businessName,
        },
      });
      logger.info('Payment confirmation SMS sent', { invoiceId, to: invoice.customer.phone });
    } catch (smsError) {
      // Log error but don't fail - payment is already processed
      logger.error('Failed to send payment confirmation SMS', { invoiceId, error: smsError });
    }
  }
}

/**
 * Handle payment_intent.payment_failed
 * Create Payment record with failed status for debugging
 */
async function handlePaymentFailed(paymentIntent: any) {
  const { invoiceId } = paymentIntent.metadata || {};

  logger.warn('Payment failed', {
    invoiceId,
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message,
  });

  if (!invoiceId) {
    // Not an invoice payment
    return;
  }

  // Check for duplicate (idempotency)
  const existingPayment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (existingPayment) {
    logger.info('Duplicate failed payment webhook, already processed', {
      paymentId: existingPayment.id,
      paymentIntentId: paymentIntent.id,
    });
    return;
  }

  // Fetch invoice to get organizationId and customerId
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { organizationId: true, customerId: true },
  });

  if (!invoice) {
    logger.warn('Payment failed for unknown invoice', { invoiceId });
    return;
  }

  const paymentMethod = detectPaymentMethod(paymentIntent);
  const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';

  // Create failed Payment record for tracking
  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      organizationId: invoice.organizationId,
      customerId: invoice.customerId,
      amount: paymentIntent.amount,
      method: paymentMethod,
      status: 'failed',
      stripePaymentIntentId: paymentIntent.id,
      note: errorMessage,
      processedAt: new Date(),
    },
  });

  logger.info('Failed payment recorded', {
    paymentId: payment.id,
    invoiceId,
    paymentIntentId: paymentIntent.id,
    error: errorMessage,
  });
}

/**
 * Map Stripe subscription status to our status
 */
function mapStripeStatus(stripeStatus: string): 'active' | 'trialing' | 'past_due' | 'canceled' {
  const statusMap: Record<string, 'active' | 'trialing' | 'past_due' | 'canceled'> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
    incomplete: 'past_due',
    incomplete_expired: 'canceled',
    paused: 'canceled',
  };

  return statusMap[stripeStatus] || 'active';
}

export default router;
