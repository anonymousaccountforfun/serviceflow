/**
 * Push Notification Routes
 *
 * Handles push subscription management and notification preferences.
 */

import { Router } from 'express';
import { z } from 'zod';
import { pushNotifications } from '../services/push-notifications';
import { logger } from '../lib/logger';

const router = Router();

// Validation schemas
const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const preferencesSchema = z.object({
  incomingCall: z.boolean().optional(),
  missedCall: z.boolean().optional(),
  newMessage: z.boolean().optional(),
  jobAssigned: z.boolean().optional(),
  jobUpdated: z.boolean().optional(),
  appointmentReminder: z.boolean().optional(),
  paymentReceived: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
});

// GET /api/push/vapid-public-key - Get VAPID public key for client
router.get('/vapid-public-key', (req, res) => {
  const publicKey = pushNotifications.getVapidPublicKey();
  
  if (!publicKey) {
    return res.status(503).json({
      success: false,
      error: { code: 'E8001', message: 'Push notifications not configured' },
    });
  }

  res.json({ success: true, data: { publicKey } });
});

// POST /api/push/subscribe - Subscribe to push notifications
router.post('/subscribe', async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const subscription = subscribeSchema.parse(req.body);
    const userAgent = req.headers['user-agent'];

    await pushNotifications.subscribe(userId, subscription, userAgent);

    res.status(201).json({
      success: true,
      data: { subscribed: true },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: 'Invalid subscription data', details: error.errors },
      });
    }
    logger.error('Error subscribing to push notifications', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to subscribe to push notifications' },
    });
  }
});

// DELETE /api/push/subscribe - Unsubscribe from push notifications
router.delete('/subscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: 'Endpoint is required' },
      });
    }

    await pushNotifications.unsubscribe(endpoint);

    res.json({
      success: true,
      data: { unsubscribed: true },
    });
  } catch (error) {
    logger.error('Error unsubscribing from push notifications', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to unsubscribe from push notifications' },
    });
  }
});

// DELETE /api/push/subscribe/all - Unsubscribe all devices
router.delete('/subscribe/all', async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const count = await pushNotifications.unsubscribeAll(userId);

    res.json({
      success: true,
      data: { unsubscribed: count },
    });
  } catch (error) {
    logger.error('Error unsubscribing all devices', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to unsubscribe all devices' },
    });
  }
});

// GET /api/push/preferences - Get notification preferences
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const preferences = await pushNotifications.getPreferences(userId);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Error getting notification preferences', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get notification preferences' },
    });
  }
});

// PATCH /api/push/preferences - Update notification preferences
router.patch('/preferences', async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const preferences = preferencesSchema.parse(req.body);

    await pushNotifications.updatePreferences(userId, preferences);
    const updated = await pushNotifications.getPreferences(userId);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: 'Invalid preferences data', details: error.errors },
      });
    }
    logger.error('Error updating notification preferences', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to update notification preferences' },
    });
  }
});

// POST /api/push/test - Send test notification
router.post('/test', async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const success = await pushNotifications.sendTestNotification(userId);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: { code: 'E8002', message: 'No active subscriptions found or push not configured' },
      });
    }

    res.json({
      success: true,
      data: { sent: true },
    });
  } catch (error) {
    logger.error('Error sending test notification', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to send test notification' },
    });
  }
});

export default router;
