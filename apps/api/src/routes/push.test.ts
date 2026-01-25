/**
 * Push Routes Integration Tests
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

// Mock web-push
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({}),
}));

describe('Push Routes', () => {
  const authHeader = { Authorization: 'Bearer test_token' };
  const testUser = testData.user();
  const testSubscription = testData.pushSubscription();
  const testPreferences = testData.notificationPreference();

  beforeEach(() => {
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
    // Set VAPID keys for tests
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
  });

  describe('GET /api/push/vapid-public-key', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/push/vapid-public-key')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E1001');
    });

    it('should return VAPID public key', async () => {
      const response = await request(app)
        .get('/api/push/vapid-public-key')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.publicKey).toBe('test-public-key');
    });

    it('should return 503 when VAPID not configured', async () => {
      delete process.env.VAPID_PUBLIC_KEY;

      const response = await request(app)
        .get('/api/push/vapid-public-key')
        .set(authHeader)
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E8001');
    });
  });

  describe('POST /api/push/subscribe', () => {
    const validSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-secret',
      },
    };

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/push/subscribe')
        .send(validSubscription)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should subscribe to push notifications', async () => {
      mockPrisma.pushSubscription.upsert.mockResolvedValue(testSubscription);

      const response = await request(app)
        .post('/api/push/subscribe')
        .set(authHeader)
        .send(validSubscription)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscribed).toBe(true);
      expect(mockPrisma.pushSubscription.upsert).toHaveBeenCalled();
    });

    it('should reject invalid subscription data', async () => {
      const response = await request(app)
        .post('/api/push/subscribe')
        .set(authHeader)
        .send({ endpoint: 'not-a-url' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E2001');
    });
  });

  describe('DELETE /api/push/subscribe', () => {
    it('should unsubscribe from push notifications', async () => {
      mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });

      const response = await request(app)
        .delete('/api/push/subscribe')
        .set(authHeader)
        .send({ endpoint: 'https://fcm.googleapis.com/fcm/send/test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.unsubscribed).toBe(true);
    });

    it('should return 400 without endpoint', async () => {
      const response = await request(app)
        .delete('/api/push/subscribe')
        .set(authHeader)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E2001');
    });
  });

  describe('DELETE /api/push/subscribe/all', () => {
    it('should unsubscribe all devices', async () => {
      mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 3 });

      const response = await request(app)
        .delete('/api/push/subscribe/all')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.unsubscribed).toBe(3);
    });
  });

  describe('GET /api/push/preferences', () => {
    it('should return notification preferences', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(testPreferences);

      const response = await request(app)
        .get('/api/push/preferences')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        incomingCall: true,
        missedCall: true,
        newMessage: true,
      });
    });

    it('should return defaults when no preferences set', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/push/preferences')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.incomingCall).toBe(true);
      expect(response.body.data.jobUpdated).toBe(false);
    });
  });

  describe('PATCH /api/push/preferences', () => {
    it('should update notification preferences', async () => {
      const updatedPrefs = { ...testPreferences, jobUpdated: true };
      mockPrisma.notificationPreference.upsert.mockResolvedValue(updatedPrefs);
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(updatedPrefs);

      const response = await request(app)
        .patch('/api/push/preferences')
        .set(authHeader)
        .send({ jobUpdated: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalled();
    });

    it('should set quiet hours', async () => {
      const prefsWithQuietHours = {
        ...testPreferences,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      };
      mockPrisma.notificationPreference.upsert.mockResolvedValue(prefsWithQuietHours);
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(prefsWithQuietHours);

      const response = await request(app)
        .patch('/api/push/preferences')
        .set(authHeader)
        .send({ quietHoursStart: '22:00', quietHoursEnd: '07:00' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quietHoursStart).toBe('22:00');
    });

    it('should reject invalid quiet hours format', async () => {
      const response = await request(app)
        .patch('/api/push/preferences')
        .set(authHeader)
        .send({ quietHoursStart: '10pm' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E2001');
    });
  });

  describe('POST /api/push/test', () => {
    it('should send test notification', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(testPreferences);
      mockPrisma.pushSubscription.findMany.mockResolvedValue([testSubscription]);
      mockPrisma.pushSubscription.update.mockResolvedValue(testSubscription);

      const response = await request(app)
        .post('/api/push/test')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sent).toBe(true);
    });

    it('should return error when no subscriptions', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(testPreferences);
      mockPrisma.pushSubscription.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/push/test')
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E8002');
    });
  });
});
