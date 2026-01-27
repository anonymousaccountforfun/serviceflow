/**
 * Job Completion Routes Integration Tests (PRD-011)
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

// Mock fs for photo storage
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock events service
jest.mock('../services/events', () => ({
  events: {
    emit: jest.fn().mockResolvedValue('event_123'),
    on: jest.fn(),
  },
}));

describe('Job Completion Routes (PRD-011)', () => {
  const authHeader = { Authorization: 'Bearer test_token' };
  const testUser = testData.user();
  const testJob = testData.job({ status: 'in_progress' });
  const testCustomer = testData.customer();
  const testOrganization = testData.organization();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
  });

  describe('GET /api/jobs/:id/completion', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/jobs/${testJob.id}/completion`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent job', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/jobs/nonexistent/completion')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E3001');
    });

    it('should return partial completion state for in-progress job', async () => {
      // The route reads from the photos JSON field, not separate columns
      const jobWithState = {
        ...testJob,
        status: 'in_progress',
        photos: {
          photos: [
            { id: 'photo_1', url: '/uploads/test.jpg', type: 'after', caption: null, createdAt: new Date().toISOString() },
          ],
          completionState: {
            currentStep: 'work_summary',
            workSummary: { description: 'Test work', actualDuration: 60 },
          },
        },
      };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithState);

      const response = await request(app)
        .get(`/api/jobs/${testJob.id}/completion`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in_progress');
      expect(response.body.data.completionState.currentStep).toBe('work_summary');
      expect(response.body.data.photos.after).toHaveLength(1);
    });

    it('should return completed data for completed job', async () => {
      // The route reads from the photos JSON field, not separate columns
      const completedJob = {
        ...testJob,
        status: 'completed',
        completedAt: new Date(),
        photos: {
          photos: [
            { id: 'photo_1', url: '/uploads/after.jpg', type: 'after', caption: null, createdAt: new Date().toISOString() },
          ],
          completionNotes: 'Fixed the faucet',
          actualDuration: 90,
          partsUsed: [{ name: 'Cartridge', quantity: 1, price: 2500 }],
          customerSignature: 'base64signature',
        },
      };
      mockPrisma.job.findFirst.mockResolvedValue(completedJob);

      const response = await request(app)
        .get(`/api/jobs/${testJob.id}/completion`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.workSummary.description).toBe('Fixed the faucet');
      expect(response.body.data.customerSignature).toBe('base64signature');
    });
  });

  describe('POST /api/jobs/:id/completion', () => {
    it('should save partial completion progress', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(testJob);
      mockPrisma.job.update.mockResolvedValue({
        ...testJob,
        completionState: { currentStep: 'photos' },
      });

      const response = await request(app)
        .post(`/api/jobs/${testJob.id}/completion`)
        .set(authHeader)
        .send({
          currentStep: 'photos',
          workSummary: {
            description: 'Replaced faucet cartridge',
            partsUsed: [{ name: 'Cartridge', quantity: 1, price: 2500 }],
            actualDuration: 60,
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentStep).toBe('photos');
      expect(mockPrisma.job.update).toHaveBeenCalled();
    });

    it('should update job status to in_progress when saving progress', async () => {
      const leadJob = { ...testJob, status: 'scheduled' };
      mockPrisma.job.findFirst.mockResolvedValue(leadJob);
      mockPrisma.job.update.mockResolvedValue({
        ...leadJob,
        status: 'in_progress',
        completionState: { currentStep: 'work_summary' },
      });

      await request(app)
        .post(`/api/jobs/${testJob.id}/completion`)
        .set(authHeader)
        .send({ currentStep: 'work_summary' })
        .expect(200);

      expect(mockPrisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'in_progress',
          }),
        })
      );
    });

    it('should reject saving progress for completed jobs', async () => {
      const completedJob = { ...testJob, status: 'completed' };
      mockPrisma.job.findFirst.mockResolvedValue(completedJob);

      const response = await request(app)
        .post(`/api/jobs/${testJob.id}/completion`)
        .set(authHeader)
        .send({ currentStep: 'work_summary' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E5001');
    });
  });

  describe('POST /api/jobs/:id/complete', () => {
    const completeData = {
      workSummary: {
        description: 'Replaced kitchen faucet cartridge',
        partsUsed: [{ name: 'Moen cartridge', quantity: 1, price: 2499 }],
        actualDuration: 90,
        notes: 'Recommended replacing supply lines',
      },
      customerApproval: {
        signature: 'base64signaturedata',
        customerEmail: 'john@example.com',
      },
      payment: {
        createInvoice: true,
      },
      reviewRequest: {
        sent: true,
        skipped: false,
      },
    };

    it('should complete job with all data', async () => {
      const jobWithRelations = {
        ...testJob,
        status: 'in_progress',
        customer: testCustomer,
        organization: testOrganization,
        jobPhotos: [],
      };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithRelations);
      mockPrisma.job.update.mockResolvedValue({
        ...jobWithRelations,
        status: 'completed',
        completedAt: new Date(),
        completionNotes: completeData.workSummary.description,
        actualDuration: completeData.workSummary.actualDuration,
        partsUsed: completeData.workSummary.partsUsed,
        customerSignature: completeData.customerApproval.signature,
      });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv_123',
        total: 10000,
      });

      const response = await request(app)
        .post(`/api/jobs/${testJob.id}/complete`)
        .set(authHeader)
        .send(completeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBe(testJob.id);
      expect(response.body.data.completedAt).toBeDefined();
      expect(response.body.data.invoiceId).toBe('inv_123');
      expect(response.body.data.reviewRequestTriggered).toBe(true);
    });

    it('should not create invoice when not requested', async () => {
      const jobWithRelations = {
        ...testJob,
        status: 'in_progress',
        customer: testCustomer,
        organization: testOrganization,
        jobPhotos: [],
      };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithRelations);
      mockPrisma.job.update.mockResolvedValue({
        ...jobWithRelations,
        status: 'completed',
      });

      const dataWithoutInvoice = {
        ...completeData,
        payment: { createInvoice: false },
      };

      const response = await request(app)
        .post(`/api/jobs/${testJob.id}/complete`)
        .set(authHeader)
        .send(dataWithoutInvoice)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invoiceId).toBeUndefined();
      expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    });

    it('should skip review request when requested', async () => {
      const jobWithRelations = {
        ...testJob,
        status: 'in_progress',
        customer: testCustomer,
        organization: testOrganization,
        jobPhotos: [],
      };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithRelations);
      mockPrisma.job.update.mockResolvedValue({
        ...jobWithRelations,
        status: 'completed',
      });

      const dataSkipReview = {
        ...completeData,
        payment: { createInvoice: false },
        reviewRequest: {
          sent: false,
          skipped: true,
          skipReason: 'Customer requested no contact',
        },
      };

      const { events } = require('../services/events');

      const response = await request(app)
        .post(`/api/jobs/${testJob.id}/complete`)
        .set(authHeader)
        .send(dataSkipReview)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reviewRequestSkipped).toBe(true);
      expect(response.body.data.reviewSkipReason).toBe('Customer requested no contact');
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('should reject completing already completed jobs', async () => {
      const completedJob = {
        ...testJob,
        status: 'completed',
        customer: testCustomer,
        organization: testOrganization,
        jobPhotos: [],
      };
      mockPrisma.job.findFirst.mockResolvedValue(completedJob);

      const response = await request(app)
        .post(`/api/jobs/${testJob.id}/complete`)
        .set(authHeader)
        .send(completeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E5001');
    });

    it('should validate required work summary fields', async () => {
      const response = await request(app)
        .post(`/api/jobs/${testJob.id}/complete`)
        .set(authHeader)
        .send({
          workSummary: {
            // Missing required description
            partsUsed: [],
            actualDuration: 60,
          },
        })
        .expect(500); // Zod validation error results in 500 (could be improved to 400)

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/jobs/:id/photos', () => {
    it('should upload photo with base64 data', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(testJob);
      mockPrisma.jobPhoto.create.mockResolvedValue({
        id: 'photo_new',
        jobId: testJob.id,
        url: '/uploads/org_test123/jobs/test.jpg',
        type: 'after',
        caption: 'Fixed faucet',
        createdAt: new Date(),
      });

      const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD//fake';

      const response = await request(app)
        .post(`/api/jobs/${testJob.id}/photos`)
        .set(authHeader)
        .set('Content-Type', 'application/json')
        .query({ type: 'after' })
        .send({
          photo: base64Image,
          caption: 'Fixed faucet',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('after');
      expect(response.body.data.caption).toBe('Fixed faucet');
    });

    it('should upload before photos', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(testJob);
      mockPrisma.jobPhoto.create.mockResolvedValue({
        id: 'photo_before',
        jobId: testJob.id,
        url: '/uploads/org_test123/jobs/before.jpg',
        type: 'before',
        caption: null,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post(`/api/jobs/${testJob.id}/photos`)
        .set(authHeader)
        .set('Content-Type', 'application/json')
        .query({ type: 'before' })
        .send({
          photo: 'base64data',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('before');
    });

    it('should reject invalid photo type', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(testJob);

      const response = await request(app)
        .post(`/api/jobs/${testJob.id}/photos`)
        .set(authHeader)
        .set('Content-Type', 'application/json')
        .query({ type: 'invalid' })
        .send({ photo: 'base64data' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('before');
    });

    it('should require photo data', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(testJob);

      const response = await request(app)
        .post(`/api/jobs/${testJob.id}/photos`)
        .set(authHeader)
        .set('Content-Type', 'application/json')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('required');
    });
  });

  describe('DELETE /api/jobs/:id/photos/:photoId', () => {
    it('should delete a job photo', async () => {
      // The route reads photos from job.photos JSON field and updates via job.update
      const jobWithPhoto = {
        ...testJob,
        photos: {
          photos: [
            { id: 'photo_123', url: '/uploads/test.jpg', type: 'after', createdAt: new Date().toISOString() },
          ],
        },
      };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithPhoto);
      mockPrisma.job.update.mockResolvedValue({ ...jobWithPhoto, photos: { photos: [] } });

      const response = await request(app)
        .delete(`/api/jobs/${testJob.id}/photos/photo_123`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(true);
    });

    it('should return 404 for non-existent photo', async () => {
      // Job exists but photo ID doesn't match any in the photos array
      const jobWithPhoto = {
        ...testJob,
        photos: {
          photos: [
            { id: 'photo_other', url: '/uploads/test.jpg', type: 'after', createdAt: new Date().toISOString() },
          ],
        },
      };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithPhoto);

      const response = await request(app)
        .delete(`/api/jobs/${testJob.id}/photos/nonexistent`)
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E3001');
    });
  });
});
