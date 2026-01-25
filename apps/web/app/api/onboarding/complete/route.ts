import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@serviceflow/database';

interface OnboardingData {
  businessProfile: {
    businessName: string;
    serviceType: string;
  };
  phoneSetup: {
    areaCode: string;
    phoneNumber: string;
    useExisting: boolean;
  };
  businessHours: {
    [key: string]: { open: string | null; close: string | null };
  };
  aiSettings: {
    greeting: string;
    voiceEnabled: boolean;
  };
  timezone?: string;
}

export async function POST(request: Request) {
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

    const data: OnboardingData = await request.json();

    // Validate required fields
    if (!data.businessProfile?.businessName || !data.businessProfile?.serviceType) {
      return NextResponse.json(
        { error: 'Business name and service type are required' },
        { status: 400 }
      );
    }

    // Build updated settings
    const currentSettings = (user.organization.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      onboardingCompleted: true,
      serviceType: data.businessProfile.serviceType,
      businessHours: data.businessHours,
      aiSettings: {
        voiceEnabled: data.aiSettings.voiceEnabled,
        textEnabled: true, // Always enable text
        greeting: data.aiSettings.greeting || `Hi, thanks for calling ${data.businessProfile.businessName}! We're helping another customer right now, but we'll get back to you shortly.`,
        escalationKeywords: ['emergency', 'urgent', 'flooding', 'leak', 'fire'],
        quietHoursStart: '21:00',
        quietHoursEnd: '08:00',
      },
      phoneSetup: {
        useExisting: data.phoneSetup.useExisting,
        areaCode: data.phoneSetup.areaCode,
        phoneNumber: data.phoneSetup.phoneNumber,
        provisioned: false, // Will be true after Twilio provisioning
      },
    };

    // Update organization with timezone and settings
    const updatedOrg = await prisma.organization.update({
      where: { id: user.organization.id },
      data: {
        name: data.businessProfile.businessName,
        timezone: data.timezone || 'America/New_York',
        settings: updatedSettings,
      },
    });

    // TODO: If not using existing number, provision Twilio number
    // This would call Twilio API to search and purchase a number
    // For now, we'll mark this as a future step

    return NextResponse.json({
      success: true,
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        settings: updatedOrg.settings,
      },
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
