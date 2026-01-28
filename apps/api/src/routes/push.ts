/**
 * Push Notification Routes
 *
 * Handles push subscription management and notification preferences.
 */

import { Router } from 'express';
import { z } from 'zod';
import { pushNotifications, type PushSubscriptionInput } from '../services/push-notifications.js';
import { asyncHandler, sendSuccess, sendError, errors } from '../utils/api-response.js';

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
    return errors.serviceUnavailable(res, 'Push notifications');
  }

  sendSuccess(res, { publicKey });
});

// POST /api/push/subscribe - Subscribe to push notifications
router.post('/subscribe', asyncHandler(async (req, res) => {
  const userId = req.auth!.userId;
  const userAgent = req.headers['user-agent'];

  const parseResult = subscribeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return errors.validation(res, 'Invalid subscription data', { details: parseResult.error.errors });
  }

  await pushNotifications.subscribe(userId, parseResult.data as PushSubscriptionInput, userAgent);

  sendSuccess(res, { subscribed: true }, 201);
}));

// DELETE /api/push/subscribe - Unsubscribe from push notifications
router.delete('/subscribe', asyncHandler(async (req, res) => {
  const { endpoint } = req.body;

  if (!endpoint) {
    return errors.validation(res, 'Endpoint is required');
  }

  await pushNotifications.unsubscribe(endpoint);

  sendSuccess(res, { unsubscribed: true });
}));

// DELETE /api/push/subscribe/all - Unsubscribe all devices
router.delete('/subscribe/all', asyncHandler(async (req, res) => {
  const userId = req.auth!.userId;
  const count = await pushNotifications.unsubscribeAll(userId);

  sendSuccess(res, { unsubscribed: count });
}));

// GET /api/push/preferences - Get notification preferences
router.get('/preferences', asyncHandler(async (req, res) => {
  const userId = req.auth!.userId;
  const preferences = await pushNotifications.getPreferences(userId);

  sendSuccess(res, preferences);
}));

// PATCH /api/push/preferences - Update notification preferences
router.patch('/preferences', asyncHandler(async (req, res) => {
  const userId = req.auth!.userId;

  const parseResult = preferencesSchema.safeParse(req.body);
  if (!parseResult.success) {
    return errors.validation(res, 'Invalid preferences data', { details: parseResult.error.errors });
  }

  await pushNotifications.updatePreferences(userId, parseResult.data);
  const updated = await pushNotifications.getPreferences(userId);

  sendSuccess(res, updated);
}));

// POST /api/push/test - Send test notification
router.post('/test', asyncHandler(async (req, res) => {
  const userId = req.auth!.userId;
  const success = await pushNotifications.sendTestNotification(userId);

  if (!success) {
    return errors.validation(res, 'No active subscriptions found or push not configured');
  }

  sendSuccess(res, { sent: true });
}));

export default router;
