/**
 * Technician Day View API Routes
 *
 * Provides endpoints for technician-focused features including:
 * - Day view with assigned jobs
 * - Route optimization
 * - Time tracking (clock-in/clock-out)
 * - Weekly timesheet
 */

import { Router } from 'express';
import { prisma } from '@serviceflow/database';
import { logger } from '../lib/logger';
import { z } from 'zod';

const router = Router();

// ============================================
// TYPES & INTERFACES
// ============================================

interface Coordinates {
  lat: number;
  lng: number;
}

interface JobWithDistance {
  id: string;
  title: string;
  scheduledAt: Date | null;
  status: string;
  estimatedValue: number | null;
  description: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    address: any;
  };
  coordinates?: Coordinates;
  distance?: number;
}

// ============================================
// TIME TRACKING HELPERS
// ============================================

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekDates(weekString: string): { start: Date; end: Date } {
  // Parse week string like "2026-W04"
  const match = weekString.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    throw new Error('Invalid week format. Use YYYY-Www (e.g., 2026-W04)');
  }

  const year = parseInt(match[1]);
  const week = parseInt(match[2]);

  // Get the first day of the year
  const jan1 = new Date(year, 0, 1);
  // Get the day of week (0 = Sunday)
  const jan1DayOfWeek = jan1.getDay();

  // Calculate days to add to get to the first Monday
  const daysToFirstMonday = jan1DayOfWeek === 0 ? 1 : (8 - jan1DayOfWeek) % 7;

  // Start of week 1 is the first Monday
  const startOfWeek1 = new Date(year, 0, 1 + daysToFirstMonday);

  // Start of requested week
  const start = new Date(startOfWeek1);
  start.setDate(startOfWeek1.getDate() + (week - 1) * 7);

  // End of requested week (Sunday)
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const dateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
});

