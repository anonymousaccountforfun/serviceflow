/**
 * Analytics API Routes
 *
 * Provides aggregated metrics for the dashboard:
 * - Call statistics
 * - Revenue & job metrics
 * - Customer acquisition
 * - Conversation/SMS stats
 */

import { Router } from 'express';
import { prisma } from '@serviceflow/database';
import { logger } from '../lib/logger';
import {
  StatusGroupBy,
  DirectionGroupBy,
  ChannelGroupBy,
  AIHandledGroupBy,
  TypeGroupBy,
  SourceGroupBy,
  DateRangeQuery,
} from '../types';
import {
  calculateROI,
  getFunnelMetrics,
  calculateCounterfactual,
  getROISummary,
} from '../services/roi-calculator';

const router = Router();

// ============================================
// HELPERS
// ============================================

/**
 * Parse date range from query params
 */
function getDateRange(period?: string, startDate?: string, endDate?: string) {
  const now = new Date();
  let start: Date;
  let end: Date = now;

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = endDate ? new Date(endDate) : now;
      break;
    default:
      // Default to last 30 days
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

/**
 * Calculate percentage change between two values
 */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/analytics/dashboard
 * Combined dashboard endpoint - returns all data needed for dashboard in one call
 * Optimizes by reducing multiple API calls to a single request
 */
router.get('/dashboard', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;

    // Calculate date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Previous periods for comparison
    const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Run all queries in parallel for maximum performance
    const [
      // Today's calls
      todayCalls,
      todayMissedCalls,
      // Monthly revenue
      monthlyRevenue,
      prevMonthlyRevenue,
      // Weekly jobs
      weeklyCompletedJobs,
      prevWeeklyCompletedJobs,
      // Weekly customers
      weeklyNewCustomers,
      prevWeeklyNewCustomers,
      // Pending jobs for action required
      pendingJobs,
      // Today's appointments
      todayAppointments,
    ] = await Promise.all([
      // Today's calls
      prisma.call.count({
        where: { organizationId: orgId, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.call.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: todayStart, lte: todayEnd },
          status: { in: ['no_answer', 'busy', 'voicemail'] },
        },
      }),
      // Monthly revenue
      prisma.job.aggregate({
        where: {
          organizationId: orgId,
          completedAt: { gte: monthStart },
          status: 'completed',
        },
        _sum: { actualValue: true },
      }),
      prisma.job.aggregate({
        where: {
          organizationId: orgId,
          completedAt: { gte: prevMonthStart, lte: prevMonthEnd },
          status: 'completed',
        },
        _sum: { actualValue: true },
      }),
      // Weekly completed jobs
      prisma.job.count({
        where: {
          organizationId: orgId,
          completedAt: { gte: weekStart },
          status: 'completed',
        },
      }),
      prisma.job.count({
        where: {
          organizationId: orgId,
          completedAt: { gte: prevWeekStart, lt: weekStart },
          status: 'completed',
        },
      }),
      // Weekly new customers
      prisma.customer.count({
        where: { organizationId: orgId, createdAt: { gte: weekStart } },
      }),
      prisma.customer.count({
        where: { organizationId: orgId, createdAt: { gte: prevWeekStart, lt: weekStart } },
      }),
      // Pending jobs (lead status) for action required section
      prisma.job.findMany({
        where: { organizationId: orgId, status: 'lead' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      // Today's appointments
      prisma.appointment.findMany({
        where: {
          organizationId: orgId,
          scheduledAt: { gte: todayStart, lt: todayEnd },
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
          job: { select: { id: true, title: true } },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              address: true,
            },
          },
        },
      }),
    ]);

    const revenue = monthlyRevenue._sum.actualValue || 0;
    const prevRevenue = prevMonthlyRevenue._sum.actualValue || 0;

    res.json({
      success: true,
      data: {
        calls: {
          total: todayCalls,
          answered: todayCalls - todayMissedCalls,
          missed: todayMissedCalls,
        },
        revenue: {
          total: revenue,
          change: percentChange(revenue, prevRevenue),
        },
        jobs: {
          completed: weeklyCompletedJobs,
          change: percentChange(weeklyCompletedJobs, prevWeeklyCompletedJobs),
        },
        customers: {
          new: weeklyNewCustomers,
          change: percentChange(weeklyNewCustomers, prevWeeklyNewCustomers),
        },
        pendingJobs,
        todayAppointments,
      },
    });
  } catch (error) {
    logger.error('Error fetching dashboard data', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch dashboard data' },
    });
  }
});

