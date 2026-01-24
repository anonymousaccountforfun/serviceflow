/**
 * Webhook Logging Service
 *
 * Logs all incoming webhooks for debugging and audit trail.
 */

import { prisma } from '@serviceflow/database';

export interface LogWebhookOptions {
  organizationId?: string;
  provider: string;
  eventType: string;
  externalId?: string;
  payload: unknown;
  headers?: Record<string, string>;
}

export async function logWebhook(options: LogWebhookOptions): Promise<string> {
  const log = await prisma.webhookLog.create({
    data: {
      organizationId: options.organizationId,
      provider: options.provider,
      eventType: options.eventType,
      externalId: options.externalId,
      payload: options.payload as any,
      headers: options.headers as any,
      status: 'received',
    },
  });

  return log.id;
}

export async function markWebhookProcessed(
  id: string,
  error?: string
): Promise<void> {
  await prisma.webhookLog.update({
    where: { id },
    data: {
      status: error ? 'failed' : 'processed',
      processedAt: new Date(),
      error,
    },
  });
}

export async function markWebhookIgnored(id: string): Promise<void> {
  await prisma.webhookLog.update({
    where: { id },
    data: {
      status: 'ignored',
      processedAt: new Date(),
    },
  });
}
