/**
 * Health Routes Integration Tests
 */

import request from 'supertest';
import app from '../index';
import { mockPrisma } from '../tests/mocks/database';

describe('Health Routes', () => {
  describe('GET /health', () => {
    it('should return 200 and healthy status when database is connected', async () => {
      mockPrisma.$queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.services).toEqual({
        database: 'connected',
        api: 'running',
      });
    });

    it('should return 503 when database is disconnected', async () => {
      mockPrisma.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body.services.database).toBe('disconnected');
    });
  });
});