/**
 * GET /api/analytics/overview
 * Main dashboard overview with key metrics
 */
router.get('/overview', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const { period, startDate, endDate } = req.query as DateRangeQuery;
    const { start, end } = getDateRange(period, startDate, endDate);

    // Calculate previous period for comparison
    const periodLength = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - periodLength);
    const previousEnd = start;

    // Run all queries in parallel
    const [
      // Current period
      totalCalls,
      missedCalls,
      aiHandledCalls,
      totalJobs,
      completedJobs,
      newCustomers,
      totalRevenue,
      totalConversations,
      // Previous period for comparison
      prevTotalCalls,
      prevCompletedJobs,
      prevNewCustomers,
      prevRevenue,
    ] = await Promise.all([
      // Current period calls
      prisma.call.count({
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      }),
      prisma.call.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: start, lte: end },
          status: { in: ['no_answer', 'busy', 'voicemail'] },
        },
      }),
      prisma.call.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: start, lte: end },
          aiHandled: true,
        },
      }),
      // Current period jobs
      prisma.job.count({
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      }),
      prisma.job.count({
        where: {
          organizationId: orgId,
          completedAt: { gte: start, lte: end },
          status: 'completed',
        },
      }),
      // Current period customers
      prisma.customer.count({
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      }),
      // Current period revenue
      prisma.job.aggregate({
        where: {
          organizationId: orgId,
          completedAt: { gte: start, lte: end },
          status: 'completed',
        },
        _sum: { actualValue: true },
      }),
      // Current period conversations
      prisma.conversation.count({
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      }),
      // Previous period comparisons
      prisma.call.count({
        where: { organizationId: orgId, createdAt: { gte: previousStart, lte: previousEnd } },
      }),
      prisma.job.count({
        where: {
          organizationId: orgId,
          completedAt: { gte: previousStart, lte: previousEnd },
          status: 'completed',
        },
      }),
      prisma.customer.count({
        where: { organizationId: orgId, createdAt: { gte: previousStart, lte: previousEnd } },
      }),
      prisma.job.aggregate({
        where: {
          organizationId: orgId,
          completedAt: { gte: previousStart, lte: previousEnd },
          status: 'completed',
        },
        _sum: { actualValue: true },
      }),
    ]);

    const revenue = totalRevenue._sum.actualValue || 0;
    const prevRevenueVal = prevRevenue._sum.actualValue || 0;

    res.json({
      success: true,
      data: {
        period: { start, end },
        calls: {
          total: totalCalls,
          missed: missedCalls,
          answered: totalCalls - missedCalls,
          aiHandled: aiHandledCalls,
          answerRate: totalCalls > 0 ? Math.round(((totalCalls - missedCalls) / totalCalls) * 100) : 0,
          aiHandleRate: totalCalls > 0 ? Math.round((aiHandledCalls / totalCalls) * 100) : 0,
          change: percentChange(totalCalls, prevTotalCalls),
        },
        jobs: {
          total: totalJobs,
          completed: completedJobs,
          completionRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
          change: percentChange(completedJobs, prevCompletedJobs),
        },
        customers: {
          new: newCustomers,
          change: percentChange(newCustomers, prevNewCustomers),
        },
        revenue: {
          total: revenue,
          formatted: `$${(revenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          change: percentChange(revenue, prevRevenueVal),
        },
        conversations: {
          total: totalConversations,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching analytics overview', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch analytics' },
    });
  }
});

/**
 * GET /api/analytics/calls
 * Detailed call statistics
 */
router.get('/calls', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const { period, startDate, endDate } = req.query as DateRangeQuery;
    const { start, end } = getDateRange(period, startDate, endDate);

    const [
      byStatus,
      byDirection,
      avgDuration,
      aiHandled,
      totalWithDuration,
    ] = await Promise.all([
      // Calls by status
      prisma.call.groupBy({
        by: ['status'],
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
        _count: true,
      }),
      // Calls by direction
      prisma.call.groupBy({
        by: ['direction'],
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
        _count: true,
      }),
      // Average duration
      prisma.call.aggregate({
        where: {
          organizationId: orgId,
          createdAt: { gte: start, lte: end },
          duration: { not: null },
        },
        _avg: { duration: true },
      }),
      // AI handled breakdown
      prisma.call.groupBy({
        by: ['aiHandled'],
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
        _count: true,
      }),
      // Total calls with duration
      prisma.call.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: start, lte: end },
          duration: { not: null },
        },
      }),
    ]);

    // Transform groupBy results to objects
    const statusCounts: Record<string, number> = {};
    (byStatus as StatusGroupBy[]).forEach((s) => { statusCounts[s.status] = s._count; });

    const directionCounts: Record<string, number> = {};
    (byDirection as DirectionGroupBy[]).forEach((d) => { directionCounts[d.direction] = d._count; });

    const aiCounts = { human: 0, ai: 0 };
    (aiHandled as AIHandledGroupBy[]).forEach((a) => {
      if (a.aiHandled) aiCounts.ai = a._count;
      else aiCounts.human = a._count;
    });

    res.json({
      success: true,
      data: {
        period: { start, end },
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        byStatus: statusCounts,
        byDirection: directionCounts,
        aiHandling: aiCounts,
        averageDuration: Math.round(avgDuration._avg.duration || 0),
        callsWithDuration: totalWithDuration,
      },
    });
  } catch (error) {
    logger.error('Error fetching call analytics', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch call analytics' },
    });
  }
});

/**
 * GET /api/analytics/revenue
 * Revenue and job value metrics
 */
router.get('/revenue', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const { period, startDate, endDate } = req.query as DateRangeQuery;
    const { start, end } = getDateRange(period, startDate, endDate);

    const [
      completedJobs,
      byType,
      byStatus,
      avgJobValue,
    ] = await Promise.all([
      // Total revenue from completed jobs
      prisma.job.aggregate({
        where: {
          organizationId: orgId,
          completedAt: { gte: start, lte: end },
          status: 'completed',
        },
        _sum: { actualValue: true, estimatedValue: true },
        _count: true,
      }),
      // Revenue by job type
      prisma.job.groupBy({
        by: ['type'],
        where: {
          organizationId: orgId,
          completedAt: { gte: start, lte: end },
          status: 'completed',
        },
        _sum: { actualValue: true },
        _count: true,
      }),
      // Jobs by status
      prisma.job.groupBy({
        by: ['status'],
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
        _count: true,
      }),
      // Average job value
      prisma.job.aggregate({
        where: {
          organizationId: orgId,
          completedAt: { gte: start, lte: end },
          status: 'completed',
          actualValue: { not: null },
        },
        _avg: { actualValue: true },
      }),
    ]);

    const totalRevenue = completedJobs._sum.actualValue || 0;
    const totalEstimated = completedJobs._sum.estimatedValue || 0;

    // Transform byType
    const revenueByType: Record<string, { revenue: number; count: number }> = {};
    (byType as TypeGroupBy[]).forEach((t) => {
      revenueByType[t.type] = {
        revenue: t._sum?.actualValue || 0,
        count: t._count,
      };
    });

    // Transform byStatus
    const jobsByStatus: Record<string, number> = {};
    (byStatus as StatusGroupBy[]).forEach((s) => { jobsByStatus[s.status] = s._count; });

    res.json({
      success: true,
      data: {
        period: { start, end },
        revenue: {
          total: totalRevenue,
          formatted: `$${(totalRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          estimated: totalEstimated,
          variance: totalRevenue - totalEstimated,
        },
        jobs: {
          completed: completedJobs._count,
          byStatus: jobsByStatus,
          averageValue: Math.round(avgJobValue._avg.actualValue || 0),
        },
        byType: revenueByType,
      },
    });
  } catch (error) {
    logger.error('Error fetching revenue analytics', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch revenue analytics' },
    });
  }
});

