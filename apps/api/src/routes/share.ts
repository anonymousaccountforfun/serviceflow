/**
 * Share Routes
 *
 * Handles creating and validating share tokens for public pages.
 */

import { Router } from 'express';
import { prisma } from '@serviceflow/database';
import { roiCalculator } from '../services/roi-calculator';
import { logger } from '../lib/logger';
import { subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import crypto from 'crypto';
import { asyncHandler, sendSuccess, errors } from '../utils/api-response';

const router = Router();

/**
 * POST /api/share/roi
 *
 * Create a share token for ROI report.
 * Requires authentication.
 */
router.post('/roi', asyncHandler(async (req, res) => {
  const { organizationId } = req.auth!;
  const { expiresInDays = 7 } = req.body;

  // Generate unique token
  const token = crypto.randomBytes(16).toString('hex');

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Create share token
  const shareToken = await prisma.shareToken.create({
    data: {
      token,
      organizationId,
      type: 'roi_report',
      expiresAt,
      createdById: req.auth?.userId,
    },
  });

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.serviceflow.app'}/share/roi/${token}`;

  logger.info('ROI share token created', {
    organizationId,
    tokenId: shareToken.id,
    expiresAt,
  });

  sendSuccess(res, {
    token,
    shareUrl,
    expiresAt: shareToken.expiresAt,
  });
}));

/**
 * GET /api/share/roi/:token
 *
 * Get shared ROI data by token.
 * Public endpoint - no authentication required.
 */
router.get('/roi/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { period = 'last_30_days' } = req.query;

  // ATOMIC view count increment with validation using raw SQL
  // This prevents race conditions where concurrent requests can exceed maxViews
  // The WHERE clause atomically checks expiry and view limit before incrementing
  const updateResult = await prisma.$executeRaw`
    UPDATE "ShareToken"
    SET "viewCount" = "viewCount" + 1
    WHERE "token" = ${token}
      AND "expiresAt" > NOW()
      AND ("maxViews" IS NULL OR "viewCount" < "maxViews")
  `;

  // If no rows updated, the token was expired, at max views, or doesn't exist
  if (updateResult === 0) {
    // Fetch token to determine the specific error
    const existingToken = await prisma.shareToken.findUnique({
      where: { token },
      select: { expiresAt: true, maxViews: true, viewCount: true },
    });

    if (!existingToken) {
      return errors.notFound(res, 'Share link');
    }

    if (existingToken.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        error: { code: 'EXPIRED', message: 'This share link has expired' },
      });
    }

    if (existingToken.maxViews && existingToken.viewCount >= existingToken.maxViews) {
      return res.status(410).json({
        success: false,
        error: { code: 'MAX_VIEWS', message: 'This share link has reached its view limit' },
      });
    }
  }

  // Now fetch the full token data
  const shareToken = await prisma.shareToken.findUnique({
    where: { token },
  });

  if (!shareToken) {
    return errors.notFound(res, 'Share link');
  }

  // Get organization info
  const organization = await prisma.organization.findUnique({
    where: { id: shareToken.organizationId },
    select: { name: true, settings: true },
  });

  if (!organization) {
    return errors.notFound(res, 'Organization');
  }

  // Calculate date range based on period
  const now = new Date();
  let startDate: Date;
  let endDate = now;
  let periodLabel: string;

  switch (period) {
    case 'this_month':
      startDate = startOfMonth(now);
      periodLabel = 'This Month';
      break;
    case 'last_month':
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
      periodLabel = 'Last Month';
      break;
    case 'last_90_days':
      startDate = subDays(now, 90);
      periodLabel = 'Last 90 Days';
      break;
    case 'last_30_days':
    default:
      startDate = subDays(now, 30);
      periodLabel = 'Last 30 Days';
  }

  // Get ROI metrics
  const roi = await roiCalculator.calculateROI(
    shareToken.organizationId,
    startDate,
    endDate
  );

  const counterfactual = await roiCalculator.calculateCounterfactual(
    shareToken.organizationId,
    startDate,
    endDate
  );

  const funnel = await roiCalculator.getFunnelMetrics(
    shareToken.organizationId,
    startDate,
    endDate
  );

  sendSuccess(res, {
    businessName: organization.name,
    periodLabel,
    roi: {
      roiDollars: roi.roiDollars,
      roiMultiplier: roi.roiMultiplier,
      callsRecovered: roi.callsRecovered,
      callsAnsweredByAI: roi.callsAnsweredByAI,
      callsRecoveredByTextBack: roi.callsRecoveredByTextBack,
      revenueFromRecoveredCalls: Math.round(roi.revenueFromRecoveredCalls / 100),
      timeSavedMinutes: roi.timeSavedMinutes,
      hoursSaved: Math.round((roi.timeSavedMinutes / 60) * 10) / 10,
    },
    counterfactual: {
      missedCallsWithoutServiceFlow: counterfactual.missedCallsWithoutServiceFlow,
      lostRevenueWithoutServiceFlow: Math.round(
        counterfactual.lostRevenueWithoutServiceFlow / 100
      ),
      industryMissedCallRate: counterfactual.industryMissedCallRate,
    },
    funnel,
    expiresAt: shareToken.expiresAt,
  });
}));

/**
 * DELETE /api/share/:token
 *
 * Revoke a share token.
 * Requires authentication and ownership.
 */
router.delete('/:token', asyncHandler(async (req, res) => {
  const { organizationId } = req.auth!;
  const { token } = req.params;

  const shareToken = await prisma.shareToken.findFirst({
    where: {
      token,
      organizationId,
    },
  });

  if (!shareToken) {
    return errors.notFound(res, 'Share token');
  }

  await prisma.shareToken.delete({
    where: { id: shareToken.id },
  });

  logger.info('Share token revoked', { organizationId, tokenId: shareToken.id });

  sendSuccess(res, { deleted: true });
}));

/**
 * GET /api/share/list
 *
 * List all share tokens for the organization.
 * Requires authentication.
 */
router.get('/list', asyncHandler(async (req, res) => {
  const { organizationId } = req.auth!;

  const tokens = await prisma.shareToken.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  sendSuccess(res, tokens.map((t) => ({
    id: t.id,
    token: t.token,
    type: t.type,
    expiresAt: t.expiresAt,
    viewCount: t.viewCount,
    isExpired: t.expiresAt < new Date(),
    shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.serviceflow.app'}/share/roi/${t.token}`,
    createdAt: t.createdAt,
  })));
}));

export default router;