const weekQuerySchema = z.object({
  week: z.string().regex(/^\d{4}-W\d{2}$/, 'Invalid week format. Use YYYY-Www (e.g., 2026-W04)'),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract coordinates from customer address JSON
 */
function extractCoordinates(address: any): Coordinates | undefined {
  if (!address) return undefined;

  // Try common address formats
  if (typeof address === 'object') {
    if (address.lat && address.lng) {
      return { lat: address.lat, lng: address.lng };
    }
    if (address.latitude && address.longitude) {
      return { lat: address.latitude, lng: address.longitude };
    }
    if (address.coordinates) {
      return extractCoordinates(address.coordinates);
    }
  }

  return undefined;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Nearest-neighbor route optimization
 * Returns jobs sorted by optimal driving order
 */
function optimizeRouteNearestNeighbor(
  jobs: JobWithDistance[],
  startLocation?: Coordinates
): { optimizedOrder: string[]; totalDistance: number } {
  if (jobs.length === 0) {
    return { optimizedOrder: [], totalDistance: 0 };
  }

  // Filter jobs that have coordinates
  const jobsWithCoords = jobs.filter(j => j.coordinates);
  const jobsWithoutCoords = jobs.filter(j => !j.coordinates);

  if (jobsWithCoords.length === 0) {
    // No coordinates available, return in scheduled time order
    return {
      optimizedOrder: jobs.map(j => j.id),
      totalDistance: 0,
    };
  }

  const visited: Set<string> = new Set();
  const optimizedOrder: string[] = [];
  let totalDistance = 0;

  // Start from first job or provided location
  let currentLocation: Coordinates = startLocation || jobsWithCoords[0].coordinates!;

  // If we have a start location, find nearest job to it first
  while (visited.size < jobsWithCoords.length) {
    let nearestJob: JobWithDistance | null = null;
    let nearestDistance = Infinity;

    for (const job of jobsWithCoords) {
      if (visited.has(job.id)) continue;

      const distance = calculateDistance(currentLocation, job.coordinates!);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestJob = job;
      }
    }

    if (nearestJob) {
      visited.add(nearestJob.id);
      optimizedOrder.push(nearestJob.id);
      totalDistance += nearestDistance;
      currentLocation = nearestJob.coordinates!;
    }
  }

  // Add jobs without coordinates at the end
  for (const job of jobsWithoutCoords) {
    optimizedOrder.push(job.id);
  }

  return { optimizedOrder, totalDistance: Math.round(totalDistance * 10) / 10 };
}

/**
 * Determine current and next job based on time and status
 */
function identifyCurrentAndNextJob(jobs: any[]): { currentJobId?: string; nextJobId?: string } {
  const now = new Date();

  // Find job that is in_progress
  const inProgressJob = jobs.find(j => j.status === 'in_progress');
  if (inProgressJob) {
    // Current job is in progress, next is the one after it
    const nextIdx = jobs.findIndex(j => j.id === inProgressJob.id) + 1;
    return {
      currentJobId: inProgressJob.id,
      nextJobId: nextIdx < jobs.length ? jobs[nextIdx].id : undefined,
    };
  }

  // Find first scheduled/confirmed job that hasn't started yet
  const upcomingJobs = jobs.filter(
    j => ['scheduled', 'confirmed', 'lead', 'quoted'].includes(j.status) &&
         j.scheduledAt
  );

  if (upcomingJobs.length > 0) {
    // Sort by scheduled time
    upcomingJobs.sort((a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

    // First upcoming is "current" (next to do), second is "next"
    return {
      currentJobId: upcomingJobs[0].id,
      nextJobId: upcomingJobs.length > 1 ? upcomingJobs[1].id : undefined,
    };
  }

  return {};
}

/**
 * Calculate estimated hours from jobs
 * Assumes 1.5 hours per job if no estimate, or calculates from estimated value
 */
function calculateEstimatedHours(jobs: any[]): number {
  const defaultHoursPerJob = 1.5;
  let totalHours = 0;

  for (const job of jobs) {
    // Could use job type or estimated value to estimate time
    // For now, use a simple default
    totalHours += defaultHoursPerJob;
  }

  return Math.round(totalHours * 10) / 10;
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/technician/day
 *
 * Returns the technician's jobs for a specific day with stats
 * Query params:
 *   - date: YYYY-MM-DD format (defaults to today)
 */
router.get('/day', async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const orgId = req.auth!.organizationId;

    // Parse and validate date
    let targetDate: string;
    if (req.query.date) {
      const parsed = dateQuerySchema.safeParse({ date: req.query.date });
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'E4001', message: parsed.error.errors[0].message },
        });
      }
      targetDate = parsed.data.date;
    } else {
      targetDate = getTodayDate();
    }

    // Calculate start and end of day
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    // Fetch jobs assigned to this technician for the day
    const jobs = await prisma.job.findMany({
      where: {
        organizationId: orgId,
        assignedToId: userId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            address: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    // Calculate stats
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const estimatedHours = calculateEstimatedHours(jobs);

    // Identify current and next job
    const { currentJobId, nextJobId } = identifyCurrentAndNextJob(jobs);

    res.json({
      success: true,
      data: {
        date: targetDate,
        jobs,
        stats: {
          totalJobs,
          completedJobs,
          estimatedHours,
        },
        currentJobId,
        nextJobId,
      },
    });
  } catch (error) {
    logger.error('Error fetching technician day view', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch day view' },
    });
  }
});

/**
 * GET /api/technician/route
 *
 * Returns optimized route for the day's jobs
 * Query params:
 *   - date: YYYY-MM-DD format (defaults to today)
 */
router.get('/route', async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const orgId = req.auth!.organizationId;

    // Parse and validate date
    let targetDate: string;
    if (req.query.date) {
      const parsed = dateQuerySchema.safeParse({ date: req.query.date });
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'E4001', message: parsed.error.errors[0].message },
        });
      }
      targetDate = parsed.data.date;
    } else {
      targetDate = getTodayDate();
    }

    // Calculate start and end of day
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    // Fetch jobs assigned to this technician for the day
    const jobs = await prisma.job.findMany({
      where: {
        organizationId: orgId,
        assignedToId: userId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        // Exclude completed and canceled jobs from route
        status: {
          notIn: ['completed', 'canceled'],
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            address: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    // Extract coordinates and prepare for optimization
    const jobsWithCoords: JobWithDistance[] = jobs.map(job => ({
      id: job.id,
      title: job.title,
      scheduledAt: job.scheduledAt,
      status: job.status,
      estimatedValue: job.estimatedValue,
      description: job.description,
      customer: {
        id: job.customer.id,
        firstName: job.customer.firstName,
        lastName: job.customer.lastName,
        phone: job.customer.phone,
        address: job.customer.address,
      },
      coordinates: extractCoordinates(job.customer.address),
    }));

    // Run nearest-neighbor optimization
    const { optimizedOrder, totalDistance } = optimizeRouteNearestNeighbor(jobsWithCoords);

    // Estimate total duration (distance in miles / average speed of 25 mph + job time)
    const drivingHours = totalDistance / 25;
    const jobHours = calculateEstimatedHours(jobs);
    const totalDuration = Math.round((drivingHours + jobHours) * 60); // minutes

    // Reorder jobs according to optimized order
    const orderedJobs = optimizedOrder.map(id =>
      jobsWithCoords.find(j => j.id === id)
    ).filter(Boolean);

    res.json({
      success: true,
      data: {
        date: targetDate,
        jobs: orderedJobs,
        optimizedOrder,
        totalDistance,
        totalDuration,
      },
    });
  } catch (error) {
    logger.error('Error fetching technician route', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch route' },
    });
  }
});

