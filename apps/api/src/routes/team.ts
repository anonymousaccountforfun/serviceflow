/**
 * Team Management API Routes
 *
 * Provides endpoints for managing team members:
 * - List team members with job counts
 * - Invite new team members via Clerk
 * - Update team member roles
 * - Remove team members
 * - Get technician workload data
 */

import { Router, Request, Response } from 'express';
import { prisma, Prisma } from '@serviceflow/database';
import { Clerk } from '@clerk/backend';
import { z } from 'zod';
import { requireRole } from '../middleware/auth';
import { logger } from '../lib/logger';
import { asyncHandler, sendSuccess, errors } from '../utils/api-response';

const router = Router();

// Initialize Clerk client (v0.38.x API)
const clerk = Clerk({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Validation schemas
const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['technician', 'admin', 'viewer']),
});

const updateTeamMemberSchema = z.object({
  role: z.enum(['technician', 'admin', 'viewer']),
});

/**
 * Authorization middleware for team management
 * Only owner and admin roles can manage team members
 */
const requireTeamManagement = requireRole('owner', 'admin');

/**
 * GET /api/team - List team members with job counts
 *
 * Returns all team members in the organization with their job counts
 */
router.get('/', requireTeamManagement, asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.auth!.organizationId;

  // Get all users in the organization with job counts
  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          assignedJobs: true,
        },
      },
    },
    orderBy: [
      { role: 'asc' },
      { firstName: 'asc' },
    ],
  });

  // Transform response to include jobCount at top level
  const members = users.map((user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    createdAt: user.createdAt,
    jobCount: user._count.assignedJobs,
  }));

  sendSuccess(res, { members });
}));

/**
 * POST /api/team/invite - Invite a new team member
 *
 * Creates a Clerk invitation for a new team member with the specified role
 */
router.post('/invite', requireTeamManagement, asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.auth!.organizationId;

  let data;
  try {
    data = inviteTeamMemberSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors.validation(res, 'Validation error', { details: error.errors });
    }
    throw error;
  }

  // Check if user already exists in the organization
  const existingUser = await prisma.user.findFirst({
    where: {
      organizationId: orgId,
      email: data.email,
    },
  });

  if (existingUser) {
    return errors.validation(res, 'A team member with this email already exists');
  }

  // Get organization details for the invitation
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, slug: true },
  });

  if (!organization) {
    return errors.notFound(res, 'Organization');
  }

  // Create Clerk invitation
  // Note: Clerk will send an email to the invited user
  const invitation = await clerk.invitations.createInvitation({
    emailAddress: data.email,
    publicMetadata: {
      organizationId: orgId,
      role: data.role,
      organizationName: organization.name,
    },
    redirectUrl: `${process.env.APP_URL || 'http://localhost:3000'}/sign-up/accept-invite`,
  });

  logger.info('Team member invitation created', {
    invitationId: invitation.id,
    email: data.email,
    role: data.role,
    organizationId: orgId,
  });

  sendSuccess(res, {
    invitationId: invitation.id,
    email: data.email,
    role: data.role,
    status: 'pending',
  }, 201);
}));

/**
 * PATCH /api/team/:id - Update team member role
 *
 * Updates the role of an existing team member
 * Cannot change the role of the organization owner
 */
router.patch('/:id', requireTeamManagement, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const currentUserId = req.auth!.userId;

  let data;
  try {
    data = updateTeamMemberSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors.validation(res, 'Validation error', { details: error.errors });
    }
    throw error;
  }

  // Find the team member
  const teamMember = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!teamMember) {
    return errors.notFound(res, 'Team member');
  }

  // Prevent changing the owner's role
  if (teamMember.role === 'owner') {
    return errors.forbidden(res, 'Cannot change the role of the organization owner');
  }

  // Prevent users from changing their own role
  if (teamMember.id === currentUserId) {
    return errors.forbidden(res, 'Cannot change your own role');
  }

  // Update the role
  const updated = await prisma.user.update({
    where: { id },
    data: { role: data.role as Prisma.UserUpdateInput['role'] },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
    },
  });

  logger.info('Team member role updated', {
    teamMemberId: id,
    oldRole: teamMember.role,
    newRole: data.role,
    updatedBy: currentUserId,
  });

  sendSuccess(res, updated);
}));