/**
 * GET /api/analytics/customers
 * Customer acquisition and value metrics
 */
router.get('/customers', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const { period, startDate, endDate } = req.query as DateRangeQuery;
    const { start, end } = getDateRange(period, startDate, endDate);

    const [
      newCustomers,
      bySource,
      totalCustomers,
      topCustomers,
    ] = await Promise.all([
      // New customers in period
      prisma.customer.count({
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      }),
      // Customers by source
      prisma.customer.groupBy({
        by: ['source'],
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
        _count: true,
      }),
      // Total customers
      prisma.customer.count({
        where: { organizationId: orgId },
      }),
      // Top customers by lifetime value
      prisma.customer.findMany({
        where: { organizationId: orgId, lifetimeValue: { gt: 0 } },
        orderBy: { lifetimeValue: 'desc' },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          lifetimeValue: true,
          jobCount: true,
        },
      }),
    ]);

    // Transform bySource
    const customersBySource: Record<string, number> = {};
    (bySource as SourceGroupBy[]).forEach((s) => {
      customersBySource[s.source || 'unknown'] = s._count;
    });

    res.json({
      success: true,
      data: {
        period: { start, end },
        new: newCustomers,
        total: totalCustomers,
        bySource: customersBySource,
        topCustomers: topCustomers.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          lifetimeValue: c.lifetimeValue,
          jobCount: c.jobCount,
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching customer analytics', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch customer analytics' },
    });
  }
});

