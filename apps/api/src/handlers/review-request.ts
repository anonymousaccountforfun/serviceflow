/**
 * Review Request Handler
 *
 * Handles the job.completed event by sending a review request to the customer.
 * Implements a 2-hour delay and follow-up reminder if no response.
 */

import { prisma } from '@serviceflow/database';
import { events, DomainEvent, JobCompletedEventData } from '../services/events';
import { sms } from '../services/sms';

// Configuration
const REVIEW_REQUEST_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours
const REVIEW_REMINDER_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours after first request

/**
 * Register the review request handler
 */
export function registerReviewRequestHandler(): void {
  events.on<JobCompletedEventData>('job.completed', handleJobCompleted);
  console.log('✅ Review request handler registered');
}

/**
 * Handle a completed job by scheduling a review request
 */
async function handleJobCompleted(event: DomainEvent<JobCompletedEventData>): Promise<void> {
  const { jobId, customerId } = event.data;
  const { organizationId } = event;

  console.log(`⭐ Processing review request for job ${jobId}`);

  try {
    // 1. Get the job with customer and organization data
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        organization: true,
        customer: true,
      },
    });

    if (!job || !job.customer) {
      console.log(`Job or customer not found: ${jobId}`);
      return;
    }

    // 2. Check if review request already exists for this job
    const existingRequest = await prisma.reviewRequest.findFirst({
      where: { jobId },
    });

    if (existingRequest) {
      console.log(`Review request already exists for job ${jobId}`);
      return;
    }

    // 3. Check organization settings for review automation
    const settings = job.organization.settings as any;
    const reviewSettings = settings?.reviewSettings || {};

    // Skip if review automation is disabled
    if (reviewSettings.enabled === false) {
      console.log(`Review automation disabled for org ${organizationId}`);
      return;
    }

    // 4. Create the review request record
    const reviewRequest = await prisma.reviewRequest.create({
      data: {
        organizationId,
        customerId: job.customerId,
        jobId,
        status: 'pending',
      },
    });

    console.log(`📝 Review request created: ${reviewRequest.id}`);

    // 5. Wait the configured delay before sending
    const delay = reviewSettings.delayMinutes
      ? reviewSettings.delayMinutes * 60 * 1000
      : REVIEW_REQUEST_DELAY_MS;

    console.log(`⏳ Waiting ${delay / 1000 / 60} minutes before sending review request...`);
    await new Promise((resolve) => setTimeout(resolve, delay));

    // 6. Re-check if request was canceled during delay
    const refreshedRequest = await prisma.reviewRequest.findUnique({
      where: { id: reviewRequest.id },
    });

    if (!refreshedRequest || refreshedRequest.status !== 'pending') {
      console.log(`Review request ${reviewRequest.id} was modified, skipping`);
      return;
    }

    // 7. Build the review link
    const baseUrl = process.env.APP_URL || 'https://app.serviceflow.com';
    const reviewLink = `${baseUrl}/r/${reviewRequest.id}`;

    // 8. Build variables for the template
    const variables = {
      businessName: job.organization.name,
      customerName: job.customer.firstName,
      jobType: job.type,
      reviewLink,
    };

    // 9. Send the review request SMS
    const result = await sms.sendTemplated({
      organizationId,
      customerId: job.customerId,
      to: job.customer.phone,
      templateType: 'review_request',
      variables,
    });

    if (result.success) {
      // Update review request status
      await prisma.reviewRequest.update({
        where: { id: reviewRequest.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      // Emit review request sent event
      await events.emit({
        type: 'review.request_sent',
        organizationId,
        aggregateType: 'reviewRequest',
        aggregateId: reviewRequest.id,
        data: {
          reviewRequestId: reviewRequest.id,
          jobId,
          customerId: job.customerId,
        },
      });

      console.log(`✅ Review request sent for job ${jobId}`);

      // Schedule reminder if enabled
      if (reviewSettings.sendReminder !== false) {
        scheduleReviewReminder(reviewRequest.id, organizationId);
      }
    } else {
      console.error(`Failed to send review request for job ${jobId}:`, result.error);
    }
  } catch (error) {
    console.error(`Error handling job completed ${jobId}:`, error);
  }
}

/**
 * Schedule a follow-up reminder if no response
 */
async function scheduleReviewReminder(reviewRequestId: string, organizationId: string): Promise<void> {
  // Wait 24 hours
  await new Promise((resolve) => setTimeout(resolve, REVIEW_REMINDER_DELAY_MS));

  try {
    // Check if customer already clicked or completed
    const request = await prisma.reviewRequest.findUnique({
      where: { id: reviewRequestId },
      include: {
        job: {
          include: {
            organization: true,
            customer: true,
          },
        },
      },
    });

    if (!request || !request.job) {
      return;
    }

    // Only send reminder if still in 'sent' status (not clicked or completed)
    if (request.status !== 'sent') {
      console.log(`Review request ${reviewRequestId} already ${request.status}, skipping reminder`);
      return;
    }

    const baseUrl = process.env.APP_URL || 'https://app.serviceflow.com';
    const reviewLink = `${baseUrl}/r/${reviewRequestId}`;

    const variables = {
      businessName: request.job.organization.name,
      customerName: request.job.customer!.firstName,
      reviewLink,
    };

    const result = await sms.sendTemplated({
      organizationId,
      customerId: request.customerId,
      to: request.job.customer!.phone,
      templateType: 'review_request_followup',
      variables,
    });

    if (result.success) {
      console.log(`✅ Review reminder sent for request ${reviewRequestId}`);
    }
  } catch (error) {
    console.error(`Error sending review reminder ${reviewRequestId}:`, error);
  }
}

export default registerReviewRequestHandler;
