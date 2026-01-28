/**
 * Analytics API Routes
 *
 * Provides aggregated metrics for the dashboard:
 * - Call statistics
 * - Revenue & job metrics
 * - Customer acquisition
 * - Conversation/SMS stats
 *
 * Business logic is delegated to the analytics service.
 */

import { Router } from 'express';
import { DateRangeQuery } from '../types';
import {
  calculateROI,
  getFunnelMetrics,
  calculateCounterfactual,
  getROISummary,
} from '../services/roi-calculator';
import {
  getDateRange,
  getDashboardMetrics,
  getOverviewMetrics,
  getCallMetrics,
  getRevenueMetrics,
  getCustomerMetrics,
  getConversationMetrics,
  getAIROIMetrics,
  getNoShowMetrics,
} from '../services/analytics';
import { asyncHandler, sendSuccess } from '../utils/api-response';

const router = Router();

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/analytics/dashboard
 * Combined dashboard endpoint - returns all data needed for dashboard in one call
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const metrics = await getDashboardMetrics(orgId);
  sendSuccess(res, metrics);
}));

/**
 * GET /api/analytics/overview
 * Main dashboard overview with key metrics
 */
router.get('/overview', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { period, startDate, endDate } = req.query as DateRangeQuery;
  const dateRange = getDateRange(period, startDate, endDate);

  const metrics = await getOverviewMetrics(orgId, dateRange);
  sendSuccess(res, metrics);
}));

/**
 * GET /api/analytics/calls
 * Detailed call statistics
 */
router.get('/calls', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { period, startDate, endDate } = req.query as DateRangeQuery;
  const dateRange = getDateRange(period, startDate, endDate);

  const metrics = await getCallMetrics(orgId, dateRange);
  sendSuccess(res, {
    period: dateRange,
    total: metrics.total,
    byStatus: metrics.byStatus,
    byDirection: metrics.byDirection,
    aiHandling: { human: metrics.total - metrics.aiHandled, ai: metrics.aiHandled },
    averageDuration: metrics.averageDuration,
    callsWithDuration: metrics.callsWithDuration,
  });
}));

/**
 * GET /api/analytics/revenue
 * Revenue and job value metrics
 */
router.get('/revenue', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { period, startDate, endDate } = req.query as DateRangeQuery;
  const dateRange = getDateRange(period, startDate, endDate);

  const metrics = await getRevenueMetrics(orgId, dateRange);
  sendSuccess(res, {
    period: dateRange,
    revenue: {
      total: metrics.total,
      formatted: metrics.formatted,
      estimated: metrics.estimated,
      variance: metrics.variance,
    },
    jobs: {
      completed: metrics.completedJobCount,
      byStatus: metrics.jobsByStatus,
      averageValue: metrics.averageJobValue,
    },
    byType: metrics.byType,
  });
}));

/**
 * GET /api/analytics/customers
 * Customer acquisition and value metrics
 */
router.get('/customers', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { period, startDate, endDate } = req.query as DateRangeQuery;
  const dateRange = getDateRange(period, startDate, endDate);

  const metrics = await getCustomerMetrics(orgId, dateRange);
  sendSuccess(res, {
    period: dateRange,
    new: metrics.new,
    total: metrics.total,
    bySource: metrics.bySource,
    topCustomers: metrics.topCustomers,
  });
}));

/**
 * GET /api/analytics/conversations
 * SMS and messaging metrics
 */
router.get('/conversations', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { period, startDate, endDate } = req.query as DateRangeQuery;
  const dateRange = getDateRange(period, startDate, endDate);

  const metrics = await getConversationMetrics(orgId, dateRange);
  sendSuccess(res, {
    period: dateRange,
    conversations: {
      total: metrics.total,
      byStatus: metrics.byStatus,
      byChannel: metrics.byChannel,
    },
    messages: metrics.messages,
  });
}));

/**
 * GET /api/analytics/ai-roi
 * AI Voice ROI metrics
 *
 * NOTE: Fixed auth bug - was using req.headers['x-organization-id']
 * instead of req.auth!.organizationId
 */
router.get('/ai-roi', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const metrics = await getAIROIMetrics(orgId, { start, end });
  sendSuccess(res, {
    period: { start, end },
    ...metrics,
  });
}));

/**
 * GET /api/analytics/roi
 * Full ROI metrics using call attribution data
 */
router.get('/roi', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { period, startDate, endDate } = req.query as DateRangeQuery;
  const { start, end } = getDateRange(period, startDate, endDate);

  const metrics = await calculateROI(orgId, start, end);
  sendSuccess(res, metrics);
}));

/**
 * GET /api/analytics/roi/summary
 * Quick ROI summary for dashboard cards
 */
router.get('/roi/summary', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { period, startDate, endDate } = req.query as DateRangeQuery;
  const { start, end } = getDateRange(period, startDate, endDate);

  const summary = await getROISummary(orgId, start, end);
  sendSuccess(res, summary);
}));

/**
 * GET /api/analytics/funnel
 * Funnel metrics showing conversion through stages
 */
router.get('/funnel', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { period, startDate, endDate } = req.query as DateRangeQuery;
  const { start, end } = getDateRange(period, startDate, endDate);

  const funnel = await getFunnelMetrics(orgId, start, end);
  sendSuccess(res, {
    period: { start, end },
    funnel,
  });
}));

/**
 * GET /api/analytics/counterfactual
 * Counterfactual metrics (what would have happened without ServiceFlow)
 */
router.get('/counterfactual', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { period, startDate, endDate } = req.query as DateRangeQuery;
  const { start, end } = getDateRange(period, startDate, endDate);

  const counterfactual = await calculateCounterfactual(orgId, start, end);
  sendSuccess(res, {
    period: { start, end },
    ...counterfactual,
  });
}));

/**
 * GET /api/analytics/no-shows
 * No-show tracking and analytics
 */
router.get('/no-shows', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { period, startDate, endDate } = req.query as DateRangeQuery;
  const dateRange = getDateRange(period, startDate, endDate);

  const metrics = await getNoShowMetrics(orgId, dateRange);
  sendSuccess(res, {
    period: dateRange,
    ...metrics,
  });
}));

export default router;
