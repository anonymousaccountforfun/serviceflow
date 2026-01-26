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
 * Handle payment_intent.succeeded
 * Mark invoice as paid
 */
async function handlePaymentSucceeded(paymentIntent: any) {
  const { invoiceId } = paymentIntent.metadata || {};

  if (!invoiceId) {
    // Not an invoice payment, could be subscription
    return;
  }

  // Update invoice status
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'paid',
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  logger.info('Invoice paid', {
    invoiceId,
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
  });
}

/**
 * Handle payment_intent.payment_failed
 * Log failed payment attempt
 */
async function handlePaymentFailed(paymentIntent: any) {
  const { invoiceId } = paymentIntent.metadata || {};

  logger.warn('Payment failed', {
    invoiceId,
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message,
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