/**
 * DELETE /api/team/:id - Remove a team member
 *
 * Deactivates a team member from the organization
 * Returns an error if the member has active (non-completed/canceled) jobs assigned
 */
router.delete('/:id', requireTeamManagement, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const currentUserId = req.auth!.userId;

  // Find the team member
  const teamMember = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!teamMember) {
    return errors.notFound(res, 'Team member');
  }

  // Prevent removing the owner
  if (teamMember.role === 'owner') {
    return errors.forbidden(res, 'Cannot remove the organization owner');
  }

  // Prevent users from removing themselves
  if (teamMember.id === currentUserId) {
    return errors.forbidden(res, 'Cannot remove yourself from the team');
  }

  // Check for active jobs assigned to this team member
  const activeJobCount = await prisma.job.count({
    where: {
      assignedToId: id,
      organizationId: orgId,
      status: {
        notIn: ['completed', 'canceled'],
      },
    },
  });

  if (activeJobCount > 0) {
    return errors.validation(
      res,
      `Cannot remove team member with ${activeJobCount} active job(s). Please reassign jobs first.`,
      { activeJobCount }
    );
  }

  // Deactivate the user (soft delete)
  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  logger.info('Team member removed', {
    teamMemberId: id,
    email: teamMember.email,
    removedBy: currentUserId,
  });

  sendSuccess(res, { deleted: true });
}));

/**
 * GET /api/team/workload - Get technician workload data
 *
 * Returns job counts per technician for today and this week
 * Used for workload visualization and assignment decisions
 */
router.get('/workload', requireTeamManagement, asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.auth!.organizationId;

  // Calculate date ranges
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  // Start of week (Sunday)
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  // End of week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  // Get all technicians (users with technician or admin role who are active)
  const technicians = await prisma.user.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      role: { in: ['technician', 'admin', 'owner'] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
    },
  });

  // Get job counts for today (jobs scheduled for today or in_progress today)
  const todayJobCounts = await prisma.job.groupBy({
    by: ['assignedToId'],
    where: {
      organizationId: orgId,
      assignedToId: { not: null },
      OR: [
        {
          scheduledAt: {
            gte: startOfToday,
            lt: endOfToday,
          },
        },
        {
          status: 'in_progress',
        },
      ],
    },
    _count: {
      id: true,
    },
  });

  // Get job counts for this week
  const weekJobCounts = await prisma.job.groupBy({
    by: ['assignedToId'],
    where: {
      organizationId: orgId,
      assignedToId: { not: null },
      scheduledAt: {
        gte: startOfWeek,
        lt: endOfWeek,
      },
    },
    _count: {
      id: true,
    },
  });

  // Create maps for quick lookup
  const todayCountMap = new Map(
    todayJobCounts.map((item) => [item.assignedToId, item._count.id])
  );
  const weekCountMap = new Map(
    weekJobCounts.map((item) => [item.assignedToId, item._count.id])
  );

  // Combine data for response
  const workloadData = technicians.map((tech) => {
    const todayJobs = todayCountMap.get(tech.id) || 0;
    const weekJobs = weekCountMap.get(tech.id) || 0;

    // Determine availability status based on today's workload
    // 0-3 jobs: available (green), 4-6 jobs: busy (yellow), 7+ jobs: overloaded (red)
    let status: 'available' | 'busy' | 'overloaded';
    if (todayJobs <= 3) {
      status = 'available';
    } else if (todayJobs <= 6) {
      status = 'busy';
    } else {
      status = 'overloaded';
    }

    return {
      id: tech.id,
      firstName: tech.firstName,
      lastName: tech.lastName,
      name: [tech.firstName, tech.lastName].filter(Boolean).join(' ') || 'Unknown',
      avatarUrl: tech.avatarUrl,
      role: tech.role,
      todayJobs,
      weekJobs,
      status,
    };
  });

  // Sort by today's workload (lowest first for easier assignment)
  workloadData.sort((a, b) => a.todayJobs - b.todayJobs);

  sendSuccess(res, {
    technicians: workloadData,
    period: {
      today: {
        start: startOfToday.toISOString(),
        end: endOfToday.toISOString(),
      },
      week: {
        start: startOfWeek.toISOString(),
        end: endOfWeek.toISOString(),
      },
    },
  });
}));

