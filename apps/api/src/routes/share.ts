/**
 * Share Routes
 *
 * Handles creating and validating share tokens for public pages.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@serviceflow/database';
import { roiCalculator } from '../services/roi-calculator';
import { logger } from '../lib/logger';
import { subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/share/roi
 *
 * Create a share token for ROI report.
 * Requires authentication.
 */
router.post('/roi', async (req: Request, res: Response) => {
  const { organizationId } = req.auth!;
  const { expiresInDays = 7, period = 'last_30_days' } = req.body;

  try {
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

    return res.json({
      success: true,
      data: {
        token,
        shareUrl,
        expiresAt: shareToken.expiresAt,
      },
    });
  } catch (error: any) {
    logger.error('Failed to create share token', error);
    return res.status(500).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: 'Failed to create share link' },
    });
  }
});

/**
 * GET /api/share/roi/:token
 *
 * Get shared ROI data by token.
 * Public endpoint - no authentication required.
 */
router.get('/roi/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { period = 'last_30_days' } = req.query;

  try {
    // Find and validate token
    const shareToken = await prisma.shareToken.findUnique({
      where: { token },
    });

    if (!shareToken) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Share link not found or expired' },
      });
    }

    // Check if expired
    if (shareToken.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        error: { code: 'EXPIRED', message: 'This share link has expired' },
      });
    }

    // Check max views
    if (shareToken.maxViews && shareToken.viewCount >= shareToken.maxViews) {
      return res.status(410).json({
        success: false,
        error: { code: 'MAX_VIEWS', message: 'This share link has reached its view limit' },
      });
    }

    // Increment view count
    await prisma.shareToken.update({
      where: { id: shareToken.id },
      data: { viewCount: { increment: 1 } },
    });

    // Get organization info
    const organization = await prisma.organization.findUnique({
      where: { id: shareToken.organizationId },
      select: { name: true, settings: true },
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORG_NOT_FOUND', message: 'Organization not found' },
      });
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

    return res.json({
      success: true,
      data: {
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
      },
    });
  } catch (error: any) {
    logger.error('Failed to get shared ROI', error);
    return res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to load shared data' },
    });
  }
});

/**
 * DELETE /api/share/:token
 *
 * Revoke a share token.
 * Requires authentication and ownership.
 */
router.delete('/:token', async (req: Request, res: Response) => {
  const { organizationId } = req.auth!;
  const { token } = req.params;

  try {
    const shareToken = await prisma.shareToken.findFirst({
      where: {
        token,
        organizationId,
      },
    });

    if (!shareToken) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Share token not found' },
      });
    }

    await prisma.shareToken.delete({
      where: { id: shareToken.id },
    });

    logger.info('Share token revoked', { organizationId, tokenId: shareToken.id });

    return res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error: any) {
    logger.error('Failed to delete share token', error);
    return res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: 'Failed to revoke share link' },
    });
  }
});

/**
 * GET /api/share/list
 *
 * List all share tokens for the organization.
 * Requires authentication.
 */
router.get('/list', async (req: Request, res: Response) => {
  const { organizationId } = req.auth!;

  try {
    const tokens = await prisma.shareToken.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({
      success: true,
      data: tokens.map((t) => ({
        id: t.id,
        token: t.token,
        type: t.type,
        expiresAt: t.expiresAt,
        viewCount: t.viewCount,
        isExpired: t.expiresAt < new Date(),
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.serviceflow.app'}/share/roi/${t.token}`,
        createdAt: t.createdAt,
      })),
    });
  } catch (error: any) {
    logger.error('Failed to list share tokens', error);
    return res.status(500).json({
      success: false,
      error: { code: 'LIST_FAILED', message: 'Failed to list share links' },
    });
  }
});

export default router;
