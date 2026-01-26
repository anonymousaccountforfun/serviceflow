import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@serviceflow/database';
import { logger } from '@/lib/logger';

interface NotificationPreferences {
  channels: {
    push: boolean;
    sms: boolean;
    email: boolean;
  };
  events: {
    missedCalls: { push: boolean; sms: boolean; email: boolean };
    newMessages: { push: boolean; sms: boolean; email: boolean };
    appointments: { push: boolean; sms: boolean; email: boolean };
    reviews: { push: boolean; sms: boolean; email: boolean };
    payments: { push: boolean; sms: boolean; email: boolean };
    emergency: { push: boolean; sms: boolean; email: boolean };
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  channels: {
    push: true,
    sms: true,
    email: true,
  },
  events: {
    missedCalls: { push: true, sms: true, email: false },
    newMessages: { push: true, sms: false, email: false },
    appointments: { push: true, sms: true, email: false },
    reviews: { push: true, sms: false, email: true },
    payments: { push: true, sms: false, email: true },
    emergency: { push: true, sms: true, email: true },
  },
  quietHours: {
    enabled: false,
    start: '21:00',
    end: '07:00',
  },
};

// GET /api/users/me/notifications - Get notification preferences
export async function GET() {
  try {
    const { userId: clerkId } = auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get notification preferences from user settings
    // The User model should have a settings JSON field
    const settings = (user as any).settings || {};
    const notifications = settings.notifications || DEFAULT_PREFERENCES;

    return NextResponse.json(notifications);
  } catch (error) {
    logger.error('Get notifications error', error);
    return NextResponse.json(
      { error: 'Failed to get notification preferences' },
      { status: 500 }
    );
  }
}

// PUT /api/users/me/notifications - Update notification preferences
export async function PUT(request: Request) {
  try {
    const { userId: clerkId } = auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json() as NotificationPreferences;

    // Validate the structure
    if (!body.channels || !body.events || !body.quietHours) {
      return NextResponse.json(
        { error: 'Invalid notification preferences structure' },
        { status: 400 }
      );
    }

    // Ensure emergency notifications are always on
    body.events.emergency = { push: true, sms: true, email: true };

    // Get current settings and merge
    const currentSettings = (user as any).settings || {};
    const updatedSettings = {
      ...currentSettings,
      notifications: body,
    };

    // Update user settings
    // Store notification preferences in the settings JSON field
    await prisma.user.update({
      where: { id: user.id },
      data: {
        settings: updatedSettings,
      } as any,
    });

    return NextResponse.json(body);
  } catch (error) {
    logger.error('Update notifications error', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
