/**
 * Cron Job Routes
 *
 * Handles scheduled tasks like weekly ROI reports.
 * These endpoints are called by Vercel Cron or similar schedulers.
 *
 * Security: Protected by CRON_SECRET header verification.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@serviceflow/database';
import { email, ROIReportData } from '../services';
import { roiCalculator } from '../services/roi-calculator';
import { logger } from '../lib/logger';
import { subWeeks, startOfWeek, endOfWeek, format } from 'date-fns';

const router = Router();

/**
 * Verify cron secret middleware
 */
function verifyCronSecret(req: Request, res: Response, next: Function) {
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow without secret
  if (process.env.NODE_ENV === 'development' && !cronSecret) {
    return next();
  }

  // Check authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron request', {
      path: req.path,
      ip: req.ip,
    });
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' },
    });
  }

  next();
}

/**
 * POST /api/cron/weekly-report
 *
 * Send weekly ROI report emails to all organizations that have opted in.
 * Called by Vercel Cron every Monday at 8 AM.
 *
 * Vercel cron.json config:
 * {
 *   "crons": [{
 *     "path": "/api/cron/weekly-report",
 *     "schedule": "0 8 * * 1"
 *   }]
 * }
 */
router.post('/weekly-report', verifyCronSecret, async (req: Request, res: Response) => {
  logger.info('Starting weekly report job');

  try {
    // Get date range for last week
    const now = new Date();
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }); // Monday
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }); // Sunday
    const periodLabel = `${format(lastWeekStart, 'MMM d')} - ${format(lastWeekEnd, 'MMM d')}`;

    // Find all organizations with weekly reports enabled
    const organizations = await prisma.organization.findMany({
      where: {
        // Check for weekly report preference in settings
        settings: {
          path: ['emailPreferences', 'weeklyReport'],
          equals: true,
        },
      },
      include: {
        users: {
          where: {
            role: { in: ['owner', 'admin'] }, // Only send to owners and admins
          },
          select: {
            email: true,
          },
        },
      },
    });

    logger.info('Found organizations for weekly report', { count: organizations.length });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const org of organizations) {
      try {
        // Skip if no users to send to
        if (org.users.length === 0) {
          logger.debug('Skipping org with no recipients', { orgId: org.id });
          continue;
        }

        // Calculate ROI metrics
        const roi = await roiCalculator.calculateROI(org.id, lastWeekStart, lastWeekEnd);
        const counterfactual = await roiCalculator.calculateCounterfactual(
          org.id,
          lastWeekStart,
          lastWeekEnd
        );

        // Build report data
        const reportData: ROIReportData = {
          businessName: org.name,
          periodLabel,
          roiDollars: roi.roiDollars,
          roiMultiplier: roi.roiMultiplier,
          callsRecovered: roi.callsRecovered,
          callsAnsweredByAI: roi.callsAnsweredByAI,
          callsRecoveredByTextBack: roi.callsRecoveredByTextBack,
          revenueCaptured: Math.round(roi.revenueFromRecoveredCalls / 100),
          hoursSaved: Math.round((roi.timeSavedMinutes / 60) * 10) / 10,
          missedCallsWithoutServiceFlow: counterfactual.missedCallsWithoutServiceFlow,
          lostRevenueWithoutServiceFlow: Math.round(
            counterfactual.lostRevenueWithoutServiceFlow / 100
          ),
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.serviceflow.app'}/dashboard/impact`,
        };

        // Send to all admins/owners
        for (const user of org.users) {
          if (!user.email) continue;

          const result = await email.sendROIReport(user.email, reportData);
          if (result.success) {
            sent++;
          } else {
            failed++;
            errors.push(`${org.id}:${user.email} - ${result.error?.message}`);
          }
        }
      } catch (orgError: any) {
        logger.error('Failed to process org for weekly report', {
          orgId: org.id,
          error: orgError.message,
        });
        failed++;
        errors.push(`${org.id} - ${orgError.message}`);
      }
    }

    logger.info('Weekly report job complete', { sent, failed });

    return res.json({
      success: true,
      data: {
        organizations: organizations.length,
        sent,
        failed,
        periodLabel,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit error details
      },
    });
  } catch (error: any) {
    logger.error('Weekly report job failed', error);
    return res.status(500).json({
      success: false,
      error: { code: 'JOB_FAILED', message: error.message },
    });
  }
});

/**
 * POST /api/cron/send-test-report
 *
 * Send a test ROI report to a specific email. Development/testing only.
 */
router.post('/send-test-report', verifyCronSecret, async (req: Request, res: Response) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Test endpoint not available in production' },
    });
  }

  const { email: recipientEmail, organizationId } = req.body;

  if (!recipientEmail || !organizationId) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'email and organizationId required' },
    });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      });
    }

    // Get last 7 days
    const endDate = new Date();
    const startDate = subWeeks(endDate, 1);
    const periodLabel = 'Last 7 Days (Test)';

    const roi = await roiCalculator.calculateROI(org.id, startDate, endDate);
    const counterfactual = await roiCalculator.calculateCounterfactual(
      org.id,
      startDate,
      endDate
    );

    const reportData: ROIReportData = {
      businessName: org.name,
      periodLabel,
      roiDollars: roi.roiDollars,
      roiMultiplier: roi.roiMultiplier,
      callsRecovered: roi.callsRecovered,
      callsAnsweredByAI: roi.callsAnsweredByAI,
      callsRecoveredByTextBack: roi.callsRecoveredByTextBack,
      revenueCaptured: Math.round(roi.revenueFromRecoveredCalls / 100),
      hoursSaved: Math.round((roi.timeSavedMinutes / 60) * 10) / 10,
      missedCallsWithoutServiceFlow: counterfactual.missedCallsWithoutServiceFlow,
      lostRevenueWithoutServiceFlow: Math.round(
        counterfactual.lostRevenueWithoutServiceFlow / 100
      ),
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/impact`,
    };

    const result = await email.sendROIReport(recipientEmail, reportData);

    return res.json({
      success: result.success,
      data: result.success
        ? { emailId: result.emailId, reportData }
        : undefined,
      error: result.error,
    });
  } catch (error: any) {
    logger.error('Test report failed', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SEND_FAILED', message: error.message },
    });
  }
});

/**
 * GET /api/cron/health
 *
 * Health check for cron system.
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      emailConfigured: email.isConfigured(),
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