/**
 * POST /api/technician/clock-in
 *
 * Records technician clock-in time for the current day
 */
router.post('/clock-in', async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const orgId = req.auth!.organizationId;
    const today = getTodayDate();

    // Check if already clocked in
    const existing = await prisma.timeEntry.findUnique({
      where: {
        userId_date: { userId, date: today },
      },
    });

    if (existing && !existing.clockOutAt) {
      return res.status(400).json({
        success: false,
        error: { code: 'E4002', message: 'Already clocked in for today' },
      });
    }

    // Create new time entry
    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        organizationId: orgId,
        date: today,
        clockInAt: new Date(),
        breakMinutes: 0,
      },
    });

    logger.info('Technician clocked in', { userId, date: today });

    res.status(201).json({
      success: true,
      data: {
        id: entry.id,
        date: entry.date,
        clockInAt: entry.clockInAt,
        message: 'Successfully clocked in',
      },
    });
  } catch (error) {
    logger.error('Error recording clock-in', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to record clock-in' },
    });
  }
});

/**
 * POST /api/technician/clock-out
 *
 * Records technician clock-out time for the current day
 * Body (optional):
 *   - breakMinutes: number of minutes spent on break
 */
router.post('/clock-out', async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const today = getTodayDate();
    const breakMinutes = parseInt(req.body.breakMinutes) || 0;

    // Check if clocked in
    const existing = await prisma.timeEntry.findUnique({
      where: {
        userId_date: { userId, date: today },
      },
    });

    if (!existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'E4003', message: 'Not clocked in for today' },
      });
    }

    if (existing.clockOutAt) {
      return res.status(400).json({
        success: false,
        error: { code: 'E4004', message: 'Already clocked out for today' },
      });
    }

    // Calculate hours worked
    const clockOutAt = new Date();
    const msWorked = clockOutAt.getTime() - existing.clockInAt.getTime();
    const hoursWorked = Math.round((msWorked / 3600000 - breakMinutes / 60) * 100) / 100;

    // Update time entry
    const updated = await prisma.timeEntry.update({
      where: { id: existing.id },
      data: {
        clockOutAt,
        breakMinutes,
        hoursWorked,
      },
    });

    logger.info('Technician clocked out', { userId, date: today, hoursWorked });

    res.json({
      success: true,
      data: {
        id: updated.id,
        date: updated.date,
        clockInAt: updated.clockInAt,
        clockOutAt: updated.clockOutAt,
        breakMinutes: updated.breakMinutes,
        hoursWorked,
        message: 'Successfully clocked out',
      },
    });
  } catch (error) {
    logger.error('Error recording clock-out', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to record clock-out' },
    });
  }
});