/**
 * GET /api/analytics/conversations
 * SMS and messaging metrics
 */
router.get('/conversations', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const { period, startDate, endDate } = req.query as DateRangeQuery;
    const { start, end } = getDateRange(period, startDate, endDate);

    const [
      totalConversations,
      byStatus,
      byChannel,
      messageStats,
    ] = await Promise.all([
      // Total conversations
      prisma.conversation.count({
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      }),
      // Conversations by status
      prisma.conversation.groupBy({
        by: ['status'],
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
        _count: true,
      }),
      // Conversations by channel
      prisma.conversation.groupBy({
        by: ['channel'],
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
        _count: true,
      }),
      // Message counts by direction
      prisma.message.groupBy({
        by: ['direction'],
        where: {
          conversation: { organizationId: orgId },
          createdAt: { gte: start, lte: end },
        },
        _count: true,
      }),
    ]);

    // Transform results
    const conversationsByStatus: Record<string, number> = {};
    (byStatus as StatusGroupBy[]).forEach((s) => { conversationsByStatus[s.status] = s._count; });

    const conversationsByChannel: Record<string, number> = {};
    (byChannel as ChannelGroupBy[]).forEach((c) => { conversationsByChannel[c.channel] = c._count; });

    const messages = { inbound: 0, outbound: 0 };
    (messageStats as DirectionGroupBy[]).forEach((m) => {
      if (m.direction === 'inbound') messages.inbound = m._count;
      else messages.outbound = m._count;
    });

    res.json({
      success: true,
      data: {
        period: { start, end },
        conversations: {
          total: totalConversations,
          byStatus: conversationsByStatus,
          byChannel: conversationsByChannel,
        },
        messages: {
          total: messages.inbound + messages.outbound,
          inbound: messages.inbound,
          outbound: messages.outbound,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching conversation analytics', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch conversation analytics' },
    });
  }
});

/**
 * GET /api/analytics/ai-roi
 * AI Voice ROI metrics
 */
router.get('/ai-roi', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'] as string;
    const { startDate, endDate } = req.query as any;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const [totalCalls, aiCalls, aiJobs, emergencyJobs, aiJobsValue] = await Promise.all([
      prisma.call.count({
        where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      }),
      prisma.call.count({
        where: { organizationId: orgId, createdAt: { gte: start, lte: end }, aiHandled: true },
      }),
      prisma.job.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: start, lte: end },
          customer: { source: 'phone_ai' },
        },
      }),
      prisma.job.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: start, lte: end },
          priority: 'emergency',
          customer: { source: 'phone_ai' },
        },
      }),
      prisma.job.aggregate({
        where: {
          organizationId: orgId,
          createdAt: { gte: start, lte: end },
          customer: { source: 'phone_ai' },
        },
        _sum: { estimatedValue: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        period: { start, end },
        callsAnsweredByAI: {
          total: aiCalls,
          percentage: totalCalls > 0 ? Math.round((aiCalls / totalCalls) * 100) : 0,
        },
        appointmentsBookedByAI: {
          count: aiJobs,
          estimatedValue: aiJobsValue._sum.estimatedValue || 0,
          formatted: `$${((aiJobsValue._sum.estimatedValue || 0) / 100).toLocaleString()}`,
        },
        emergencyVsRoutine: {
          emergency: emergencyJobs,
          routine: aiJobs - emergencyJobs,
        },
        afterHoursCallsHandled: aiCalls, // Simplified for V1
      },
    });
  } catch (error) {
    console.error('Error fetching AI ROI analytics:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch AI ROI analytics' },
    });
  }
});

