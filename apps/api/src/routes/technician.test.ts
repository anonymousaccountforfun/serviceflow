/**
 * Technician Routes Integration Tests
 */

import request from 'supertest';
import app from '../index';
import { mockPrisma, testData } from '../tests/mocks/database';

// Mock Clerk
jest.mock('@clerk/backend', () => ({
  Clerk: () => ({
    verifyToken: jest.fn().mockResolvedValue({ sub: 'clerk_test123' }),
  }),
  verifyToken: jest.fn().mockResolvedValue({ sub: 'clerk_test123' }),
  createClerkClient: () => ({
    verifyToken: jest.fn().mockResolvedValue({ sub: 'clerk_test123' }),
  }),
}));

describe('Technician Routes', () => {
  const authHeader = { Authorization: 'Bearer test_token' };
  const testUser = testData.user({ role: 'technician' });
  const testCustomer = testData.customer();

  beforeEach(() => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
  });

  describe('GET /api/technician/day', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/technician/day')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return empty jobs list when no jobs assigned', async () => {
      mockPrisma.job.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/technician/day?date=2026-01-25')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(0);
      expect(response.body.data.stats.totalJobs).toBe(0);
      expect(response.body.data.stats.completedJobs).toBe(0);
    });

    it('should return jobs for the specified date', async () => {
      const jobs = [
        testData.job({
          id: 'job_1',
          title: 'Morning job',
          scheduledAt: new Date('2026-01-25T09:00:00Z'),
          status: 'scheduled',
          assignedToId: testUser.id,
          customer: testCustomer,
        }),
        testData.job({
          id: 'job_2',
          title: 'Afternoon job',
          scheduledAt: new Date('2026-01-25T14:00:00Z'),
          status: 'scheduled',
          assignedToId: testUser.id,
          customer: testCustomer,
        }),
      ];

      mockPrisma.job.findMany.mockResolvedValue(jobs);

      const response = await request(app)
        .get('/api/technician/day?date=2026-01-25')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(2);
      expect(response.body.data.stats.totalJobs).toBe(2);
      expect(response.body.data.date).toBe('2026-01-25');
    });

    it('should identify current job based on in_progress status', async () => {
      const jobs = [
        testData.job({
          id: 'job_current',
          title: 'Current job',
          scheduledAt: new Date('2026-01-25T09:00:00Z'),
          status: 'in_progress',
          assignedToId: testUser.id,
          customer: testCustomer,
        }),
        testData.job({
          id: 'job_next',
          title: 'Next job',
          scheduledAt: new Date('2026-01-25T11:00:00Z'),
          status: 'scheduled',
          assignedToId: testUser.id,
          customer: testCustomer,
        }),
      ];

      mockPrisma.job.findMany.mockResolvedValue(jobs);

      const response = await request(app)
        .get('/api/technician/day?date=2026-01-25')
        .set(authHeader)
        .expect(200);

      expect(response.body.data.currentJobId).toBe('job_current');
      expect(response.body.data.nextJobId).toBe('job_next');
    });

    it('should calculate stats correctly', async () => {
      const jobs = [
        testData.job({
          id: 'job_1',
          status: 'completed',
          scheduledAt: new Date('2026-01-25T09:00:00Z'),
          customer: testCustomer,
        }),
        testData.job({
          id: 'job_2',
          status: 'completed',
          scheduledAt: new Date('2026-01-25T11:00:00Z'),
          customer: testCustomer,
        }),
        testData.job({
          id: 'job_3',
          status: 'scheduled',
          scheduledAt: new Date('2026-01-25T14:00:00Z'),
          customer: testCustomer,
        }),
      ];

      mockPrisma.job.findMany.mockResolvedValue(jobs);

      const response = await request(app)
        .get('/api/technician/day?date=2026-01-25')
        .set(authHeader)
        .expect(200);

      expect(response.body.data.stats.totalJobs).toBe(3);
      expect(response.body.data.stats.completedJobs).toBe(2);
      expect(response.body.data.stats.estimatedHours).toBeGreaterThan(0);
    });

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .get('/api/technician/day?date=invalid')
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E4001');
    });
  });

  describe('GET /api/technician/route', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/technician/route')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return optimized route for day', async () => {
      const jobs = [
        testData.job({
          id: 'job_1',
          title: 'Job 1',
          scheduledAt: new Date('2026-01-25T09:00:00Z'),
          status: 'scheduled',
          customer: {
            ...testCustomer,
            address: { lat: 30.267153, lng: -97.743057 }, // Austin, TX
          },
        }),
        testData.job({
          id: 'job_2',
          title: 'Job 2',
          scheduledAt: new Date('2026-01-25T11:00:00Z'),
          status: 'scheduled',
          customer: {
            ...testCustomer,
            address: { lat: 30.285055, lng: -97.734519 }, // Nearby Austin
          },
        }),
      ];

      mockPrisma.job.findMany.mockResolvedValue(jobs);

      const response = await request(app)
        .get('/api/technician/route?date=2026-01-25')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.optimizedOrder).toHaveLength(2);
      expect(response.body.data.totalDistance).toBeGreaterThanOrEqual(0);
      expect(response.body.data.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('should exclude completed and canceled jobs', async () => {
      mockPrisma.job.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/technician/route?date=2026-01-25')
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              notIn: ['completed', 'canceled'],
            },
          }),
        })
      );
    });
  });

  describe('POST /api/technician/clock-in', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/technician/clock-in')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should record clock-in successfully', async () => {
      // Mock: no existing time entry
      mockPrisma.timeEntry.findUnique.mockResolvedValue(null);
      // Mock: create returns new entry
      mockPrisma.timeEntry.create.mockResolvedValue({
        id: 'te_123',
        userId: testUser.id,
        organizationId: testUser.organizationId,
        date: new Date().toISOString().split('T')[0],
        clockInAt: new Date(),
        clockOutAt: null,
        breakMinutes: 0,
      });

      const response = await request(app)
        .post('/api/technician/clock-in')
        .set(authHeader)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.clockInAt).toBeDefined();
      expect(response.body.data.message).toContain('clocked in');
    });
  });

  describe('POST /api/technician/clock-out', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/technician/clock-out')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error if not clocked in', async () => {
      // Mock: no existing time entry
      mockPrisma.timeEntry.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/technician/clock-out')
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E4003');
    });
  });

  describe('GET /api/technician/timesheet', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/technician/timesheet')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require week parameter', async () => {
      const response = await request(app)
        .get('/api/technician/timesheet')
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E4001');
    });

    it('should return weekly timesheet', async () => {
      // Mock time entries for the week
      mockPrisma.timeEntry.findMany.mockResolvedValue([
        {
          id: 'te_1',
          userId: testUser.id,
          date: '2026-01-20',
          clockInAt: new Date('2026-01-20T08:00:00Z'),
          clockOutAt: new Date('2026-01-20T17:00:00Z'),
          breakMinutes: 30,
          hoursWorked: 8.5,
        },
      ]);
      mockPrisma.job.groupBy.mockResolvedValue([
        { status: 'completed', _count: 5 },
        { status: 'scheduled', _count: 2 },
      ]);

      const response = await request(app)
        .get('/api/technician/timesheet?week=2026-W04')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.week).toBe('2026-W04');
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.totalJobs).toBe(7);
      expect(response.body.data.summary.completedJobs).toBe(5);
    });

    it('should reject invalid week format', async () => {
      const response = await request(app)
        .get('/api/technician/timesheet?week=invalid')
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E4001');
    });
  });

  describe('GET /api/technician/status', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/technician/status')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return current clock-in status', async () => {
      // Mock: no existing time entry (not clocked in)
      mockPrisma.timeEntry.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/technician/status')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.date).toBeDefined();
      expect(typeof response.body.data.isClockedIn).toBe('boolean');
    });
  });
});
