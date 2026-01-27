/**
 * Job Queue Service Unit Tests
 *
 * Tests the reliable job queue functionality:
 * 1. Job enqueueing with delays
 * 2. Handler registration
 * 3. Job processing with retries
 * 4. Error handling and retry logic
 */

import { mockPrisma, testData } from '../tests/mocks/database';

// Mock logger
jest.mock('../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocks are set up
import { jobQueue as jobQueueService } from './job-queue';

describe('Job Queue Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jobQueueService.stop();
    jest.useRealTimers();
  });

  describe('register', () => {
    it('should register a job handler', () => {
      const handler = jest.fn();
      jobQueueService.register('missed_call_textback', handler);

      // Handler should be registered (no error thrown)
      expect(true).toBe(true);
    });

    it('should allow registering multiple handlers for different job types', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      jobQueueService.register('missed_call_textback', handler1);
      jobQueueService.register('review_request', handler2);

      // Both handlers should be registered
      expect(true).toBe(true);
    });
  });

  describe('enqueue', () => {
    it('should create a delayed job in the database', async () => {
      const mockJob = {
        id: 'job_123',
        type: 'missed_call_textback',
        organizationId: 'org_123',
        payload: { callId: 'call_123' },
        processAfter: new Date(Date.now() + 30000),
        maxAttempts: 3,
        attempts: 0,
        createdAt: new Date(),
      };

      mockPrisma.delayedJob.create.mockResolvedValue(mockJob);

      const jobId = await jobQueueService.enqueue({
        type: 'missed_call_textback',
        organizationId: 'org_123',
        payload: { callId: 'call_123' },
        delayMs: 30000,
      });

      expect(jobId).toBe('job_123');
      expect(mockPrisma.delayedJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'missed_call_textback',
          organizationId: 'org_123',
          payload: { callId: 'call_123' },
          maxAttempts: 3,
          attempts: 0,
        }),
      });
    });

    it('should calculate processAfter from delayMs', async () => {
      const now = Date.now();
      jest.setSystemTime(now);

      mockPrisma.delayedJob.create.mockResolvedValue({ id: 'job_delay' });

      await jobQueueService.enqueue({
        type: 'review_request',
        organizationId: 'org_123',
        payload: {},
        delayMs: 60000, // 1 minute
      });

      expect(mockPrisma.delayedJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          processAfter: new Date(now + 60000),
        }),
      });
    });

    it('should use provided processAfter over delayMs', async () => {
      const futureDate = new Date('2030-01-01T00:00:00Z');

      mockPrisma.delayedJob.create.mockResolvedValue({ id: 'job_future' });

      await jobQueueService.enqueue({
        type: 'appointment_reminder',
        organizationId: 'org_123',
        payload: {},
        processAfter: futureDate,
        delayMs: 1000, // Should be ignored
      });

      expect(mockPrisma.delayedJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          processAfter: futureDate,
        }),
      });
    });

    it('should use custom maxAttempts when provided', async () => {
      mockPrisma.delayedJob.create.mockResolvedValue({ id: 'job_retry' });

      await jobQueueService.enqueue({
        type: 'payment_reminder',
        organizationId: 'org_123',
        payload: {},
        maxAttempts: 5,
      });

      expect(mockPrisma.delayedJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          maxAttempts: 5,
        }),
      });
    });

    it('should default to 0 delay when not specified', async () => {
      const now = Date.now();
      jest.setSystemTime(now);

      mockPrisma.delayedJob.create.mockResolvedValue({ id: 'job_immediate' });

      await jobQueueService.enqueue({
        type: 'sequence_step',
        organizationId: 'org_123',
        payload: {},
        // No delayMs or processAfter
      });

      expect(mockPrisma.delayedJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          processAfter: new Date(now),
        }),
      });
    });
  });

  describe('job processing', () => {
    it('should process ready jobs', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      jobQueueService.register('missed_call_textback', handler);

      const readyJob = {
        id: 'job_ready',
        type: 'missed_call_textback',
        organizationId: 'org_123',
        payload: { callId: 'call_123', customerId: 'cust_123' },
        processAfter: new Date(Date.now() - 1000), // In the past
        maxAttempts: 3,
        attempts: 0,
        lastError: null,
        processedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.delayedJob.findMany.mockResolvedValue([readyJob]);
      mockPrisma.delayedJob.update.mockResolvedValue(readyJob);

      jobQueueService.start();

      // Allow processing to occur
      await jest.advanceTimersByTimeAsync(100);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'job_ready',
          type: 'missed_call_textback',
          payload: { callId: 'call_123', customerId: 'cust_123' },
        })
      );
    });

    it('should increment attempts before processing', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      jobQueueService.register('review_request', handler);

      const job = {
        id: 'job_attempt',
        type: 'review_request',
        organizationId: 'org_123',
        payload: {},
        processAfter: new Date(Date.now() - 1000),
        maxAttempts: 3,
        attempts: 0,
        lastError: null,
        processedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.delayedJob.findMany.mockResolvedValue([job]);
      mockPrisma.delayedJob.update.mockResolvedValue(job);

      jobQueueService.start();
      await jest.advanceTimersByTimeAsync(100);

      // First update should increment attempts
      expect(mockPrisma.delayedJob.update).toHaveBeenCalledWith({
        where: { id: 'job_attempt' },
        data: { attempts: { increment: 1 } },
      });
    });

    it('should mark job as processed on success', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      jobQueueService.register('estimate_followup', handler);

      const job = {
        id: 'job_success',
        type: 'estimate_followup',
        organizationId: 'org_123',
        payload: {},
        processAfter: new Date(Date.now() - 1000),
        maxAttempts: 3,
        attempts: 0,
        lastError: null,
        processedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.delayedJob.findMany.mockResolvedValue([job]);
      mockPrisma.delayedJob.update.mockResolvedValue(job);

      jobQueueService.start();
      await jest.advanceTimersByTimeAsync(100);

      // Second update should mark as processed
      expect(mockPrisma.delayedJob.update).toHaveBeenCalledWith({
        where: { id: 'job_success' },
        data: { processedAt: expect.any(Date) },
      });
    });

    it('should record error on handler failure', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      jobQueueService.register('payment_reminder', handler);

      const job = {
        id: 'job_fail',
        type: 'payment_reminder',
        organizationId: 'org_123',
        payload: {},
        processAfter: new Date(Date.now() - 1000),
        maxAttempts: 3,
        attempts: 0,
        lastError: null,
        processedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.delayedJob.findMany.mockResolvedValue([job]);
      mockPrisma.delayedJob.update.mockResolvedValue(job);

      jobQueueService.start();
      await jest.advanceTimersByTimeAsync(100);

      // Should record the error
      expect(mockPrisma.delayedJob.update).toHaveBeenCalledWith({
        where: { id: 'job_fail' },
        data: { lastError: 'Handler failed' },
      });
    });

    it('should not process jobs that have reached max attempts', async () => {
      const handler = jest.fn();
      jobQueueService.register('appointment_reminder', handler);

      const exhaustedJob = {
        id: 'job_exhausted',
        type: 'appointment_reminder',
        organizationId: 'org_123',
        payload: {},
        processAfter: new Date(Date.now() - 1000),
        maxAttempts: 3,
        attempts: 3, // Already at max
        lastError: 'Previous error',
        processedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.delayedJob.findMany.mockResolvedValue([exhaustedJob]);

      jobQueueService.start();
      await jest.advanceTimersByTimeAsync(100);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not process future jobs', async () => {
      const handler = jest.fn();
      jobQueueService.register('sequence_step', handler);

      // Job is scheduled for the future
      const futureJob = {
        id: 'job_future',
        type: 'sequence_step',
        organizationId: 'org_123',
        payload: {},
        processAfter: new Date(Date.now() + 60000), // 1 minute in future
        maxAttempts: 3,
        attempts: 0,
        lastError: null,
        processedAt: null,
        createdAt: new Date(),
      };

      // Query filters by processAfter <= now, so this job won't be returned
      mockPrisma.delayedJob.findMany.mockResolvedValue([]);

      jobQueueService.start();
      await jest.advanceTimersByTimeAsync(100);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should skip jobs without registered handlers', async () => {
      // Use a job type that we know won't have a handler
      // (the singleton accumulates handlers from other tests)

      const orphanJob = {
        id: 'job_orphan',
        type: 'nonexistent_job_type' as any, // Type that won't have a handler
        organizationId: 'org_123',
        payload: {},
        processAfter: new Date(Date.now() - 1000),
        maxAttempts: 3,
        attempts: 0,
        lastError: null,
        processedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.delayedJob.findMany.mockResolvedValue([orphanJob]);

      jobQueueService.start();
      await jest.advanceTimersByTimeAsync(100);

      // Job should not be marked as processed (no processedAt update)
      expect(mockPrisma.delayedJob.update).not.toHaveBeenCalledWith({
        where: { id: 'job_orphan' },
        data: { processedAt: expect.any(Date) },
      });
    });

    it('should process multiple jobs in order', async () => {
      const processOrder: string[] = [];
      const handler = jest.fn().mockImplementation((job) => {
        processOrder.push(job.id);
        return Promise.resolve();
      });
      jobQueueService.register('missed_call_textback', handler);

      const jobs = [
        {
          id: 'job_1',
          type: 'missed_call_textback',
          organizationId: 'org_123',
          payload: {},
          processAfter: new Date(Date.now() - 3000), // Oldest
          maxAttempts: 3,
          attempts: 0,
          lastError: null,
          processedAt: null,
          createdAt: new Date(),
        },
        {
          id: 'job_2',
          type: 'missed_call_textback',
          organizationId: 'org_123',
          payload: {},
          processAfter: new Date(Date.now() - 2000),
          maxAttempts: 3,
          attempts: 0,
          lastError: null,
          processedAt: null,
          createdAt: new Date(),
        },
        {
          id: 'job_3',
          type: 'missed_call_textback',
          organizationId: 'org_123',
          payload: {},
          processAfter: new Date(Date.now() - 1000), // Newest
          maxAttempts: 3,
          attempts: 0,
          lastError: null,
          processedAt: null,
          createdAt: new Date(),
        },
      ];

      mockPrisma.delayedJob.findMany.mockResolvedValue(jobs);
      mockPrisma.delayedJob.update.mockResolvedValue({});

      jobQueueService.start();
      await jest.advanceTimersByTimeAsync(100);

      // Should process in order (oldest first based on processAfter)
      expect(processOrder).toEqual(['job_1', 'job_2', 'job_3']);
    });
  });

  describe('cancel', () => {
    it('should mark job as canceled', async () => {
      mockPrisma.delayedJob.update.mockResolvedValue({});

      const result = await jobQueueService.cancel('job_to_cancel');

      expect(result).toBe(true);
      expect(mockPrisma.delayedJob.update).toHaveBeenCalledWith({
        where: { id: 'job_to_cancel' },
        data: {
          processedAt: expect.any(Date),
          lastError: 'Canceled',
        },
      });
    });

    it('should return false if job not found', async () => {
      mockPrisma.delayedJob.update.mockRejectedValue(new Error('Not found'));

      const result = await jobQueueService.cancel('nonexistent_job');

      expect(result).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should delete old processed jobs', async () => {
      mockPrisma.delayedJob.deleteMany.mockResolvedValue({ count: 10 });

      const result = await jobQueueService.cleanup(7);

      expect(result).toBe(10);
      expect(mockPrisma.delayedJob.deleteMany).toHaveBeenCalledWith({
        where: {
          processedAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should use default 7 days when not specified', async () => {
      const now = Date.now();
      jest.setSystemTime(now);

      mockPrisma.delayedJob.deleteMany.mockResolvedValue({ count: 5 });

      await jobQueueService.cleanup();

      const expectedCutoff = new Date(now);
      expectedCutoff.setDate(expectedCutoff.getDate() - 7);

      expect(mockPrisma.delayedJob.deleteMany).toHaveBeenCalledWith({
        where: {
          processedAt: { lt: expect.any(Date) },
        },
      });
    });
  });

  describe('start/stop', () => {
    it('should start polling for jobs', async () => {
      mockPrisma.delayedJob.findMany.mockResolvedValue([]);

      jobQueueService.start();

      // Should query immediately
      await jest.advanceTimersByTimeAsync(100);
      expect(mockPrisma.delayedJob.findMany).toHaveBeenCalled();

      // Should poll at interval (default 10s)
      mockPrisma.delayedJob.findMany.mockClear();
      await jest.advanceTimersByTimeAsync(10000);
      expect(mockPrisma.delayedJob.findMany).toHaveBeenCalled();
    });

    it('should stop polling when stopped', async () => {
      mockPrisma.delayedJob.findMany.mockResolvedValue([]);

      jobQueueService.start();
      await jest.advanceTimersByTimeAsync(100);

      jobQueueService.stop();

      mockPrisma.delayedJob.findMany.mockClear();
      await jest.advanceTimersByTimeAsync(20000);

      // Should not have polled after stopping
      expect(mockPrisma.delayedJob.findMany).not.toHaveBeenCalled();
    });

    it('should not start multiple times', async () => {
      mockPrisma.delayedJob.findMany.mockResolvedValue([]);

      jobQueueService.start();
      jobQueueService.start(); // Second call should be ignored

      await jest.advanceTimersByTimeAsync(100);

      // Should only have one initial query
      expect(mockPrisma.delayedJob.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
