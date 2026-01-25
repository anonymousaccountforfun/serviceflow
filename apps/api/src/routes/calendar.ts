import { Router } from 'express';
import { prisma } from '@serviceflow/database';
import { paginationSchema } from '@serviceflow/shared';
import { BusinessHours, parseOrgSettings, AppointmentWhereInput } from '../types';

const router = Router();

// Default slot duration in minutes
const DEFAULT_SLOT_DURATION = 120;

// GET /api/calendar/day/:date - Get appointments for a specific day
router.get('/day/:date', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const { date } = req.params;
    const technicianId = req.query.technicianId as string | undefined;

    // Parse date and use UTC to avoid timezone issues
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const where: any = {
      organizationId: orgId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { notIn: ['canceled'] },
    };
    if (technicianId) where.assignedToId = technicianId;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        job: { select: { id: true, title: true, type: true, priority: true } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, address: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({
      success: true,
      data: {
        date,
        appointments,
        count: appointments.length,
      },
    });
  } catch (error) {
    console.error('Error getting day calendar:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get calendar' },
    });
  }
});

// GET /api/calendar/week/:date - Get appointments for the week containing date
router.get('/week/:date', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const { date } = req.params;
    const technicianId = req.query.technicianId as string | undefined;

    const startDate = new Date(date);
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek); // Go to Sunday
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // Saturday
    endDate.setHours(23, 59, 59, 999);

    const where: any = {
      organizationId: orgId,
      scheduledAt: { gte: startDate, lte: endDate },
      status: { notIn: ['canceled'] },
    };
    if (technicianId) where.assignedToId = technicianId;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        job: { select: { id: true, title: true, type: true, priority: true } },
        customer: { select: { id: true, firstName: true, lastName: true, address: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Group by day
    const byDay: Record<string, typeof appointments> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      byDay[d.toISOString().split('T')[0]] = [];
    }

    for (const apt of appointments) {
      const dayKey = apt.scheduledAt.toISOString().split('T')[0];
      if (byDay[dayKey]) {
        byDay[dayKey].push(apt);
      }
    }

    res.json({
      success: true,
      data: {
        weekStart: startDate.toISOString().split('T')[0],
        weekEnd: endDate.toISOString().split('T')[0],
        byDay,
        total: appointments.length,
      },
    });
  } catch (error) {
    console.error('Error getting week calendar:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get calendar' },
    });
  }
});

// GET /api/calendar/month/:year/:month - Get appointments for a month
router.get('/month/:year/:month', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month) - 1; // JS months are 0-indexed
    const technicianId = req.query.technicianId as string | undefined;

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const where: any = {
      organizationId: orgId,
      scheduledAt: { gte: startDate, lte: endDate },
      status: { notIn: ['canceled'] },
    };
    if (technicianId) where.assignedToId = technicianId;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        job: { select: { id: true, title: true, type: true, priority: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Group by day
    const byDay: Record<string, typeof appointments> = {};
    for (const apt of appointments) {
      const dayKey = apt.scheduledAt.toISOString().split('T')[0];
      if (!byDay[dayKey]) byDay[dayKey] = [];
      byDay[dayKey].push(apt);
    }

    res.json({
      success: true,
      data: {
        year,
        month: month + 1,
        byDay,
        total: appointments.length,
      },
    });
  } catch (error) {
    console.error('Error getting month calendar:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get calendar' },
    });
  }
});

