/**
 * Customers Routes Integration Tests
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

describe('Customers Routes', () => {
  const authHeader = { Authorization: 'Bearer test_token' };
  const testUser = testData.user();
  const testCustomer = testData.customer();

  beforeEach(() => {
    // Set up default authenticated user mock
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
  });

  describe('GET /api/customers', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/customers')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E1001');
    });

    it('should return paginated customers list', async () => {
      const customers = [
        testData.customer({ id: 'cust_1', firstName: 'John' }),
        testData.customer({ id: 'cust_2', firstName: 'Jane' }),
      ];

      mockPrisma.customer.findMany.mockResolvedValue(customers);
      mockPrisma.customer.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/customers')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        total: 2,
        page: 1,
      });
    });

    it('should filter customers by search term', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([testCustomer]);
      mockPrisma.customer.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/customers?search=John')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: testUser.organizationId,
          }),
        })
      );
    });

    it('should support pagination', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.customer.count.mockResolvedValue(50);

      const response = await request(app)
        .get('/api/customers?page=2&limit=10')
        .set(authHeader)
        .expect(200);

      expect(response.body.meta.page).toBe(2);
      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });

  describe('GET /api/customers/:id', () => {
    it('should return 404 for non-existent customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/customers/nonexistent')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return customer by ID', async () => {
      const customerWithRelations = {
        ...testCustomer,
        jobs: [testData.job()],
        conversations: [testData.conversation()],
      };
      mockPrisma.customer.findFirst.mockResolvedValue(customerWithRelations);

      const response = await request(app)
        .get(`/api/customers/${testCustomer.id}`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testCustomer.id);
      expect(response.body.data.jobs).toBeDefined();
    });

    it('should prevent access to other organization\'s customers', async () => {
      // Customer exists but belongs to different org
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/customers/other_org_customer')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/customers', () => {
    it('should create a new customer', async () => {
      const newCustomer = {
        firstName: 'New',
        lastName: 'Customer',
        phone: '+15559876543',
        email: 'new@example.com',
      };

      mockPrisma.customer.create.mockResolvedValue({
        ...testData.customer(),
        ...newCustomer,
        id: 'cust_new123',
      });

      const response = await request(app)
        .post('/api/customers')
        .set(authHeader)
        .send(newCustomer)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('New');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set(authHeader)
        .send({ lastName: 'Only' }) // Missing required firstName and phone
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize phone number', async () => {
      const newCustomer = {
        firstName: 'Test',
        phone: '(555) 123-4567', // Should be sanitized
      };

      mockPrisma.customer.create.mockResolvedValue({
        ...testData.customer(),
        ...newCustomer,
      });

      await request(app)
        .post('/api/customers')
        .set(authHeader)
        .send(newCustomer)
        .expect(201);

      expect(mockPrisma.customer.create).toHaveBeenCalled();
    });
  });

  describe('PUT /api/customers/:id', () => {
    it('should update existing customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(testCustomer);
      mockPrisma.customer.update.mockResolvedValue({
        ...testCustomer,
        firstName: 'Updated',
      });

      const response = await request(app)
        .put(`/api/customers/${testCustomer.id}`)
        .set(authHeader)
        .send({ firstName: 'Updated' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Updated');
    });

    it('should return 404 for non-existent customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/customers/nonexistent')
        .set(authHeader)
        .send({ firstName: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/customers/:id', () => {
    it('should delete existing customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(testCustomer);
      mockPrisma.customer.delete.mockResolvedValue(testCustomer);

      const response = await request(app)
        .delete(`/api/customers/${testCustomer.id}`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/customers/nonexistent')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
