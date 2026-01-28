/**
 * Services Index
 *
 * Central export for all services
 */

export { events } from './events';
export type { DomainEvent, DomainEventType } from './events';

export { sms } from './sms';
export type { SendSmsOptions, SendSmsResult } from './sms';

export { email } from './email';
export type { SendEmailOptions, SendEmailResult, ROIReportData } from './email';

export { logWebhook, markWebhookProcessed, markWebhookIgnored } from './webhooks';
