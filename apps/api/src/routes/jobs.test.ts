/**
 * Jobs Routes Integration Tests
 */

import request from 'supertest';
import app from '../index';
import { mockPrisma, testData } from '../tests/mocks/database';

// Mock Clerk
jest.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    verifyToken: jest.fn().mockResolvedValue({ sub: 'clerk_test123' }),
  }),
}));

describe('Jobs Routes', () => {
  const authHeader = { Authorization: 'Bearer test_token' };
  const testUser = testData.user();
  const testJob = testData.job();

  beforeEach(() => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
  });

  describe('GET /api/jobs', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/jobs')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return paginated jobs list', async () => {
      const jobs = [
        testData.job({ id: 'job_1', title: 'Fix leak' }),
        testData.job({ id: 'job_2', title: 'Install faucet' }),
      ];

      mockPrisma.job.findMany.mockResolvedValue(jobs);
      mockPrisma.job.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/jobs')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter jobs by status', async () => {
      mockPrisma.job.findMany.mockResolvedValue([testJob]);
      mockPrisma.job.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/jobs?status=lead')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: testUser.organizationId,
            status: 'lead',
          }),
        })
      );
    });

    it('should filter jobs by priority', async () => {
      mockPrisma.job.findMany.mockResolvedValue([]);
      mockPrisma.job.count.mockResolvedValue(0);

      await request(app)
        .get('/api/jobs?priority=emergency')
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: 'emergency',
          }),
        })
      );
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('should return job by ID with customer', async () => {
      const jobWithRelations = {
        ...testJob,
        customer: testData.customer(),
        appointments: [],
      };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithRelations);

      const response = await request(app)
        .get(`/api/jobs/${testJob.id}`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testJob.id);
      expect(response.body.data.customer).toBeDefined();
    });

    it('should return 404 for non-existent job', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/jobs/nonexistent')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/jobs', () => {
    it('should create a new job', async () => {
      const newJob = {
        title: 'New Job',
        type: 'repair',
        priority: 'normal',
        status: 'lead',
        customerId: 'cust_test123',
      };

      mockPrisma.customer.findFirst.mockResolvedValue(testData.customer());
      mockPrisma.job.create.mockResolvedValue({
        ...testData.job(),
        ...newJob,
        id: 'job_new123',
      });

      const response = await request(app)
        .post('/api/jobs')
        .set(authHeader)
        .send(newJob)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('New Job');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set(authHeader)
        .send({ description: 'Only description' }) // Missing required title
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate job type', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set(authHeader)
        .send({
          title: 'Test Job',
          type: 'invalid_type',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/jobs/:id', () => {
    it('should update existing job', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(testJob);
      mockPrisma.job.update.mockResolvedValue({
        ...testJob,
        title: 'Updated Title',
        status: 'scheduled',
      });

      const response = await request(app)
        .put(`/api/jobs/${testJob.id}`)
        .set(authHeader)
        .send({ title: 'Updated Title', status: 'scheduled' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
    });

    it('should validate status transitions', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(testJob);

      // Attempt invalid status
      const response = await request(app)
        .put(`/api/jobs/${testJob.id}`)
        .set(authHeader)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/jobs/:id', () => {
    it('should delete existing job', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(testJob);
      mockPrisma.job.delete.mockResolvedValue(testJob);

      const response = await request(app)
        .delete(`/api/jobs/${testJob.id}`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent job', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/jobs/nonexistent')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