/**
 * GET /api/analytics/roi
 * Full ROI metrics using call attribution data
 */
router.get('/roi', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const { period, startDate, endDate } = req.query as DateRangeQuery;
    const { start, end } = getDateRange(period, startDate, endDate);

    const metrics = await calculateROI(orgId, start, end);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Error fetching ROI analytics', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch ROI analytics' },
    });
  }
});

/**
 * GET /api/analytics/roi/summary
 * Quick ROI summary for dashboard cards
 */
router.get('/roi/summary', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const { period, startDate, endDate } = req.query as DateRangeQuery;
    const { start, end } = getDateRange(period, startDate, endDate);

    const summary = await getROISummary(orgId, start, end);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Error fetching ROI summary', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch ROI summary' },
    });
  }
});

/**
 * GET /api/analytics/funnel
 * Funnel metrics showing conversion through stages
 */
router.get('/funnel', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const { period, startDate, endDate } = req.query as DateRangeQuery;
    const { start, end } = getDateRange(period, startDate, endDate);

    const funnel = await getFunnelMetrics(orgId, start, end);

    res.json({
      success: true,
      data: {
        period: { start, end },
        funnel,
      },
    });
  } catch (error) {
    logger.error('Error fetching funnel analytics', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch funnel analytics' },
    });
  }
});

/**
 * GET /api/analytics/counterfactual
 * Counterfactual metrics (what would have happened without ServiceFlow)
 */
router.get('/counterfactual', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const { period, startDate, endDate } = req.query as DateRangeQuery;
    const { start, end } = getDateRange(period, startDate, endDate);

    const counterfactual = await calculateCounterfactual(orgId, start, end);

    res.json({
      success: true,
      data: {
        period: { start, end },
        ...counterfactual,
      },
    });
  } catch (error) {
    logger.error('Error fetching counterfactual analytics', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch counterfactual analytics' },
    });
  }
});

/**
 * GET /api/analytics/no-shows
 * No-show tracking and analytics
 */
