import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@serviceflow/database';

// GET /api/organizations/settings - Get organization settings
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
      include: { organization: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: user.organization.id,
      name: user.organization.name,
      settings: user.organization.settings,
    });
  } catch (error) {
    console.error('Get organization settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// PUT /api/organizations/settings - Update organization settings
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
      include: { organization: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Only owners can update organization settings
    if (user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can update settings' },
        { status: 403 }
      );
    }

    const body = await request.json() as Record<string, unknown>;
    const currentSettings = (user.organization.settings as Record<string, unknown>) || {};

    // Build update data
    const updateData: Record<string, any> = {};

    // Handle name update
    if (body.name !== undefined) {
      updateData.name = body.name;
    }

    // Merge settings fields
    const settingsUpdate: Record<string, any> = { ...currentSettings };

    // Direct settings fields
    const settingsFields = [
      'serviceType',
      'businessHours',
      'aiSettings',
      'phoneSetup',
      'serviceArea',
      'notifications',
    ];

    for (const field of settingsFields) {
      if (body[field] !== undefined) {
        // Deep merge for nested objects like aiSettings
        if (typeof body[field] === 'object' && typeof settingsUpdate[field] === 'object') {
          settingsUpdate[field] = {
            ...settingsUpdate[field],
            ...body[field],
          };
        } else {
          settingsUpdate[field] = body[field];
        }
      }
    }

    updateData.settings = settingsUpdate;

    const updatedOrg = await prisma.organization.update({
      where: { id: user.organization.id },
      data: updateData,
    });

    return NextResponse.json({
      id: updatedOrg.id,
      name: updatedOrg.name,
      settings: updatedOrg.settings,
    });
  } catch (error) {
    console.error('Update organization settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