/**
 * GET /api/technician/timesheet
 *
 * Returns weekly time summary for the technician
 * Query params:
 *   - week: YYYY-Www format (e.g., 2026-W04)
 */
router.get('/timesheet', async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const orgId = req.auth!.organizationId;

    // Parse and validate week
    if (!req.query.week) {
      return res.status(400).json({
        success: false,
        error: { code: 'E4001', message: 'Week parameter is required (format: YYYY-Www)' },
      });
    }

    const parsed = weekQuerySchema.safeParse({ week: req.query.week });
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'E4001', message: parsed.error.errors[0].message },
      });
    }

    const weekString = parsed.data.week;
    const { start, end } = getWeekDates(weekString);

    // Get date strings for the week
    const dateStrings: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      dateStrings.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    // Fetch time entries for the week from database
    const weekEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        date: { in: dateStrings },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate daily breakdown
    const dailyBreakdown = weekEntries.map(entry => {
      let hoursWorked = entry.hoursWorked || 0;
      if (!entry.clockOutAt) {
        // Still clocked in - calculate live
        const msWorked = Date.now() - entry.clockInAt.getTime();
        hoursWorked = Math.round((msWorked / 3600000 - entry.breakMinutes / 60) * 100) / 100;
      }

      return {
        date: entry.date,
        clockInAt: entry.clockInAt,
        clockOutAt: entry.clockOutAt,
        breakMinutes: entry.breakMinutes,
        hoursWorked,
      };
    });

    // Calculate totals
    const totalHoursWorked = dailyBreakdown.reduce((sum, d) => sum + d.hoursWorked, 0);
    const totalBreakMinutes = dailyBreakdown.reduce((sum, d) => sum + d.breakMinutes, 0);
    const daysWorked = dailyBreakdown.length;

    // Fetch job stats for the week
    const jobStats = await prisma.job.groupBy({
      by: ['status'],
      where: {
        organizationId: orgId,
        assignedToId: userId,
        scheduledAt: {
          gte: start,
          lte: end,
        },
      },
      _count: true,
    });

    const totalJobs = jobStats.reduce((sum, s) => sum + s._count, 0);
    const completedJobs = jobStats.find(s => s.status === 'completed')?._count || 0;

    res.json({
      success: true,
      data: {
        week: weekString,
        weekStart: start.toISOString().split('T')[0],
        weekEnd: end.toISOString().split('T')[0],
        summary: {
          totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
          totalBreakMinutes,
          daysWorked,
          totalJobs,
          completedJobs,
          averageHoursPerDay: daysWorked > 0
            ? Math.round((totalHoursWorked / daysWorked) * 100) / 100
            : 0,
        },
        dailyBreakdown,
      },
    });
  } catch (error) {
    logger.error('Error fetching timesheet', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch timesheet' },
    });
  }
});

/**
 * GET /api/technician/status
 *
 * Returns current clock-in status for today
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const today = getTodayDate();

    const entry = await prisma.timeEntry.findUnique({
      where: {
        userId_date: { userId, date: today },
      },
    });

    if (!entry) {
      return res.json({
        success: true,
        data: {
          date: today,
          isClockedIn: false,
          clockInAt: null,
          clockOutAt: null,
        },
      });
    }

    // Calculate hours worked so far if clocked in
    let hoursWorkedSoFar = 0;
    if (!entry.clockOutAt) {
      const msWorked = Date.now() - entry.clockInAt.getTime();
      hoursWorkedSoFar = Math.round((msWorked / 3600000 - entry.breakMinutes / 60) * 100) / 100;
    }

    res.json({
      success: true,
      data: {
        date: today,
        isClockedIn: !entry.clockOutAt,
        clockInAt: entry.clockInAt,
        clockOutAt: entry.clockOutAt,
        breakMinutes: entry.breakMinutes,
        hoursWorkedSoFar: !entry.clockOutAt ? hoursWorkedSoFar : undefined,
      },
    });
  } catch (error) {
    logger.error('Error fetching technician status', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to fetch status' },
    });
  }
});

export default router;
