/**
 * Estimates Routes Integration Tests
 * Tests for PRD-007: Estimates & Quotes API
 */

import request from 'supertest';
import app from '../index';
import { mockPrisma, testData } from '../tests/mocks/database';

// Mock SMS service
jest.mock('../services/sms', () => ({
  sms: {
    sendTemplated: jest.fn().mockResolvedValue({ success: true }),
  },
}));

import { sms } from '../services/sms';

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

describe('Estimates Routes', () => {
  const authHeader = { Authorization: 'Bearer test_token' };
  const testUser = testData.user();
  const testCustomer = testData.customer();
  const testJob = testData.job();

  // Test estimate with line items
  const testEstimate = {
    id: 'est_test123',
    number: 'EST-001',
    organizationId: 'org_test123',
    customerId: 'cust_test123',
    jobId: 'job_test123',
    status: 'draft',
    subtotal: 150000,
    taxRate: 825,
    taxAmount: 12375,
    total: 162375,
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    sentAt: null,
    viewedAt: null,
    approvedAt: null,
    declinedAt: null,
    approvalSignature: null,
    declineReason: null,
    notes: 'Test estimate notes',
    terms: 'Standard terms',
    publicToken: 'pub_token_test123',
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: testCustomer,
    job: testJob,
    lineItems: [
      {
        id: 'eli_1',
        estimateId: 'est_test123',
        description: 'Labor',
        quantity: 300,
        unitPrice: 8500,
        total: 25500,
        sortOrder: 0,
      },
      {
        id: 'eli_2',
        estimateId: 'est_test123',
        description: 'Parts',
        quantity: 100,
        unitPrice: 124500,
        total: 124500,
        sortOrder: 1,
      },
    ],
  };

  beforeEach(() => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
  });

  describe('GET /api/estimates', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/estimates')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return paginated estimates list', async () => {
      const estimates = [
        { ...testEstimate, id: 'est_1', number: 'EST-001' },
        { ...testEstimate, id: 'est_2', number: 'EST-002' },
      ];

      mockPrisma.estimate.findMany.mockResolvedValue(estimates);
      mockPrisma.estimate.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/estimates')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
    });

    it('should filter estimates by status', async () => {
      mockPrisma.estimate.findMany.mockResolvedValue([testEstimate]);
      mockPrisma.estimate.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/estimates?status=draft')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.estimate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: testUser.organizationId,
            status: 'draft',
          }),
        })
      );
    });

    it('should filter estimates by customerId', async () => {
      mockPrisma.estimate.findMany.mockResolvedValue([testEstimate]);
      mockPrisma.estimate.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/estimates?customerId=cust_test123')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.estimate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 'cust_test123',
          }),
        })
      );
    });
  });

  describe('GET /api/estimates/:id', () => {
    it('should return estimate by ID with line items', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(testEstimate);

      const response = await request(app)
        .get(`/api/estimates/${testEstimate.id}`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testEstimate.id);
      expect(response.body.data.number).toBe('EST-001');
      expect(response.body.data.lineItems).toBeDefined();
    });

    it('should return 404 for non-existent estimate', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/estimates/nonexistent')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E3001');
    });
  });

  describe('POST /api/estimates', () => {
    const newEstimateData = {
      customerId: 'cust_test123',
      jobId: 'job_test123',
      lineItems: [
        { description: 'Labor', quantity: 300, unitPrice: 8500, total: 25500 },
        { description: 'Parts', quantity: 100, unitPrice: 124500, total: 124500 },
      ],
      notes: 'New estimate',
      taxRate: 825,
    };

    it('should create a new estimate with line items', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(testCustomer);
      mockPrisma.job.findFirst.mockResolvedValue(testJob);
      mockPrisma.estimate.findFirst.mockResolvedValue(null); // No existing estimates
      mockPrisma.estimate.create.mockResolvedValue(testEstimate);
      mockPrisma.estimateLineItem.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.estimate.findUnique.mockResolvedValue(testEstimate);

      const response = await request(app)
        .post('/api/estimates')
        .set(authHeader)
        .send(newEstimateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should reject if customer not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/estimates')
        .set(authHeader)
        .send(newEstimateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Customer not found');
    });

    it('should reject if job not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(testCustomer);
      mockPrisma.job.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/estimates')
        .set(authHeader)
        .send(newEstimateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Job not found');
    });
  });

  describe('PATCH /api/estimates/:id', () => {
    it('should update a draft estimate', async () => {
      const updatedEstimate = { ...testEstimate, notes: 'Updated notes' };
      mockPrisma.estimate.findFirst.mockResolvedValue(testEstimate);
      mockPrisma.estimateLineItem.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.estimateLineItem.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.estimate.update.mockResolvedValue(updatedEstimate);

      const response = await request(app)
        .patch(`/api/estimates/${testEstimate.id}`)
        .set(authHeader)
        .send({ notes: 'Updated notes' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject updating non-draft estimate', async () => {
      const sentEstimate = { ...testEstimate, status: 'sent' };
      mockPrisma.estimate.findFirst.mockResolvedValue(sentEstimate);

      const response = await request(app)
        .patch(`/api/estimates/${testEstimate.id}`)
        .set(authHeader)
        .send({ notes: 'Updated notes' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E5001');
    });

    it('should return 404 for non-existent estimate', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/estimates/nonexistent')
        .set(authHeader)
        .send({ notes: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/estimates/:id/void', () => {
    it('should void a draft estimate', async () => {
      const voidedEstimate = { ...testEstimate, status: 'voided' };
      mockPrisma.estimate.findFirst.mockResolvedValue(testEstimate);
      mockPrisma.estimate.update.mockResolvedValue(voidedEstimate);

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/void`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('voided');
    });

    it('should reject voiding already voided estimate', async () => {
      const voidedEstimate = { ...testEstimate, status: 'voided' };
      mockPrisma.estimate.findFirst.mockResolvedValue(voidedEstimate);

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/void`)
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E5001');
    });

    it('should reject voiding approved estimate', async () => {
      const approvedEstimate = { ...testEstimate, status: 'approved' };
      mockPrisma.estimate.findFirst.mockResolvedValue(approvedEstimate);

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/void`)
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/estimates/:id/send', () => {
    it('should mark draft estimate as sent', async () => {
      const sentEstimate = {
        ...testEstimate,
        status: 'sent',
        sentAt: new Date(),
      };
      mockPrisma.estimate.findFirst.mockResolvedValue(testEstimate);
      mockPrisma.estimate.update.mockResolvedValue(sentEstimate);

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/send`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('sent');
      expect(response.body.publicUrl).toBeDefined();
    });

    it('should reject sending non-draft estimate', async () => {
      const sentEstimate = { ...testEstimate, status: 'sent' };
      mockPrisma.estimate.findFirst.mockResolvedValue(sentEstimate);

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/send`)
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E5001');
    });
  });

  describe('POST /api/estimates/:id/convert', () => {
    it('should convert approved estimate to invoice', async () => {
      const approvedEstimate = { ...testEstimate, status: 'approved' };
      const newInvoice = {
        id: 'inv_new123',
        organizationId: 'org_test123',
        jobId: 'job_test123',
        customerId: 'cust_test123',
        estimateId: 'est_test123',
        status: 'draft',
        subtotal: testEstimate.subtotal,
        tax: testEstimate.taxAmount,
        total: testEstimate.total,
      };

      mockPrisma.estimate.findFirst.mockResolvedValue(approvedEstimate);
      mockPrisma.estimate.update.mockResolvedValue({ ...approvedEstimate, status: 'converted' });
      mockPrisma.invoice.create.mockResolvedValue(newInvoice);

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/convert`)
        .set(authHeader)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.estimateId).toBe(testEstimate.id);
    });

    it('should reject converting non-approved estimate', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(testEstimate); // status: draft

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/convert`)
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E5001');
    });

    it('should reject converting estimate without job', async () => {
      const estimateWithoutJob = { ...testEstimate, status: 'approved', jobId: null };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimateWithoutJob);

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/convert`)
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E5002');
    });
  });

  describe('Estimate Number Generation', () => {
    it('should generate sequential estimate numbers per organization', async () => {
      // First estimate
      mockPrisma.customer.findFirst.mockResolvedValue(testCustomer);
      mockPrisma.job.findFirst.mockResolvedValue(testJob);
      mockPrisma.estimate.findFirst
        .mockResolvedValueOnce(null) // No existing estimates for number generation
        .mockResolvedValueOnce({ number: 'EST-001' }); // After first create, return EST-001

      const firstEstimate = { ...testEstimate, number: 'EST-001' };
      mockPrisma.estimate.create.mockResolvedValue(firstEstimate);
      mockPrisma.estimateLineItem.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.estimate.findUnique.mockResolvedValue(firstEstimate);

      const response1 = await request(app)
        .post('/api/estimates')
        .set(authHeader)
        .send({
          customerId: 'cust_test123',
          jobId: 'job_test123',
          lineItems: [{ description: 'Test', quantity: 100, unitPrice: 1000, total: 1000 }],
        })
        .expect(201);

      expect(response1.body.data.number).toBe('EST-001');
    });
  });

  describe('POST /api/estimates/:id/request-deposit', () => {
    const approvedEstimate = {
      ...testEstimate,
      status: 'approved',
      total: 100000, // $1000.00
      depositRequested: false,
      depositInvoiceId: null,
      depositRequestedAt: null,
      organization: { id: 'org_test123', name: 'Test Business' },
    };

    const depositInvoice = {
      id: 'inv_deposit123',
      organizationId: 'org_test123',
      customerId: 'cust_test123',
      jobId: 'job_test123',
      estimateId: 'est_test123',
      status: 'sent',
      subtotal: 50000,
      tax: 0,
      total: 50000,
      isDeposit: true,
      depositRequired: 50000,
      sentAt: new Date(),
      customer: { id: 'cust_test123', firstName: 'John', lastName: 'Doe', phone: '+15551234567' },
    };

    beforeEach(() => {
      (sms.sendTemplated as jest.Mock).mockClear();
    });

    it('should create deposit invoice from approved estimate with default 50%', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(approvedEstimate);
      mockPrisma.invoice.create.mockResolvedValue(depositInvoice);
      mockPrisma.estimate.update.mockResolvedValue({
        ...approvedEstimate,
        depositRequested: true,
        depositInvoiceId: depositInvoice.id,
      });

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/request-deposit`)
        .set(authHeader)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.depositInvoice).toBeDefined();
      expect(response.body.data.depositInvoice.isDeposit).toBe(true);
      expect(response.body.data.estimate.depositRequested).toBe(true);
    });

    it('should use custom deposit percentage', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(approvedEstimate);
      mockPrisma.invoice.create.mockResolvedValue({
        ...depositInvoice,
        subtotal: 25000,
        total: 25000,
        depositRequired: 25000,
      });
      mockPrisma.estimate.update.mockResolvedValue({
        ...approvedEstimate,
        depositRequested: true,
      });

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/request-deposit`)
        .set(authHeader)
        .send({ depositPercentage: 25 })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total: 25000, // 25% of 100000
            isDeposit: true,
          }),
        })
      );
    });

    it('should use fixed deposit amount when provided', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(approvedEstimate);
      mockPrisma.invoice.create.mockResolvedValue({
        ...depositInvoice,
        subtotal: 30000,
        total: 30000,
        depositRequired: 30000,
      });
      mockPrisma.estimate.update.mockResolvedValue({
        ...approvedEstimate,
        depositRequested: true,
      });

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/request-deposit`)
        .set(authHeader)
        .send({ depositAmount: 30000 })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total: 30000,
            isDeposit: true,
          }),
        })
      );
    });

    it('should reject if estimate not approved', async () => {
      const draftEstimate = { ...approvedEstimate, status: 'draft' };
      mockPrisma.estimate.findFirst.mockResolvedValue(draftEstimate);

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/request-deposit`)
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E5001');
      expect(response.body.error.message).toContain('approved');
    });

    it('should reject if deposit already requested', async () => {
      const alreadyRequestedEstimate = {
        ...approvedEstimate,
        depositRequested: true,
        depositInvoiceId: 'inv_existing',
      };
      mockPrisma.estimate.findFirst.mockResolvedValue(alreadyRequestedEstimate);

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/request-deposit`)
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E5002');
      expect(response.body.error.message).toContain('already been requested');
    });

    it('should reject if deposit amount exceeds total', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(approvedEstimate);

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/request-deposit`)
        .set(authHeader)
        .send({ depositAmount: 150000 }) // Exceeds 100000 total
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E5003');
      expect(response.body.error.message).toContain('cannot exceed');
    });

    it('should return 404 for non-existent estimate', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/estimates/nonexistent/request-deposit')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E3001');
    });

    it('should send SMS with deposit payment link', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(approvedEstimate);
      mockPrisma.invoice.create.mockResolvedValue(depositInvoice);
      mockPrisma.estimate.update.mockResolvedValue({
        ...approvedEstimate,
        depositRequested: true,
      });

      await request(app)
        .post(`/api/estimates/${testEstimate.id}/request-deposit`)
        .set(authHeader)
        .expect(201);

      expect(sms.sendTemplated).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org_test123',
          customerId: 'cust_test123',
          to: '+15551234567',
          templateType: 'deposit_requested',
          variables: expect.objectContaining({
            customerName: 'John Doe',
            estimateNumber: 'EST-001',
          }),
        })
      );
    });

    it('should succeed even if SMS fails', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(approvedEstimate);
      mockPrisma.invoice.create.mockResolvedValue(depositInvoice);
      mockPrisma.estimate.update.mockResolvedValue({
        ...approvedEstimate,
        depositRequested: true,
      });
      (sms.sendTemplated as jest.Mock).mockRejectedValueOnce(new Error('SMS failed'));

      const response = await request(app)
        .post(`/api/estimates/${testEstimate.id}/request-deposit`)
        .set(authHeader)
        .expect(201);

      // Should still succeed - SMS failure is logged but doesn't fail the request
      expect(response.body.success).toBe(true);
      expect(response.body.data.depositInvoice).toBeDefined();
    });
  });
});
