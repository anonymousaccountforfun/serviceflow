/**
 * Analytics Service
 *
 * Centralized business logic for analytics queries.
 * Extracted from routes/analytics.ts to enable reuse and testing.
 */

import { prisma } from '@serviceflow/database';
import {
  StatusGroupBy,
  DirectionGroupBy,
  ChannelGroupBy,
  AIHandledGroupBy,
  TypeGroupBy,
  SourceGroupBy,
} from '../types';

// ============================================
// TYPES
// ============================================

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CallMetrics {
  total: number;
  missed: number;
  answered: number;
  aiHandled: number;
  byStatus: Record<string, number>;
  byDirection: Record<string, number>;
  averageDuration: number;
  callsWithDuration: number;
}

export interface RevenueMetrics {
  total: number;
  formatted: string;
  estimated: number;
  variance: number;
  completedJobCount: number;
  averageJobValue: number;
  byType: Record<string, { revenue: number; count: number }>;
  jobsByStatus: Record<string, number>;
}

export interface CustomerMetrics {
  new: number;
  total: number;
  bySource: Record<string, number>;
  topCustomers: Array<{
    id: string;
    name: string;
    lifetimeValue: number;
    jobCount: number;
  }>;
}

export interface ConversationMetrics {
  total: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
  messages: {
    total: number;
    inbound: number;
    outbound: number;
  };
}

export interface DashboardMetrics {
  calls: { total: number; answered: number; missed: number };
  revenue: { total: number; change: number | null };
  jobs: { completed: number; change: number | null };
  customers: { new: number; change: number | null };
  pendingJobs: Array<{
    id: string;
    title: string;
    customer: { id: string; firstName: string | null; lastName: string | null } | null;
  }>;
  todayAppointments: Array<{
    id: string;
    scheduledAt: Date;
    job: { id: string; title: string } | null;
    customer: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      address: unknown; // JsonValue from Prisma
    } | null;
  }>;
}

export interface AIROIMetrics {
  callsAnsweredByAI: { total: number; percentage: number };
  appointmentsBookedByAI: { count: number; estimatedValue: number; formatted: string };
  emergencyVsRoutine: { emergency: number; routine: number };
  afterHoursCallsHandled: number;
}

export interface NoShowMetrics {
  summary: {
    totalAppointments: number;
    noShows: number;
    noShowRate: number;
    noShowRateChange: number;
    confirmed: number;
    confirmationRate: number;
    lostRevenue: number;
    lostRevenueFormatted: string;
  };
  patterns: {
    byDayOfWeek: Array<{ day: string; count: number }>;
    peakNoShowDay: string;
  };
  recentNoShows: Array<{
    id: string;
    scheduledAt: Date;
    noShowAt: Date | null;
    reason: string | null;
    customer: { id: string; name: string; phone: string };
    job: { id: string; title: string; estimatedValue: number | null } | null;
  }>;
  suggestions: string[];
}

// ============================================
// HELPERS
// ============================================

/**
 * Parse date range from query params
 */
export function getDateRange(
  period?: string,
  startDate?: string,
  endDate?: string
): DateRange {
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
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Format cents to dollar string
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get dashboard metrics (combined data for main dashboard)
 */
export async function getDashboardMetrics(orgId: string): Promise<DashboardMetrics> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Previous periods for comparison
  const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    todayCalls,
    todayMissedCalls,
    monthlyRevenue,
    prevMonthlyRevenue,
    weeklyCompletedJobs,
    prevWeeklyCompletedJobs,
    weeklyNewCustomers,
    prevWeeklyNewCustomers,
    pendingJobs,
    todayAppointments,
  ] = await Promise.all([
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
    prisma.customer.count({
      where: { organizationId: orgId, createdAt: { gte: weekStart } },
    }),
    prisma.customer.count({
      where: { organizationId: orgId, createdAt: { gte: prevWeekStart, lt: weekStart } },
    }),
    prisma.job.findMany({
      where: { organizationId: orgId, status: 'lead' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        organizationId: orgId,
        scheduledAt: { gte: todayStart, lt: todayEnd },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        job: { select: { id: true, title: true } },
        customer: {
          select: { id: true, firstName: true, lastName: true, address: true },
        },
      },
    }),
  ]);

  const revenue = monthlyRevenue._sum.actualValue || 0;
  const prevRevenue = prevMonthlyRevenue._sum.actualValue || 0;

  return {
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
  };
}

