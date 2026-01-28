/**
 * Payments Routes Integration Tests
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

// Mock Stripe service
jest.mock('../services/stripe', () => ({
  __esModule: true,
  default: {
    isStripeEnabled: jest.fn().mockReturnValue(true),
    createPaymentIntent: jest.fn(),
    getPaymentIntent: jest.fn(),
  },
}));

describe('Payments Routes', () => {
  const authHeader = { Authorization: 'Bearer test_token' };
  const testUser = testData.user();
  const testCustomer = testData.customer();
  const testOrganization = testData.organization();

  const mockPayments = [
    {
      id: 'pay_1',
      invoiceId: 'inv_1',
      organizationId: testOrganization.id,
      customerId: testCustomer.id,
      amount: 10000,
      method: 'card',
      status: 'succeeded',
      createdAt: new Date(),
      invoice: { id: 'inv_1', total: 10000, status: 'paid' },
      customer: { id: testCustomer.id, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    },
    {
      id: 'pay_2',
      invoiceId: 'inv_2',
      organizationId: testOrganization.id,
      customerId: testCustomer.id,
      amount: 5000,
      method: 'cash',
      status: 'succeeded',
      createdAt: new Date(),
      invoice: { id: 'inv_2', total: 5000, status: 'paid' },
      customer: { id: testCustomer.id, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
  });

  describe('GET /api/payments', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/payments')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return paginated payments list', async () => {
      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);
      mockPrisma.payment.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/payments')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
    });

    it('should filter by customerId', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPayments[0]]);
      mockPrisma.payment.count.mockResolvedValue(1);

      const response = await request(app)
        .get(`/api/payments?customerId=${testCustomer.id}`)
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: testCustomer.id,
          }),
        })
      );
    });

    it('should filter by method', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPayments[0]]);
      mockPrisma.payment.count.mockResolvedValue(1);

      await request(app)
        .get('/api/payments?method=card')
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            method: 'card',
          }),
        })
      );
    });

    it('should filter by status', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await request(app)
        .get('/api/payments?status=failed')
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'failed',
          }),
        })
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      await request(app)
        .get(`/api/payments?startDate=${startDate}&endDate=${endDate}`)
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
        })
      );
    });

    it('should filter by invoiceId', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPayments[0]]);
      mockPrisma.payment.count.mockResolvedValue(1);

      await request(app)
        .get('/api/payments?invoiceId=inv_1')
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoiceId: 'inv_1',
          }),
        })
      );
    });

    it('should include related invoice and customer data', async () => {
      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);
      mockPrisma.payment.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/payments')
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            invoice: expect.any(Object),
            customer: expect.any(Object),
          }),
        })
      );

      expect(response.body.data[0].invoice).toBeDefined();
      expect(response.body.data[0].customer).toBeDefined();
    });

    it('should support pagination', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPayments[0]]);
      mockPrisma.payment.count.mockResolvedValue(10);

      const response = await request(app)
        .get('/api/payments?page=2&perPage=1')
        .set(authHeader)
        .expect(200);

      expect(response.body.meta.page).toBe(2);
      expect(response.body.meta.perPage).toBe(1);
      expect(response.body.meta.total).toBe(10);
      expect(response.body.meta.totalPages).toBe(10);

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 1,
        })
      );
    });
  });
});
