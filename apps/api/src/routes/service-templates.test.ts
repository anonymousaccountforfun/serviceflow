/**
 * Service Templates Routes Integration Tests
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

describe('Service Templates Routes', () => {
  const authHeader = { Authorization: 'Bearer test_token' };
  const testUser = testData.user();
  const testTemplate = testData.serviceTemplate();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
  });

  describe('GET /api/service-templates', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/service-templates')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return paginated templates list', async () => {
      const templates = [
        { ...testTemplate, id: 'tmpl_1', name: 'Template 1' },
        { ...testTemplate, id: 'tmpl_2', name: 'Template 2' },
      ];

      mockPrisma.serviceTemplate.findMany.mockResolvedValue(templates);
      mockPrisma.serviceTemplate.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/service-templates')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
    });

    it('should filter by category', async () => {
      mockPrisma.serviceTemplate.findMany.mockResolvedValue([testTemplate]);
      mockPrisma.serviceTemplate.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/service-templates?category=Plumbing')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.serviceTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'Plumbing',
          }),
        })
      );
    });

    it('should filter active templates by default', async () => {
      mockPrisma.serviceTemplate.findMany.mockResolvedValue([testTemplate]);
      mockPrisma.serviceTemplate.count.mockResolvedValue(1);

      await request(app)
        .get('/api/service-templates')
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.serviceTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should include inactive templates when active=all', async () => {
      mockPrisma.serviceTemplate.findMany.mockResolvedValue([testTemplate]);
      mockPrisma.serviceTemplate.count.mockResolvedValue(1);

      await request(app)
        .get('/api/service-templates?active=all')
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.serviceTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            isActive: expect.anything(),
          }),
        })
      );
    });
  });

  describe('GET /api/service-templates/categories', () => {
    it('should return distinct categories', async () => {
      mockPrisma.serviceTemplate.findMany.mockResolvedValue([
        { category: 'Plumbing' },
        { category: 'HVAC' },
        { category: 'Electrical' },
      ]);

      const response = await request(app)
        .get('/api/service-templates/categories')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(['Electrical', 'HVAC', 'Plumbing']);
    });

    it('should exclude null categories', async () => {
      mockPrisma.serviceTemplate.findMany.mockResolvedValue([
        { category: 'Plumbing' },
        { category: null },
      ]);

      const response = await request(app)
        .get('/api/service-templates/categories')
        .set(authHeader)
        .expect(200);

      expect(response.body.data).toEqual(['Plumbing']);
    });
  });

  describe('GET /api/service-templates/:id', () => {
    it('should return template by ID', async () => {
      mockPrisma.serviceTemplate.findFirst.mockResolvedValue(testTemplate);

      const response = await request(app)
        .get(`/api/service-templates/${testTemplate.id}`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testTemplate.id);
      expect(response.body.data.name).toBe('Standard Drain Cleaning');
    });

    it('should return 404 for non-existent template', async () => {
      mockPrisma.serviceTemplate.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/service-templates/nonexistent')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E3001');
    });
  });

  describe('POST /api/service-templates', () => {
    // quantity is * 100 for precision (100 = 1.0 unit)
    // total = (quantity / 100) * unitPrice = quantity * unitPrice / 100
    // But since we store quantity * 100, total = quantity * unitPrice / 100 would be messy
    // Actually: total = (quantity_scaled / 100) * unitPrice
    // For quantity=100 (1 unit) at unitPrice=25000 cents, total = 1 * 25000 = 25000
    const newTemplateData = {
      name: 'Water Heater Install',
      description: 'Standard water heater installation',
      lineItems: [
        { description: 'Labor', quantity: 1, unitPrice: 25000, total: 25000 },
        { description: 'Materials', quantity: 1, unitPrice: 50000, total: 50000 },
      ],
      category: 'Plumbing',
    };

    it('should create a new template', async () => {
      mockPrisma.serviceTemplate.findUnique.mockResolvedValue(null); // No duplicate
      mockPrisma.serviceTemplate.create.mockResolvedValue({
        id: 'tmpl_new',
        organizationId: 'org_test123',
        ...newTemplateData,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/service-templates')
        .set(authHeader)
        .send(newTemplateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Water Heater Install');
    });

    it('should reject duplicate name', async () => {
      mockPrisma.serviceTemplate.findUnique.mockResolvedValue(testTemplate);

      const response = await request(app)
        .post('/api/service-templates')
        .set(authHeader)
        .send({ ...newTemplateData, name: testTemplate.name })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E2004');
      expect(response.body.error.message).toContain('already exists');
    });

    it('should validate line item totals', async () => {
      const invalidData = {
        name: 'Invalid Template',
        lineItems: [
          { description: 'Labor', quantity: 100, unitPrice: 1000, total: 9999 }, // Wrong total
        ],
      };

      const response = await request(app)
        .post('/api/service-templates')
        .set(authHeader)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E2001');
      expect(response.body.error.message).toContain('mismatch');
    });

    it('should require at least one line item', async () => {
      const response = await request(app)
        .post('/api/service-templates')
        .set(authHeader)
        .send({ name: 'Empty Template', lineItems: [] })
        .expect(500); // Zod validation error

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/service-templates/:id', () => {
    it('should update template', async () => {
      const updatedTemplate = { ...testTemplate, name: 'Updated Name' };
      mockPrisma.serviceTemplate.findFirst.mockResolvedValue(testTemplate);
      mockPrisma.serviceTemplate.findUnique.mockResolvedValue(null); // No duplicate
      mockPrisma.serviceTemplate.update.mockResolvedValue(updatedTemplate);

      const response = await request(app)
        .patch(`/api/service-templates/${testTemplate.id}`)
        .set(authHeader)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should reject duplicate name on update', async () => {
      const otherTemplate = { ...testTemplate, id: 'tmpl_other', name: 'Other Template' };
      mockPrisma.serviceTemplate.findFirst.mockResolvedValue(testTemplate);
      mockPrisma.serviceTemplate.findUnique.mockResolvedValue(otherTemplate); // Name already exists

      const response = await request(app)
        .patch(`/api/service-templates/${testTemplate.id}`)
        .set(authHeader)
        .send({ name: 'Other Template' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E2004');
    });

    it('should return 404 for non-existent template', async () => {
      mockPrisma.serviceTemplate.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/service-templates/nonexistent')
        .set(authHeader)
        .send({ name: 'New Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E3001');
    });

    it('should allow deactivating template', async () => {
      mockPrisma.serviceTemplate.findFirst.mockResolvedValue(testTemplate);
      mockPrisma.serviceTemplate.update.mockResolvedValue({
        ...testTemplate,
        isActive: false,
      });

      const response = await request(app)
        .patch(`/api/service-templates/${testTemplate.id}`)
        .set(authHeader)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });
  });

  describe('DELETE /api/service-templates/:id', () => {
    it('should soft delete template', async () => {
      mockPrisma.serviceTemplate.findFirst.mockResolvedValue(testTemplate);
      mockPrisma.serviceTemplate.update.mockResolvedValue({
        ...testTemplate,
        isActive: false,
      });

      const response = await request(app)
        .delete(`/api/service-templates/${testTemplate.id}`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(true);
      expect(mockPrisma.serviceTemplate.update).toHaveBeenCalledWith({
        where: { id: testTemplate.id },
        data: { isActive: false },
      });
    });

    it('should return 404 for non-existent template', async () => {
      mockPrisma.serviceTemplate.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/service-templates/nonexistent')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E3001');
    });
  });
});
