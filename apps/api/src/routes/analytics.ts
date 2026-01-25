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
import {
  StatusGroupBy,
  DirectionGroupBy,
  ChannelGroupBy,
  AIHandledGroupBy,
  TypeGroupBy,
  SourceGroupBy,
  DateRangeQuery,
} from '../types';

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
              city: true,
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
    console.error('Error fetching dashboard data:', error);
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
    const { period, startDate, endDate } = req.query as any;
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
    console.error('Error fetching analytics overview:', error);
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
    const { period, startDate, endDate } = req.query as any;
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
    console.error('Error fetching call analytics:', error);
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
    const { period, startDate, endDate } = req.query as any;
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
    console.error('Error fetching revenue analytics:', error);
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
    const { period, startDate, endDate } = req.query as any;
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
    console.error('Error fetching customer analytics:', error);
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
    const { period, startDate, endDate } = req.query as any;
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
    console.error('Error fetching conversation analytics:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch conversation analytics' },
    });
  }
});

export default router;
