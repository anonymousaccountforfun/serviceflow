/**
 * Push Notifications Service
 *
 * Handles Web Push notifications using VAPID (Voluntary Application Server Identification)
 * for delivering real-time notifications to users across multiple devices.
 */

import webpush from 'web-push';
import { prisma } from '@serviceflow/database';
import { logger } from '../lib/logger';

// Notification types
export type NotificationType =
  | 'incoming_call'
  | 'missed_call'
  | 'new_message'
  | 'job_assigned'
  | 'job_updated'
  | 'appointment_reminder'
  | 'payment_received';

export interface PushNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  tag?: string;
  url?: string;
  priority?: 'high' | 'normal';
  actions?: Array<{ action: string; title: string }>;
  data?: Record<string, unknown>;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Lazy initialization of VAPID configuration
let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:support@serviceflow.com';

  if (!publicKey || !privateKey) {
    logger.warn('VAPID keys not configured - push notifications disabled');
    return false;
  }

  try {
    webpush.setVapidDetails(email, publicKey, privateKey);
    vapidConfigured = true;
    logger.info('VAPID configured successfully');
    return true;
  } catch (error) {
    logger.error('Failed to configure VAPID', error);
    return false;
  }
}

export function isConfigured(): boolean {
  return ensureVapidConfigured();
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export async function subscribe(
  userId: string,
  subscription: PushSubscriptionInput,
  userAgent?: string
): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
      lastUsedAt: new Date(),
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    },
  });
  logger.info('Push subscription created/updated', { userId });
}

export async function unsubscribe(endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  logger.info('Push subscription removed', { endpoint: endpoint.substring(0, 50) });
}

export async function unsubscribeAll(userId: string): Promise<number> {
  const result = await prisma.pushSubscription.deleteMany({ where: { userId } });
  logger.info('All push subscriptions removed for user', { userId, count: result.count });
  return result.count;
}

async function shouldSendNotification(userId: string, type: NotificationType): Promise<boolean> {
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (!prefs) return true;
  const typeMapping: Record<NotificationType, keyof typeof prefs> = {
    incoming_call: 'incomingCall',
    missed_call: 'missedCall',
    new_message: 'newMessage',
    job_assigned: 'jobAssigned',
    job_updated: 'jobUpdated',
    appointment_reminder: 'appointmentReminder',
    payment_received: 'paymentReceived',
  };
  return prefs[typeMapping[type]] as boolean;
}

async function isQuietHours(userId: string): Promise<boolean> {
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (!prefs?.quietHoursStart || !prefs?.quietHoursEnd) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMin] = prefs.quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = prefs.quietHoursEnd.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  if (startMinutes > endMinutes) return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export async function sendPushNotification(
  userId: string,
  notification: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  if (!ensureVapidConfigured()) {
    logger.warn('Push notification skipped - VAPID not configured');
    return { sent: 0, failed: 0 };
  }

  const shouldSend = await shouldSendNotification(userId, notification.type);
  if (!shouldSend) {
    logger.debug('Push notification skipped - user preference disabled', { userId, type: notification.type });
    return { sent: 0, failed: 0 };
  }

  if (notification.priority !== 'high') {
    const quiet = await isQuietHours(userId);
    if (quiet) {
      logger.debug('Push notification skipped - quiet hours', { userId, type: notification.type });
      return { sent: 0, failed: 0 };
    }
  }

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) {
    logger.debug('No push subscriptions for user', { userId });
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const payload = JSON.stringify(notification);

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      await prisma.pushSubscription.update({ where: { id: sub.id }, data: { lastUsedAt: new Date() } });
      sent++;
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
        logger.info('Expired push subscription removed', { subscriptionId: sub.id });
      } else {
        logger.error('Failed to send push notification', { subscriptionId: sub.id, error: error.message, statusCode: error.statusCode });
      }
      failed++;
    }
  }

  logger.info('Push notifications sent', { userId, sent, failed, total: subscriptions.length });
  return { sent, failed };
}

export async function sendTestNotification(userId: string): Promise<boolean> {
  const result = await sendPushNotification(userId, {
    type: 'new_message',
    title: 'Test Notification',
    body: 'Push notifications are working!',
    tag: 'test',
    priority: 'high',
  });
  return result.sent > 0;
}

export async function getPreferences(userId: string) {
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (!prefs) {
    return {
      incomingCall: true, missedCall: true, newMessage: true, jobAssigned: true,
      jobUpdated: false, appointmentReminder: true, paymentReceived: true,
      quietHoursStart: null, quietHoursEnd: null,
    };
  }
  return {
    incomingCall: prefs.incomingCall, missedCall: prefs.missedCall, newMessage: prefs.newMessage,
    jobAssigned: prefs.jobAssigned, jobUpdated: prefs.jobUpdated,
    appointmentReminder: prefs.appointmentReminder, paymentReceived: prefs.paymentReceived,
    quietHoursStart: prefs.quietHoursStart, quietHoursEnd: prefs.quietHoursEnd,
  };
}

export async function updatePreferences(
  userId: string,
  preferences: {
    incomingCall?: boolean; missedCall?: boolean; newMessage?: boolean; jobAssigned?: boolean;
    jobUpdated?: boolean; appointmentReminder?: boolean; paymentReceived?: boolean;
    quietHoursStart?: string | null; quietHoursEnd?: string | null;
  }
): Promise<void> {
  await prisma.notificationPreference.upsert({
    where: { userId },
    update: preferences,
    create: { userId, ...preferences },
  });
  logger.info('Notification preferences updated', { userId });
}

export const pushNotifications = {
  isConfigured, getVapidPublicKey, subscribe, unsubscribe, unsubscribeAll,
  sendPushNotification, sendTestNotification, getPreferences, updatePreferences,
};
