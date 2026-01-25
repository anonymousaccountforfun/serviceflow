import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@serviceflow/database';

/**
 * Skip onboarding endpoint
 *
 * Marks onboarding as skipped so users can access the dashboard.
 * They can complete onboarding later from settings.
 */
export async function POST() {
  try {
    const { userId: clerkId } = auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user and organization
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

    // Update organization settings to mark onboarding as skipped
    const currentSettings = (user.organization.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      onboardingCompleted: true,
      onboardingSkipped: true, // Track that setup was skipped vs completed
    };

    await prisma.organization.update({
      where: { id: user.organization.id },
      data: {
        settings: updatedSettings,
      },
    });

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Skip onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to skip onboarding' },
      { status: 500 }
    );
  }
}