/**
 * Get call metrics for a date range
 */
export async function getCallMetrics(orgId: string, dateRange: DateRange): Promise<CallMetrics> {
  const { start, end } = dateRange;

  const [byStatus, byDirection, avgDuration, aiHandled, totalWithDuration] = await Promise.all([
    prisma.call.groupBy({
      by: ['status'],
      where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      _count: true,
    }),
    prisma.call.groupBy({
      by: ['direction'],
      where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      _count: true,
    }),
    prisma.call.aggregate({
      where: {
        organizationId: orgId,
        createdAt: { gte: start, lte: end },
        duration: { not: null },
      },
      _avg: { duration: true },
    }),
    prisma.call.groupBy({
      by: ['aiHandled'],
      where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      _count: true,
    }),
    prisma.call.count({
      where: {
        organizationId: orgId,
        createdAt: { gte: start, lte: end },
        duration: { not: null },
      },
    }),
  ]);

  // Transform groupBy results
  const statusCounts: Record<string, number> = {};
  (byStatus as StatusGroupBy[]).forEach((s) => { statusCounts[s.status] = s._count; });

  const directionCounts: Record<string, number> = {};
  (byDirection as DirectionGroupBy[]).forEach((d) => { directionCounts[d.direction] = d._count; });

  const aiCounts = { human: 0, ai: 0 };
  (aiHandled as AIHandledGroupBy[]).forEach((a) => {
    if (a.aiHandled) aiCounts.ai = a._count;
    else aiCounts.human = a._count;
  });

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const missedStatuses = ['no_answer', 'busy', 'voicemail'];
  const missed = missedStatuses.reduce((sum, status) => sum + (statusCounts[status] || 0), 0);

  return {
    total,
    missed,
    answered: total - missed,
    aiHandled: aiCounts.ai,
    byStatus: statusCounts,
    byDirection: directionCounts,
    averageDuration: Math.round(avgDuration._avg.duration || 0),
    callsWithDuration: totalWithDuration,
  };
}

/**
 * Get revenue metrics for a date range
 */
