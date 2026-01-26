/**
 * Stripe Service
 *
 * Handles all Stripe operations:
 * - Subscription checkout sessions
 * - Customer portal sessions
 * - Payment intents for invoices
 */

import Stripe from 'stripe';
import { isFeatureEnabled } from '../config/env';
import { logger } from '../lib/logger';

// Initialize Stripe client
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

// Price IDs for each plan (set these in Stripe Dashboard and env vars)
const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  growth: process.env.STRIPE_PRICE_GROWTH || '',
  scale: process.env.STRIPE_PRICE_SCALE || '',
};

/**
 * Check if Stripe is available
 */
export function isStripeEnabled(): boolean {
  return isFeatureEnabled('stripe') && stripe !== null;
}

/**
 * Get or create a Stripe customer for an organization
 */
export async function getOrCreateCustomer(
  organizationId: string,
  email: string,
  name: string,
  existingStripeCustomerId?: string | null
): Promise<string> {
  if (!stripe) throw new Error('Stripe is not configured');

  // Return existing customer if we have one
  if (existingStripeCustomerId) {
    return existingStripeCustomerId;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      organizationId,
    },
  });

  logger.info('Created Stripe customer', {
    organizationId,
    stripeCustomerId: customer.id,
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(params: {
  organizationId: string;
  customerId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; url: string }> {
  if (!stripe) throw new Error('Stripe is not configured');

  const priceId = PRICE_IDS[params.planId];
  if (!priceId) {
    throw new Error(`No price configured for plan: ${params.planId}`);
  }

  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      organizationId: params.organizationId,
      planId: params.planId,
    },
    subscription_data: {
      metadata: {
        organizationId: params.organizationId,
        planId: params.planId,
      },
    },
  });

  logger.info('Created checkout session', {
    organizationId: params.organizationId,
    planId: params.planId,
    sessionId: session.id,
  });

  return {
    sessionId: session.id,
    url: session.url || '',
  };
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  if (!stripe) throw new Error('Stripe is not configured');

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return { url: session.url };
}

/**
 * Create a payment intent for an invoice
 */
export async function createPaymentIntent(params: {
  amount: number; // in cents
  currency?: string;
  invoiceId: string;
  customerId?: string;
  customerEmail: string;
  description: string;
  organizationId: string;
}): Promise<{
  clientSecret: string;
  paymentIntentId: string;
}> {
  if (!stripe) throw new Error('Stripe is not configured');

  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: params.currency || 'usd',
    automatic_payment_methods: {
      enabled: true,
    },
    receipt_email: params.customerEmail,
    description: params.description,
    metadata: {
      invoiceId: params.invoiceId,
      organizationId: params.organizationId,
    },
  });

  logger.info('Created payment intent', {
    invoiceId: params.invoiceId,
    paymentIntentId: paymentIntent.id,
    amount: params.amount,
  });

  return {
    clientSecret: paymentIntent.client_secret || '',
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Get payment intent status
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<{
  status: string;
  amount: number;
  currency: string;
}> {
  if (!stripe) throw new Error('Stripe is not configured');

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  return {
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
  };
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<void> {
  if (!stripe) throw new Error('Stripe is not configured');

  if (immediately) {
    await stripe.subscriptions.cancel(subscriptionId);
  } else {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  logger.info('Cancelled subscription', {
    subscriptionId,
    immediately,
  });
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!stripe) throw new Error('Stripe is not configured');

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string): Promise<{
  status: string;
  planId: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}> {
  if (!stripe) throw new Error('Stripe is not configured');

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Get plan ID from metadata or price
  const planId = subscription.metadata.planId || 'unknown';

  return {
    status: subscription.status,
    planId,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

export default {
  isStripeEnabled,
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  createPaymentIntent,
  getPaymentIntent,
  cancelSubscription,
  verifyWebhookSignature,
  getSubscription,
};
