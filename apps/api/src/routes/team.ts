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
import { prisma } from '@serviceflow/database';
import { Clerk } from '@clerk/backend';
import { z } from 'zod';
import { requireRole } from '../middleware/auth';
import { logger } from '../lib/logger';

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
router.get('/', requireTeamManagement, async (req: Request, res: Response) => {
  try {
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

    res.json({
      success: true,
      data: { members },
    });
  } catch (error) {
    logger.error('Error listing team members', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to list team members' },
    });
  }
});

/**
 * POST /api/team/invite - Invite a new team member
 *
 * Creates a Clerk invitation for a new team member with the specified role
 */
router.post('/invite', requireTeamManagement, async (req: Request, res: Response) => {
  try {
    const orgId = req.auth!.organizationId;
    const data = inviteTeamMemberSchema.parse(req.body);

    // Check if user already exists in the organization
    const existingUser = await prisma.user.findFirst({
      where: {
        organizationId: orgId,
        email: data.email,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { code: 'E4001', message: 'A team member with this email already exists' },
      });
    }

    // Get organization details for the invitation
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, slug: true },
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Organization not found' },
      });
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

    res.status(201).json({
      success: true,
      data: {
        invitationId: invitation.id,
        email: data.email,
        role: data.role,
        status: 'pending',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E4002',
          message: 'Validation error',
          details: error.errors,
        },
      });
    }

    logger.error('Error inviting team member', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to invite team member' },
    });
  }
});

/**
 * PATCH /api/team/:id - Update team member role
 *
 * Updates the role of an existing team member
 * Cannot change the role of the organization owner
 */
router.patch('/:id', requireTeamManagement, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;
    const currentUserId = req.auth!.userId;
    const data = updateTeamMemberSchema.parse(req.body);

    // Find the team member
    const teamMember = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Team member not found' },
      });
    }

    // Prevent changing the owner's role
    if (teamMember.role === 'owner') {
      return res.status(403).json({
        success: false,
        error: { code: 'E1006', message: 'Cannot change the role of the organization owner' },
      });
    }

    // Prevent users from changing their own role
    if (teamMember.id === currentUserId) {
      return res.status(403).json({
        success: false,
        error: { code: 'E1006', message: 'Cannot change your own role' },
      });
    }

    // Update the role
    const updated = await prisma.user.update({
      where: { id },
      data: { role: data.role as any },
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

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E4002',
          message: 'Validation error',
          details: error.errors,
        },
      });
    }

    logger.error('Error updating team member', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to update team member' },
    });
  }
});

/**
 * DELETE /api/team/:id - Remove a team member
 *
 * Deactivates a team member from the organization
 * Returns an error if the member has active (non-completed/canceled) jobs assigned
 */
router.delete('/:id', requireTeamManagement, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;
    const currentUserId = req.auth!.userId;

    // Find the team member
    const teamMember = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Team member not found' },
      });
    }

    // Prevent removing the owner
    if (teamMember.role === 'owner') {
      return res.status(403).json({
        success: false,
        error: { code: 'E1006', message: 'Cannot remove the organization owner' },
      });
    }

    // Prevent users from removing themselves
    if (teamMember.id === currentUserId) {
      return res.status(403).json({
        success: false,
        error: { code: 'E1006', message: 'Cannot remove yourself from the team' },
      });
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
      return res.status(400).json({
        success: false,
        error: {
          code: 'E4003',
          message: `Cannot remove team member with ${activeJobCount} active job(s). Please reassign jobs first.`,
          activeJobCount,
        },
      });
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

    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    logger.error('Error removing team member', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to remove team member' },
    });
  }
});

/**
 * GET /api/team/workload - Get technician workload data
 *
 * Returns job counts per technician for today and this week
 * Used for workload visualization and assignment decisions
 */
router.get('/workload', requireTeamManagement, async (req: Request, res: Response) => {
  try {
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

    res.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    logger.error('Error getting team workload', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get team workload' },
    });
  }
});

export default router;
