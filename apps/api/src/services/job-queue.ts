/**
 * Job Queue Service
 *
 * Reliable job queue using the database for persistence.
 * Jobs survive server restarts and are processed with retries.
 *
 * Why database instead of Redis/BullMQ?
 * - Simpler infrastructure (no Redis dependency for MVP)
 * - Jobs persist across restarts
 * - Easy to inspect and debug
 * - Can upgrade to BullMQ later without changing job interfaces
 */

import { prisma, Prisma } from '@serviceflow/database';
import { logger } from '../lib/logger';

// ============================================
// TYPES
// ============================================

export type JobType =
  | 'missed_call_textback'
  | 'review_request'
  | 'estimate_followup'
  | 'payment_reminder'
  | 'appointment_reminder'
  | 'sequence_step';

export interface JobPayload {
  [key: string]: unknown;
}

export interface Job<T extends JobPayload = JobPayload> {
  id: string;
  type: JobType;
  organizationId: string;
  payload: T;
  processAfter: Date;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

export interface EnqueueOptions<T extends JobPayload = JobPayload> {
  type: JobType;
  organizationId: string;
  payload: T;
  delayMs?: number;
  processAfter?: Date;
  maxAttempts?: number;
}

type JobHandler<T extends JobPayload = JobPayload> = (job: Job<T>) => Promise<void>;

// ============================================
// JOB QUEUE SERVICE
// ============================================

class JobQueueService {
  private handlers: Map<JobType, JobHandler> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private pollIntervalMs = 10000; // Check every 10 seconds

  /**
   * Register a job handler
   */
  register<T extends JobPayload>(type: JobType, handler: JobHandler<T>): void {
    this.handlers.set(type, handler as JobHandler);
    logger.debug('Job handler registered', { type });
  }

  /**
   * Enqueue a job for processing
   */
  async enqueue<T extends JobPayload>(options: EnqueueOptions<T>): Promise<string> {
    const {
      type,
      organizationId,
      payload,
      delayMs = 0,
      processAfter,
      maxAttempts = 3,
    } = options;

    // Calculate when to process
    const processAt = processAfter || new Date(Date.now() + delayMs);

    // Create job record
    const job = await prisma.delayedJob.create({
      data: {
        type,
        organizationId,
        payload: payload as Prisma.InputJsonValue,
        processAfter: processAt,
        maxAttempts,
        attempts: 0,
      },
    });

    logger.info('Job enqueued', {
      jobId: job.id,
      type,
      processAfter: processAt.toISOString(),
    });

    return job.id;
  }

  /**
   * Start the job processor
   */
  start(): void {
    if (this.processingInterval) {
      return; // Already running
    }

    logger.info('Job queue processor started', { pollIntervalMs: this.pollIntervalMs });

    // Process immediately on start
    this.processJobs().catch((err) => logger.error('Error processing jobs', err));

    // Then poll at interval
    this.processingInterval = setInterval(() => {
      this.processJobs().catch((err) => logger.error('Error processing jobs', err));
    }, this.pollIntervalMs);
  }

  /**
   * Stop the job processor
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info('Job queue processor stopped');
    }
  }

  /**
   * Process ready jobs
   */
  private async processJobs(): Promise<number> {
    if (this.isProcessing) {
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      // Get jobs ready to process
      // Note: We filter by maxAttempts in application code since Prisma can't compare fields
      const jobs = await prisma.delayedJob.findMany({
        where: {
          processAfter: { lte: new Date() },
          processedAt: null,
        },
        orderBy: { processAfter: 'asc' },
        take: 100,
      });

      // Filter to only jobs with attempts < maxAttempts
      const eligibleJobs = jobs.filter(j => j.attempts < j.maxAttempts);

      if (eligibleJobs.length === 0) {
        return 0;
      }

      logger.debug('Processing jobs', { count: eligibleJobs.length });

      for (const dbJob of eligibleJobs) {
        const handler = this.handlers.get(dbJob.type as JobType);

        if (!handler) {
          logger.warn('No handler for job type', { type: dbJob.type, jobId: dbJob.id });
          continue;
        }

        const job: Job = {
          id: dbJob.id,
          type: dbJob.type as JobType,
          organizationId: dbJob.organizationId,
          payload: dbJob.payload as JobPayload,
          processAfter: dbJob.processAfter,
          attempts: dbJob.attempts,
          maxAttempts: dbJob.maxAttempts,
          lastError: dbJob.lastError,
          processedAt: dbJob.processedAt,
          createdAt: dbJob.createdAt,
        };

        try {
          // Increment attempts before processing
          await prisma.delayedJob.update({
            where: { id: dbJob.id },
            data: { attempts: { increment: 1 } },
          });

          // Execute handler
          await handler(job);

          // Mark as processed
          await prisma.delayedJob.update({
            where: { id: dbJob.id },
            data: { processedAt: new Date() },
          });

          processedCount++;
          logger.info('Job processed', { jobId: dbJob.id, type: dbJob.type });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          // Record error
          await prisma.delayedJob.update({
            where: { id: dbJob.id },
            data: { lastError: errorMessage },
          });

          logger.error('Job failed', {
            jobId: dbJob.id,
            type: dbJob.type,
            error: errorMessage,
            attempts: dbJob.attempts + 1,
            maxAttempts: dbJob.maxAttempts,
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  /**
   * Cancel a pending job
   */
  async cancel(jobId: string): Promise<boolean> {
    try {
      await prisma.delayedJob.update({
        where: { id: jobId },
        data: {
          processedAt: new Date(),
          lastError: 'Canceled',
        },
      });
      logger.info('Job canceled', { jobId });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up old processed jobs
   */
  async cleanup(olderThanDays = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await prisma.delayedJob.deleteMany({
      where: {
        processedAt: { lt: cutoff },
      },
    });

    if (result.count > 0) {
      logger.info('Cleaned up old jobs', { count: result.count });
    }

    return result.count;
  }
}

// Singleton instance
export const jobQueue = new JobQueueService();

export default jobQueue;