router.get('/no-shows', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const { period, startDate, endDate } = req.query as DateRangeQuery;
    const { start, end } = getDateRange(period, startDate, endDate);

    // Calculate previous period for comparison
    const periodLength = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - periodLength);
    const previousEnd = start;

    const [
      // Current period
      totalAppointments,
      noShowAppointments,
      confirmedAppointments,
      // Previous period
      prevTotalAppointments,
      prevNoShowAppointments,
      // Recent no-shows with details
      recentNoShows,
      // No-shows by day of week (for patterns)
      noShowsByDay,
      // Average job value of no-shows (lost revenue)
      noShowsValue,
    ] = await Promise.all([
      // Total scheduled appointments in period
      prisma.appointment.count({
        where: {
          organizationId: orgId,
          scheduledAt: { gte: start, lte: end },
          status: { notIn: ['canceled'] },
        },
      }),
      // No-show appointments in period
      prisma.appointment.count({
        where: {
          organizationId: orgId,
          noShowAt: { gte: start, lte: end },
          status: 'no_show',
        },
      }),
      // Confirmed appointments (shows customer engagement)
      prisma.appointment.count({
        where: {
          organizationId: orgId,
          scheduledAt: { gte: start, lte: end },
          status: 'confirmed',
        },
      }),
      // Previous period total
      prisma.appointment.count({
        where: {
          organizationId: orgId,
          scheduledAt: { gte: previousStart, lte: previousEnd },
          status: { notIn: ['canceled'] },
        },
      }),
      // Previous period no-shows
      prisma.appointment.count({
        where: {
          organizationId: orgId,
          noShowAt: { gte: previousStart, lte: previousEnd },
          status: 'no_show',
        },
      }),
      // Recent no-shows with customer details
      prisma.appointment.findMany({
        where: {
          organizationId: orgId,
          status: 'no_show',
          noShowAt: { gte: start, lte: end },
        },
        orderBy: { noShowAt: 'desc' },
        take: 10,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          job: { select: { id: true, title: true, estimatedValue: true } },
        },
      }),
      // No-shows grouped by day of week for pattern analysis
      prisma.$queryRaw`
        SELECT
          EXTRACT(DOW FROM "scheduledAt") as day_of_week,
          COUNT(*) as count
        FROM "Appointment"
        WHERE "organizationId" = ${orgId}
          AND "status" = 'no_show'
          AND "noShowAt" >= ${start}
          AND "noShowAt" <= ${end}
        GROUP BY EXTRACT(DOW FROM "scheduledAt")
        ORDER BY day_of_week
      ` as Promise<Array<{ day_of_week: number; count: bigint }>>,
      // Estimated value of no-show appointments
      prisma.job.aggregate({
        where: {
          organizationId: orgId,
          appointments: {
            some: {
              status: 'no_show',
              noShowAt: { gte: start, lte: end },
            },
          },
        },
        _sum: { estimatedValue: true },
      }),
    ]);

    // Calculate rates
    const noShowRate = totalAppointments > 0
      ? Math.round((noShowAppointments / totalAppointments) * 100)
      : 0;
    const prevNoShowRate = prevTotalAppointments > 0
      ? Math.round((prevNoShowAppointments / prevTotalAppointments) * 100)
      : 0;
    const confirmationRate = totalAppointments > 0
      ? Math.round((confirmedAppointments / totalAppointments) * 100)
      : 0;

    // Transform day of week data
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const noShowsByDayOfWeek = dayNames.map((name, index) => {
      const dayData = (noShowsByDay as any[]).find(d => Number(d.day_of_week) === index);
      return {
        day: name,
        count: dayData ? Number(dayData.count) : 0,
      };
    });

    // Find peak no-show day
    const peakNoShowDay = noShowsByDayOfWeek.reduce((max, day) =>
      day.count > max.count ? day : max,
      { day: 'N/A', count: 0 }
    );

    // Calculate lost revenue
    const lostRevenue = noShowsValue._sum.estimatedValue || 0;

    // Suggestions based on data
    const suggestions: string[] = [];
    if (noShowRate > 15) {
      suggestions.push('Consider sending reminder texts 2 hours before appointments');
    }
    if (confirmationRate < 50) {
      suggestions.push('Enable appointment confirmation requests to improve show rates');
    }
    if (peakNoShowDay.count > 2) {
      suggestions.push(`${peakNoShowDay.day}s have the most no-shows - consider overbooking or buffer time`);
    }
    if (lostRevenue > 50000) { // $500+
      suggestions.push('Consider requiring deposits for new customers to reduce no-shows');
    }

    res.json({
      success: true,
      data: {
        period: { start, end },
        summary: {
          totalAppointments,
          noShows: noShowAppointments,
          noShowRate,
          noShowRateChange: noShowRate - prevNoShowRate,
          confirmed: confirmedAppointments,
          confirmationRate,
          lostRevenue,
          lostRevenueFormatted: `$${(lostRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        },
        patterns: {
          byDayOfWeek: noShowsByDayOfWeek,
          peakNoShowDay: peakNoShowDay.day,
        },
        recentNoShows: recentNoShows.map(apt => ({
          id: apt.id,
          scheduledAt: apt.scheduledAt,
          noShowAt: apt.noShowAt,
          reason: apt.noShowReason,
          customer: {
            id: apt.customer.id,
            name: `${apt.customer.firstName || ''} ${apt.customer.lastName || ''}`.trim(),
            phone: apt.customer.phone,
          },
          job: apt.job ? {
            id: apt.job.id,
            title: apt.job.title,
            estimatedValue: apt.job.estimatedValue,
          } : null,
        })),
        suggestions,
      },
    });
  } catch (error) {
    logger.error('Error fetching no-show analytics', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch no-show analytics' },
    });
  }
});

export default router;
