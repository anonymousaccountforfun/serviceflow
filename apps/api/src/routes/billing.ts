/**
 * Billing Routes
 *
 * Handles subscription management and billing portal access.
 *
 * Routes:
 * - POST /api/billing/checkout - Create checkout session for plan upgrade
 * - POST /api/billing/portal - Create customer portal session
 * - GET /api/billing/subscription - Get current subscription details
 * - POST /api/billing/cancel - Cancel subscription
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@serviceflow/database';
import { sendSuccess, errors } from '../utils/api-response';
import stripeService from '../services/stripe';
import { logger } from '../lib/logger';

const router = Router();

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout session for subscription upgrade
 */
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { organizationId, userId } = req.auth!;
    const { planId } = req.body;

    if (!planId || !['starter', 'growth', 'scale'].includes(planId)) {
      return errors.validation(res, 'Invalid plan ID');
    }

    if (!stripeService.isStripeEnabled()) {
      return errors.serviceUnavailable(res, 'Stripe');
    }

    // Get organization and user details
    const [organization, user] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          stripeCustomerId: true,
        },
      }),
      prisma.user.findFirst({
        where: { id: userId },
        select: { email: true },
      }),
    ]);

    if (!organization || !user) {
      return errors.notFound(res, 'Organization');
    }

    // Get or create Stripe customer
    const stripeCustomerId = await stripeService.getOrCreateCustomer(
      organizationId,
      user.email,
      organization.name,
      organization.stripeCustomerId
    );

    // Update organization with Stripe customer ID if new
    if (!organization.stripeCustomerId) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId },
      });
    }

    // Create checkout session
    const baseUrl = process.env.WEB_URL || 'http://localhost:3000';
    const session = await stripeService.createCheckoutSession({
      organizationId,
      customerId: stripeCustomerId,
      planId,
      successUrl: `${baseUrl}/dashboard/settings/billing?success=true`,
      cancelUrl: `${baseUrl}/dashboard/settings/billing?canceled=true`,
    });

    logger.info('Created checkout session for upgrade', {
      organizationId,
      planId,
      sessionId: session.sessionId,
    });

    return sendSuccess(res, {
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (error) {
    logger.error('Failed to create checkout session', { error });
    return errors.internal(res, 'Failed to create checkout session');
  }
});

/**
 * POST /api/billing/portal
 * Create a Stripe Customer Portal session
 */
router.post('/portal', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.auth!;

    if (!stripeService.isStripeEnabled()) {
      return errors.serviceUnavailable(res, 'Stripe');
    }

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        stripeCustomerId: true,
      },
    });

    if (!organization?.stripeCustomerId) {
      return errors.notFound(res, 'Billing account');
    }

    // Create portal session
    const baseUrl = process.env.WEB_URL || 'http://localhost:3000';
    const session = await stripeService.createPortalSession({
      customerId: organization.stripeCustomerId,
      returnUrl: `${baseUrl}/dashboard/settings/billing`,
    });

    return sendSuccess(res, { url: session.url });
  } catch (error) {
    logger.error('Failed to create portal session', { error });
    return errors.internal(res, 'Failed to create portal session');
  }
});

/**
 * GET /api/billing/subscription
 * Get current subscription details
 */
router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.auth!;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        settings: true,
      },
    });

    if (!organization) {
      return errors.notFound(res, 'Organization');
    }

    let subscriptionDetails = null;
    if (organization.stripeSubscriptionId && stripeService.isStripeEnabled()) {
      try {
        subscriptionDetails = await stripeService.getSubscription(
          organization.stripeSubscriptionId
        );
      } catch (error) {
        logger.warn('Failed to fetch subscription from Stripe', { error });
      }
    }

    // Calculate trial days remaining
    const settings = organization.settings as Record<string, unknown> | null;
    const trialEndsAt = settings?.trialEndsAt as string | undefined;
    const trialDaysLeft = trialEndsAt
      ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return sendSuccess(res, {
      tier: organization.subscriptionTier,
      status: organization.subscriptionStatus,
      trialDaysLeft,
      stripeDetails: subscriptionDetails,
    });
  } catch (error) {
    logger.error('Failed to get subscription', { error });
    return errors.internal(res, 'Failed to get subscription details');
  }
});

/**
 * POST /api/billing/cancel
 * Cancel subscription
 */
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.auth!;
    const { immediately = false } = req.body;

    if (!stripeService.isStripeEnabled()) {
      return errors.serviceUnavailable(res, 'Stripe');
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        stripeSubscriptionId: true,
      },
    });

    if (!organization?.stripeSubscriptionId) {
      return errors.notFound(res, 'Active subscription');
    }

    await stripeService.cancelSubscription(
      organization.stripeSubscriptionId,
      immediately
    );

    logger.info('Subscription cancelled', {
      organizationId,
      immediately,
    });

    return sendSuccess(res, {
      message: immediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at the end of the billing period',
    });
  } catch (error) {
    logger.error('Failed to cancel subscription', { error });
    return errors.internal(res, 'Failed to cancel subscription');
  }
});

export default router;
