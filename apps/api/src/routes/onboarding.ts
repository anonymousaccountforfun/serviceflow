/**
 * Onboarding API Routes
 *
 * Handles onboarding-related operations including:
 * - Seeding sample data for new organizations
 * - Completing onboarding setup
 */

import { Router, Request, Response } from 'express';
import { prisma, CustomerSource, JobStatus, JobPriority, ConversationStatus } from '@serviceflow/database';
import { logger } from '../lib/logger';
import { email } from '../services/email';
import {
  sampleCustomers,
  sampleJobs,
  sampleConversations,
  sampleReviews,
  getRelativeDate,
  getRelativeTime,
} from '../data/sample-data';

const router = Router();

/**
 * POST /api/onboarding/seed-sample-data
 * Seeds sample data for demo/exploration purposes
 */
router.post('/seed-sample-data', async (req: Request, res: Response) => {
  try {
    const orgId = req.auth!.organizationId;

    // Check if org already has data (prevent double-seeding)
    const existingJobs = await prisma.job.count({
      where: { organizationId: orgId },
    });

    if (existingJobs > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E4010',
          message: 'Organization already has data. Sample data can only be added to empty accounts.',
        },
      });
    }

    // Create all sample data in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create customers
      const createdCustomers = await Promise.all(
        sampleCustomers.map((customer) =>
          tx.customer.create({
            data: {
              organizationId: orgId,
              firstName: customer.firstName,
              lastName: customer.lastName,
              phone: customer.phone,
              email: customer.email,
              address: {
                street: customer.address,
                city: customer.city,
                state: customer.state,
                zip: customer.zip,
              },
              source: customer.source as CustomerSource,
              notes: customer.notes,
            },
          })
        )
      );

      // 2. Create jobs (referencing created customers)
      const createdJobs = await Promise.all(
        sampleJobs.map((job) => {
          const customer = createdCustomers[job.customerIndex];
          const scheduledAt = job.scheduledDaysFromNow !== undefined
            ? getRelativeDate(job.scheduledDaysFromNow, job.scheduledHour)
            : null;

          return tx.job.create({
            data: {
              organizationId: orgId,
              customerId: customer.id,
              title: job.title,
              description: job.description,
              type: job.type,
              status: job.status as JobStatus,
              priority: job.priority as JobPriority,
              estimatedValue: job.estimatedValue,
              scheduledAt,
              notes: job.notes,
            },
          });
        })
      );

      // 3. Create conversations and messages
      const createdConversations = await Promise.all(
        sampleConversations.map(async (conv) => {
          const customer = createdCustomers[conv.customerIndex];

          const conversation = await tx.conversation.create({
            data: {
              organizationId: orgId,
              customerId: customer.id,
              channel: conv.channel,
              status: conv.status as ConversationStatus,
              aiHandled: conv.aiHandled,
              lastMessageAt: getRelativeTime(conv.messages[0]?.minutesAgo || 0),
            },
          });

          // Create messages for this conversation
          await Promise.all(
            conv.messages.map((msg) =>
              tx.message.create({
                data: {
                  conversationId: conversation.id,
                  content: msg.content,
                  direction: msg.direction,
                  senderType: msg.senderType,
                  createdAt: getRelativeTime(msg.minutesAgo),
                },
              })
            )
          );

          return conversation;
        })
      );

      // 4. Create reviews
      const createdReviews = await Promise.all(
        sampleReviews.map((review) =>
          tx.review.create({
            data: {
              organizationId: orgId,
              platform: review.platform,
              externalId: `sample_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              rating: review.rating,
              content: review.content,
              reviewerName: review.reviewerName,
              respondedAt: review.responded ? getRelativeDate(-review.daysAgo) : null,
              response: review.response,
              createdAt: getRelativeDate(-review.daysAgo),
            },
          })
        )
      );

      return {
        customers: createdCustomers.length,
        jobs: createdJobs.length,
        conversations: createdConversations.length,
        reviews: createdReviews.length,
      };
    });

    // Update organization settings to mark sample data as seeded
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...currentSettings,
          sampleDataSeeded: true,
          sampleDataSeededAt: new Date().toISOString(),
        },
      },
    });

    logger.info('Sample data seeded', {
      organizationId: orgId,
      ...result,
    });

    res.status(201).json({
      success: true,
      data: {
        seeded: result,
        message: 'Sample data has been added to your account.',
      },
    });
  } catch (error) {
    logger.error('Error seeding sample data', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'E9001',
        message: 'Failed to seed sample data',
      },
    });
  }
});

/**
 * DELETE /api/onboarding/sample-data
 * Removes all sample data from an organization
 */
router.delete('/sample-data', async (req: Request, res: Response) => {
  try {
    const orgId = req.auth!.organizationId;

    // Check if sample data was seeded
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    if (!settings.sampleDataSeeded) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E4011',
          message: 'No sample data to remove.',
        },
      });
    }

    // Delete in correct order (respecting foreign keys)
    await prisma.$transaction(async (tx) => {
      // Delete messages first (depends on conversations)
      await tx.message.deleteMany({
        where: {
          conversation: { organizationId: orgId },
        },
      });

      // Delete conversations
      await tx.conversation.deleteMany({
        where: { organizationId: orgId },
      });

      // Delete jobs
      await tx.job.deleteMany({
        where: { organizationId: orgId },
      });

      // Delete reviews
      await tx.review.deleteMany({
        where: { organizationId: orgId },
      });

      // Delete customers
      await tx.customer.deleteMany({
        where: { organizationId: orgId },
      });
    });

    // Update organization settings
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...settings,
          sampleDataSeeded: false,
          sampleDataRemovedAt: new Date().toISOString(),
        },
      },
    });

    logger.info('Sample data removed', { organizationId: orgId });

    res.json({
      success: true,
      data: {
        message: 'Sample data has been removed from your account.',
      },
    });
  } catch (error) {
    logger.error('Error removing sample data', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'E9001',
        message: 'Failed to remove sample data',
      },
    });
  }
});

/**
 * POST /api/onboarding/complete
 * Marks onboarding as complete and sends welcome email
 */
router.post('/complete', async (req: Request, res: Response) => {
  try {
    const orgId = req.auth!.organizationId;
    const userId = req.auth!.userId;

    // Get organization and user details
    const [org, user] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, settings: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      }),
    ]);

    if (!org || !user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E4040',
          message: 'Organization or user not found',
        },
      });
    }

    const currentSettings = (org.settings as Record<string, unknown>) || {};

    // Check if already completed
    if (currentSettings.onboardingCompletedAt) {
      return res.json({
        success: true,
        data: {
          message: 'Onboarding already completed',
          completedAt: currentSettings.onboardingCompletedAt,
        },
      });
    }

    // Mark onboarding as complete
    const completedAt = new Date().toISOString();
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...currentSettings,
          onboardingCompleted: true,
          onboardingCompletedAt: completedAt,
        },
      },
    });

    // Send welcome email
    const dashboardUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/dashboard`
      : 'https://app.serviceflow.app/dashboard';

    const emailResult = await email.sendWelcomeEmail(
      user.email,
      org.name,
      dashboardUrl
    );

    if (!emailResult.success) {
      logger.warn('Welcome email failed to send', {
        organizationId: orgId,
        userId,
        error: emailResult.error,
      });
    }

    logger.info('Onboarding completed', {
      organizationId: orgId,
      userId,
      emailSent: emailResult.success,
    });

    res.json({
      success: true,
      data: {
        message: 'Onboarding completed successfully',
        completedAt,
        welcomeEmailSent: emailResult.success,
      },
    });
  } catch (error) {
    logger.error('Error completing onboarding', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'E9001',
        message: 'Failed to complete onboarding',
      },
    });
  }
});

export default router;