export async function getRevenueMetrics(orgId: string, dateRange: DateRange): Promise<RevenueMetrics> {
  const { start, end } = dateRange;

  const [completedJobs, byType, byStatus, avgJobValue] = await Promise.all([
    prisma.job.aggregate({
      where: {
        organizationId: orgId,
        completedAt: { gte: start, lte: end },
        status: 'completed',
      },
      _sum: { actualValue: true, estimatedValue: true },
      _count: true,
    }),
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
    prisma.job.groupBy({
      by: ['status'],
      where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      _count: true,
    }),
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

  return {
    total: totalRevenue,
    formatted: formatCurrency(totalRevenue),
    estimated: totalEstimated,
    variance: totalRevenue - totalEstimated,
    completedJobCount: completedJobs._count,
    averageJobValue: Math.round(avgJobValue._avg.actualValue || 0),
    byType: revenueByType,
    jobsByStatus,
  };
}

/**
 * Get customer metrics for a date range
 */
export async function getCustomerMetrics(orgId: string, dateRange: DateRange): Promise<CustomerMetrics> {
  const { start, end } = dateRange;

  const [newCustomers, bySource, totalCustomers, topCustomers] = await Promise.all([
    prisma.customer.count({
      where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
    }),
    prisma.customer.groupBy({
      by: ['source'],
      where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      _count: true,
    }),
    prisma.customer.count({
      where: { organizationId: orgId },
    }),
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

  return {
    new: newCustomers,
    total: totalCustomers,
    bySource: customersBySource,
    topCustomers: topCustomers.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      lifetimeValue: c.lifetimeValue,
      jobCount: c.jobCount,
    })),
  };
}

/**
 * Get conversation metrics for a date range
 */
export async function getConversationMetrics(orgId: string, dateRange: DateRange): Promise<ConversationMetrics> {
  const { start, end } = dateRange;

  const [totalConversations, byStatus, byChannel, messageStats] = await Promise.all([
    prisma.conversation.count({
      where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
    }),
    prisma.conversation.groupBy({
      by: ['status'],
      where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      _count: true,
    }),
    prisma.conversation.groupBy({
      by: ['channel'],
      where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
      _count: true,
    }),
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

  return {
    total: totalConversations,
    byStatus: conversationsByStatus,
    byChannel: conversationsByChannel,
    messages: {
      total: messages.inbound + messages.outbound,
      inbound: messages.inbound,
      outbound: messages.outbound,
    },
  };
}

/**
 * Get AI ROI metrics for a date range
 */
export async function getAIROIMetrics(orgId: string, dateRange: DateRange): Promise<AIROIMetrics> {
  const { start, end } = dateRange;

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

  const estimatedValue = aiJobsValue._sum.estimatedValue || 0;

  return {
    callsAnsweredByAI: {
      total: aiCalls,
      percentage: totalCalls > 0 ? Math.round((aiCalls / totalCalls) * 100) : 0,
    },
    appointmentsBookedByAI: {
      count: aiJobs,
      estimatedValue,
      formatted: formatCurrency(estimatedValue),
    },
    emergencyVsRoutine: {
      emergency: emergencyJobs,
      routine: aiJobs - emergencyJobs,
    },
    afterHoursCallsHandled: aiCalls, // Simplified for V1
  };
}

/**
 * Get no-show metrics for a date range
 */
export async function getNoShowMetrics(orgId: string, dateRange: DateRange): Promise<NoShowMetrics> {
  const { start, end } = dateRange;

  // Calculate previous period for comparison
  const periodLength = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - periodLength);
  const previousEnd = start;

  const [
    totalAppointments,
    noShowAppointments,
    confirmedAppointments,
    prevTotalAppointments,
    prevNoShowAppointments,
    recentNoShows,
    noShowsByDay,
    noShowsValue,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        organizationId: orgId,
        scheduledAt: { gte: start, lte: end },
        status: { notIn: ['canceled'] },
      },
    }),
    prisma.appointment.count({
      where: {
        organizationId: orgId,
        noShowAt: { gte: start, lte: end },
        status: 'no_show',
      },
    }),
    prisma.appointment.count({
      where: {
        organizationId: orgId,
        scheduledAt: { gte: start, lte: end },
        status: 'confirmed',
      },
    }),
    prisma.appointment.count({
      where: {
        organizationId: orgId,
        scheduledAt: { gte: previousStart, lte: previousEnd },
        status: { notIn: ['canceled'] },
      },
    }),
    prisma.appointment.count({
      where: {
        organizationId: orgId,
        noShowAt: { gte: previousStart, lte: previousEnd },
        status: 'no_show',
      },
    }),
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
    const dayData = (noShowsByDay as Array<{ day_of_week: number; count: bigint }>).find(
      d => Number(d.day_of_week) === index
    );
    return {
      day: name,
      count: dayData ? Number(dayData.count) : 0,
    };
  });

  // Find peak no-show day
  const peakNoShowDay = noShowsByDayOfWeek.reduce(
    (max, day) => (day.count > max.count ? day : max),
    { day: 'N/A', count: 0 }
  );

  // Calculate lost revenue
  const lostRevenue = noShowsValue._sum.estimatedValue || 0;

  // Generate suggestions based on data
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

  return {
    summary: {
      totalAppointments,
      noShows: noShowAppointments,
      noShowRate,
      noShowRateChange: noShowRate - prevNoShowRate,
      confirmed: confirmedAppointments,
      confirmationRate,
      lostRevenue,
      lostRevenueFormatted: formatCurrency(lostRevenue),
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
  };
}

/**
 * Get overview metrics with period comparison
 */
export async function getOverviewMetrics(orgId: string, dateRange: DateRange) {
  const { start, end } = dateRange;

  // Calculate previous period for comparison
  const periodLength = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - periodLength);
  const previousEnd = start;

  const [
    totalCalls,
    missedCalls,
    aiHandledCalls,
    totalJobs,
    completedJobs,
    newCustomers,
    totalRevenue,
    totalConversations,
    prevTotalCalls,
    prevCompletedJobs,
    prevNewCustomers,
    prevRevenue,
  ] = await Promise.all([
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
    prisma.customer.count({
      where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
    }),
    prisma.job.aggregate({
      where: {
        organizationId: orgId,
        completedAt: { gte: start, lte: end },
        status: 'completed',
      },
      _sum: { actualValue: true },
    }),
    prisma.conversation.count({
      where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
    }),
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

  return {
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
      formatted: formatCurrency(revenue),
      change: percentChange(revenue, prevRevenueVal),
    },
    conversations: {
      total: totalConversations,
    },
  };
}