/**
 * GET /api/team/timesheet - Get team timesheet report
 *
 * Returns time entries for all team members for a given week.
 * Requires owner or admin role.
 *
 * Query params:
 *   - week: YYYY-Www format (e.g., 2026-W04)
 */
router.get('/timesheet', requireTeamManagement, asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.auth!.organizationId;

  // Parse week parameter
  const weekString = req.query.week as string;
  if (!weekString || !/^\d{4}-W\d{2}$/.test(weekString)) {
    return errors.validation(res, 'Week parameter is required (format: YYYY-Www)');
  }

  // Parse week string to get date range
  const match = weekString.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    return errors.validation(res, 'Invalid week format');
  }

  const year = parseInt(match[1]);
  const week = parseInt(match[2]);

  // Calculate week start and end dates
  const jan1 = new Date(year, 0, 1);
  const jan1DayOfWeek = jan1.getDay();
  const daysToFirstMonday = jan1DayOfWeek === 0 ? 1 : (8 - jan1DayOfWeek) % 7;
  const startOfWeek1 = new Date(year, 0, 1 + daysToFirstMonday);
  const weekStart = new Date(startOfWeek1);
  weekStart.setDate(startOfWeek1.getDate() + (week - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Generate date strings for the week
  const dateStrings: string[] = [];
  const current = new Date(weekStart);
  while (current <= weekEnd) {
    dateStrings.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  // Fetch all technicians/employees in the org
  const teamMembers = await prisma.user.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      role: { in: ['owner', 'admin', 'technician'] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
    orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
  });

  // Fetch all time entries for the week
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      organizationId: orgId,
      date: { in: dateStrings },
    },
    orderBy: [{ userId: 'asc' }, { date: 'asc' }],
  });

  // Build report data per team member
  const report = teamMembers.map((member) => {
    const memberEntries = timeEntries.filter((e) => e.userId === member.id);

    // Build daily entries
    const dailyEntries = dateStrings.map((date) => {
      const entry = memberEntries.find((e) => e.date === date);
      if (!entry) {
        return {
          date,
          clockInAt: null,
          clockOutAt: null,
          breakMinutes: 0,
          hoursWorked: 0,
        };
      }

      let hoursWorked = entry.hoursWorked || 0;
      if (!entry.clockOutAt && entry.clockInAt) {
        // Still clocked in - calculate live
        const msWorked = Date.now() - entry.clockInAt.getTime();
        hoursWorked = Math.round((msWorked / 3600000 - entry.breakMinutes / 60) * 100) / 100;
      }

      return {
        date,
        clockInAt: entry.clockInAt,
        clockOutAt: entry.clockOutAt,
        breakMinutes: entry.breakMinutes,
        hoursWorked,
      };
    });

    // Calculate totals
    const totalHours = dailyEntries.reduce((sum, d) => sum + d.hoursWorked, 0);
    const totalBreakMinutes = dailyEntries.reduce((sum, d) => sum + d.breakMinutes, 0);
    const daysWorked = dailyEntries.filter((d) => d.hoursWorked > 0).length;

    return {
      member: {
        id: member.id,
        name: [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email,
        email: member.email,
        role: member.role,
        avatarUrl: member.avatarUrl,
      },
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalBreakMinutes,
        daysWorked,
        averageHoursPerDay: daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0,
      },
      dailyEntries,
    };
  });

  // Calculate team totals
  const teamTotals = {
    totalHours: report.reduce((sum, r) => sum + r.summary.totalHours, 0),
    totalBreakMinutes: report.reduce((sum, r) => sum + r.summary.totalBreakMinutes, 0),
    averageHoursPerMember: report.length > 0
      ? Math.round((report.reduce((sum, r) => sum + r.summary.totalHours, 0) / report.length) * 100) / 100
      : 0,
  };

  sendSuccess(res, {
    week: weekString,
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
    teamTotals,
    members: report,
  });
}));

export default router;
