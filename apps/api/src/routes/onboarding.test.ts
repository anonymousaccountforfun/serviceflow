/**
 * Onboarding Routes Integration Tests
 */

import request from 'supertest';
import app from '../index';
import { mockPrisma, testData, resetMocks } from '../tests/mocks/database';

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

describe('Onboarding Routes', () => {
  const authHeader = { Authorization: 'Bearer test_token' };
  const testUser = testData.user();
  const testOrg = testData.organization();

  beforeEach(() => {
    resetMocks();
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
  });

  describe('POST /api/onboarding/seed-sample-data', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/onboarding/seed-sample-data')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should seed sample data for empty organization', async () => {
      // No existing jobs
      mockPrisma.job.count.mockResolvedValue(0);

      // Mock transaction to return created counts
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        // Create mock prisma for transaction
        const txMock = {
          customer: {
            create: jest.fn().mockResolvedValue({ id: 'cust_1' }),
          },
          job: {
            create: jest.fn().mockResolvedValue({ id: 'job_1' }),
          },
          conversation: {
            create: jest.fn().mockResolvedValue({ id: 'conv_1' }),
          },
          message: {
            create: jest.fn().mockResolvedValue({ id: 'msg_1' }),
          },
          review: {
            create: jest.fn().mockResolvedValue({ id: 'rev_1' }),
          },
        };

        // Return what the transaction function returns
        return {
          customers: 5,
          jobs: 8,
          conversations: 3,
          reviews: 4,
        };
      });

      // Mock org lookup for settings update
      mockPrisma.organization.findUnique.mockResolvedValue(testOrg);
      mockPrisma.organization.update.mockResolvedValue(testOrg);

      const response = await request(app)
        .post('/api/onboarding/seed-sample-data')
        .set(authHeader)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.seeded).toEqual({
        customers: 5,
        jobs: 8,
        conversations: 3,
        reviews: 4,
      });
    });

    it('should reject seeding if organization already has data', async () => {
      // Existing jobs
      mockPrisma.job.count.mockResolvedValue(5);

      const response = await request(app)
        .post('/api/onboarding/seed-sample-data')
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E2001');
      expect(response.body.error.message).toContain('already has data');
    });

    it('should update organization settings after seeding', async () => {
      mockPrisma.job.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockResolvedValue({
        customers: 5,
        jobs: 8,
        conversations: 3,
        reviews: 4,
      });
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testOrg,
        settings: { existingSetting: true },
      });
      mockPrisma.organization.update.mockResolvedValue(testOrg);

      await request(app)
        .post('/api/onboarding/seed-sample-data')
        .set(authHeader)
        .expect(201);

      expect(mockPrisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testOrg.id },
          data: expect.objectContaining({
            settings: expect.objectContaining({
              existingSetting: true,
              sampleDataSeeded: true,
            }),
          }),
        })
      );
    });
  });

  describe('DELETE /api/onboarding/sample-data', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete('/api/onboarding/sample-data')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should remove sample data if it was seeded', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testOrg,
        settings: { sampleDataSeeded: true },
      });
      mockPrisma.$transaction.mockResolvedValue(undefined);
      mockPrisma.organization.update.mockResolvedValue(testOrg);

      const response = await request(app)
        .delete('/api/onboarding/sample-data')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('removed');
    });

    it('should reject removal if no sample data was seeded', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testOrg,
        settings: { sampleDataSeeded: false },
      });

      const response = await request(app)
        .delete('/api/onboarding/sample-data')
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E2001');
    });

    it('should update organization settings after removal', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testOrg,
        settings: { sampleDataSeeded: true, otherSetting: 'value' },
      });
      mockPrisma.$transaction.mockResolvedValue(undefined);
      mockPrisma.organization.update.mockResolvedValue(testOrg);

      await request(app)
        .delete('/api/onboarding/sample-data')
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              sampleDataSeeded: false,
              otherSetting: 'value',
            }),
          }),
        })
      );
    });
  });
});
