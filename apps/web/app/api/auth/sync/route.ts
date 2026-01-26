import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@serviceflow/database';
import { logger } from '@/lib/logger';

// Sync Clerk user to database
// Creates User + Organization on first sign-in
export async function POST() {
  try {
    const { userId: clerkId } = auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get full user details from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user already exists in our database
    let user = await prisma.user.findUnique({
      where: { clerkId },
      include: { organization: true },
    });

    if (user) {
      // User exists, return their data
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          subscriptionTier: user.organization.subscriptionTier,
          subscriptionStatus: user.organization.subscriptionStatus,
          settings: user.organization.settings,
        },
        isNewUser: false,
      });
    }

    // New user - create Organization and User
    const email = clerkUser.emailAddresses[0]?.emailAddress || '';
    const firstName = clerkUser.firstName || '';
    const lastName = clerkUser.lastName || '';

    // Generate a slug from the user's name or email
    const baseName = firstName || email.split('@')[0] || 'business';
    const baseSlug = baseName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    // Ensure unique slug by appending random suffix
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;

    // Create organization with user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: firstName ? `${firstName}'s Business` : 'My Business',
          slug: uniqueSlug,
          email,
          subscriptionTier: 'starter',
          subscriptionStatus: 'trialing',
          settings: {
            onboardingCompleted: false,
            businessHours: {
              monday: { open: '08:00', close: '17:00' },
              tuesday: { open: '08:00', close: '17:00' },
              wednesday: { open: '08:00', close: '17:00' },
              thursday: { open: '08:00', close: '17:00' },
              friday: { open: '08:00', close: '17:00' },
              saturday: { open: null, close: null },
              sunday: { open: null, close: null },
            },
            aiSettings: {
              voiceEnabled: true,
              textEnabled: true,
              greeting: `Hi, thanks for calling! We're helping another customer right now, but we'll get back to you shortly.`,
            },
          },
        },
      });

      // Create user as owner
      const newUser = await tx.user.create({
        data: {
          organizationId: organization.id,
          clerkId,
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          phone: clerkUser.phoneNumbers[0]?.phoneNumber || null,
          role: 'owner',
          avatarUrl: clerkUser.imageUrl || null,
        },
      });

      return { organization, user: newUser };
    });

    return NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        avatarUrl: result.user.avatarUrl,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        subscriptionTier: result.organization.subscriptionTier,
        subscriptionStatus: result.organization.subscriptionStatus,
        settings: result.organization.settings,
      },
      isNewUser: true,
    });

  } catch (error) {
    logger.error('Auth sync error', error);
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    );
  }
}

// GET method to fetch current user data
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
        { error: 'User not found in database. Please call POST /api/auth/sync first.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        subscriptionTier: user.organization.subscriptionTier,
        subscriptionStatus: user.organization.subscriptionStatus,
        settings: user.organization.settings,
      },
    });

  } catch (error) {
    logger.error('Auth fetch error', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