// GET /api/calendar/availability - Check available time slots
router.get('/availability', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const date = req.query.date as string;
    const technicianId = req.query.technicianId as string | undefined;
    const duration = parseInt(req.query.duration as string) || DEFAULT_SLOT_DURATION;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: 'date query parameter is required' },
      });
    }

    // Get organization business hours from settings
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true, timezone: true },
    });

    const settings = parseOrgSettings(org?.settings ?? null);
    const businessHours = settings.businessHours;

    // Get day of week
    const checkDate = new Date(date);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[checkDate.getDay()];

    // Default business hours if not configured (Mon-Fri 8am-5pm, Sat 9am-2pm)
    const defaultHours: Record<string, BusinessHours | null> = {
      sunday: null,
      monday: { open: '08:00', close: '17:00' },
      tuesday: { open: '08:00', close: '17:00' },
      wednesday: { open: '08:00', close: '17:00' },
      thursday: { open: '08:00', close: '17:00' },
      friday: { open: '08:00', close: '17:00' },
      saturday: { open: '09:00', close: '14:00' },
    };

    const dayHours = businessHours?.[dayName] ?? defaultHours[dayName];

    if (!dayHours) {
      return res.json({
        success: true,
        data: {
          date,
          available: false,
          reason: 'Business is closed on this day',
          slots: [],
        },
      });
    }

    // Parse business hours
    const [openHour, openMin] = dayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = dayHours.close.split(':').map(Number);

    const dayStart = new Date(date);
    dayStart.setHours(openHour, openMin, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(closeHour, closeMin, 0, 0);

    // Get existing appointments for the day
    const where: any = {
      organizationId: orgId,
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: { notIn: ['canceled', 'completed', 'no_show'] },
    };
    if (technicianId) where.assignedToId = technicianId;

    const existingAppointments = await prisma.appointment.findMany({
      where,
      select: { scheduledAt: true, scheduledEndAt: true, assignedToId: true },
      orderBy: { scheduledAt: 'asc' },
    });

    // Generate available slots
    const slots: Array<{
      start: string;
      end: string;
      available: boolean;
      technicianId?: string;
    }> = [];

    let currentSlot = new Date(dayStart);
    while (currentSlot.getTime() + duration * 60 * 1000 <= dayEnd.getTime()) {
      const slotEnd = new Date(currentSlot.getTime() + duration * 60 * 1000);

      // Check if this slot conflicts with any existing appointment
      const hasConflict = existingAppointments.some((apt: { scheduledAt: Date; scheduledEndAt: Date }) => {
        const aptStart = apt.scheduledAt.getTime();
        const aptEnd = apt.scheduledEndAt.getTime();
        const slotStart = currentSlot.getTime();
        const slotEndTime = slotEnd.getTime();

        // Check for overlap
        return slotStart < aptEnd && slotEndTime > aptStart;
      });

      slots.push({
        start: currentSlot.toISOString(),
        end: slotEnd.toISOString(),
        available: !hasConflict,
      });

      // Move to next slot (30-minute increments)
      currentSlot = new Date(currentSlot.getTime() + 30 * 60 * 1000);
    }

    const availableSlots = slots.filter((s) => s.available);

    res.json({
      success: true,
      data: {
        date,
        businessHours: dayHours,
        duration,
        totalSlots: slots.length,
        availableCount: availableSlots.length,
        slots,
      },
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to check availability' },
    });
  }
});

// GET /api/calendar/technicians - Get all technicians with their schedules for a date
router.get('/technicians', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const date = req.query.date as string;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: 'date query parameter is required' },
      });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Get all technicians in org
    const technicians = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: { in: ['technician', 'admin', 'owner'] },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    // Get appointments for each technician
    const technicianSchedules = await Promise.all(
      technicians.map(async (tech: { id: string; firstName: string | null; lastName: string | null; phone: string | null }) => {
        const appointments = await prisma.appointment.findMany({
          where: {
            organizationId: orgId,
            assignedToId: tech.id,
            scheduledAt: { gte: dayStart, lte: dayEnd },
            status: { notIn: ['canceled'] },
          },
          include: {
            job: { select: { id: true, title: true, type: true } },
            customer: { select: { firstName: true, lastName: true, address: true } },
          },
          orderBy: { scheduledAt: 'asc' },
        });

        return {
          technician: tech,
          appointments,
          appointmentCount: appointments.length,
        };
      })
    );

    res.json({
      success: true,
      data: {
        date,
        technicians: technicianSchedules,
      },
    });
  } catch (error) {
    console.error('Error getting technician schedules:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get technician schedules' },
    });
  }
});

// GET /api/calendar/unassigned - Get appointments without a technician assigned
router.get('/unassigned', async (req, res) => {
  try {
    const { page, perPage, sortOrder } = paginationSchema.parse(req.query);
    const orgId = req.auth!.organizationId;

    const where = {
      organizationId: orgId,
      assignedToId: null,
      scheduledAt: { gte: new Date() },
      status: { notIn: ['canceled', 'completed'] as const },
    };

    // Get upcoming unassigned appointments with pagination
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          job: { select: { id: true, title: true, type: true, priority: true } },
          customer: { select: { firstName: true, lastName: true, phone: true, address: true } },
        },
        orderBy: { scheduledAt: sortOrder },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({
      success: true,
      data: appointments,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error getting unassigned appointments:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get unassigned appointments' },
    });
  }
});

export default router;
