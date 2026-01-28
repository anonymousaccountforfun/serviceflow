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
import { logWebhook, markWebhookProcessed, markWebhookIgnored } from '../services/webhooks';

const router = Router();

/**
 * Check if a Stripe webhook event has already been processed (idempotency)
 * Returns the existing webhook log if found, null otherwise
 */
async function checkStripeIdempotency(eventId: string): Promise<{ isDuplicate: boolean; logId?: string }> {
  const existing = await prisma.webhookLog.findFirst({
    where: { provider: 'stripe', externalId: eventId },
    select: { id: true, status: true },
  });

  if (existing) {
    return { isDuplicate: true, logId: existing.id };
  }

  return { isDuplicate: false };
}

/**
 * Event ordering validation for subscription events
 *
 * Stripe events can arrive out of order. This function checks if we should
 * process an event based on its timestamp compared to the last processed event.
 *
 * Returns true if the event should be processed, false if it's stale.
 */
async function shouldProcessSubscriptionEvent(
  subscriptionId: string,
  eventTimestamp: number
): Promise<boolean> {
  // Find the most recent webhook for this subscription
  const latestWebhook = await prisma.webhookLog.findFirst({
    where: {
      provider: 'stripe',
      eventType: { startsWith: 'customer.subscription' },
      status: 'processed',
    },
    orderBy: { createdAt: 'desc' },
    select: { payload: true, createdAt: true },
  });

  if (!latestWebhook) {
    return true; // No previous events, process this one
  }

  // Check if the event in the payload matches this subscription
  const payload = latestWebhook.payload as any;
  if (payload?.data?.object?.id !== subscriptionId) {
    return true; // Different subscription, process this one
  }

  // Compare timestamps - Stripe event.created is in seconds
  const latestTimestamp = payload?.created || 0;
  if (eventTimestamp < latestTimestamp) {
    logger.info('Ignoring out-of-order subscription event', {
      subscriptionId,
      eventTimestamp,
      latestTimestamp,
    });
    return false;
  }

  return true;
}

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

  // Check for duplicate event (idempotency)
  const { isDuplicate, logId: existingLogId } = await checkStripeIdempotency(event.id);
  if (isDuplicate) {
    logger.info('Duplicate Stripe webhook, already processed', { eventId: event.id });
    return res.json({ received: true, duplicate: true });
  }

  // Log the webhook for audit trail
  const webhookLogId = await logWebhook({
    provider: 'stripe',
    eventType: event.type,
    externalId: event.id,
    payload: event,
  });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.updated': {
        // Check event ordering to prevent out-of-order updates
        const subscription = event.data.object as any;
        if (await shouldProcessSubscriptionEvent(subscription.id, event.created)) {
          await handleSubscriptionUpdated(subscription);
        } else {
          await markWebhookIgnored(webhookLogId);
          return res.json({ received: true, skipped: 'out_of_order' });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Check event ordering to prevent out-of-order updates
        const subscription = event.data.object as any;
        if (await shouldProcessSubscriptionEvent(subscription.id, event.created)) {
          await handleSubscriptionDeleted(subscription);
        } else {
          await markWebhookIgnored(webhookLogId);
          return res.json({ received: true, skipped: 'out_of_order' });
        }
        break;
      }

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        logger.info('Unhandled Stripe event type', { type: event.type });
        await markWebhookIgnored(webhookLogId);
        return res.json({ received: true });
    }

    await markWebhookProcessed(webhookLogId);
    return res.json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await markWebhookProcessed(webhookLogId, errorMessage);
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
 * Create Payment record with failed status, update invoice status, and notify customer
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

  // Fetch invoice with customer and organization details
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      organization: true,
    },
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

  // Send payment failure notification SMS
  if (invoice.customer?.phone) {
    const customerName = [invoice.customer.firstName, invoice.customer.lastName]
      .filter(Boolean)
      .join(' ') || 'Customer';
    const businessName = invoice.organization?.name || 'Our business';
    const amount = (paymentIntent.amount / 100).toFixed(2);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const paymentLink = `${appUrl}/pay/${invoice.id}`;

    try {
      await sms.sendTemplated({
        organizationId: invoice.organizationId,
        customerId: invoice.customerId,
        to: invoice.customer.phone,
        templateType: 'payment_failed',
        variables: {
          customerName,
          amount,
          businessName,
          paymentLink,
          errorMessage: errorMessage.substring(0, 100), // Truncate long errors
        },
      });
      logger.info('Payment failure SMS sent', { invoiceId, to: invoice.customer.phone });
    } catch (smsError) {
      // Log error but don't fail - payment failure is already recorded
      logger.error('Failed to send payment failure SMS', { invoiceId, error: smsError });
    }
  }
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
