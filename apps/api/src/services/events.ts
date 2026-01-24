/**
 * Event Service
 *
 * Central event bus for domain events. Enables decoupled, event-driven architecture.
 * Events are persisted to the database for audit trail and replay capability.
 */

import { prisma } from '@serviceflow/database';
import { EventEmitter } from 'events';

// ============================================
// EVENT TYPES
// ============================================

export type DomainEventType =
  // Call events
  | 'call.started'
  | 'call.answered'
  | 'call.completed'
  | 'call.missed'
  | 'call.voicemail'
  // SMS events
  | 'sms.received'
  | 'sms.sent'
  | 'sms.delivered'
  | 'sms.failed'
  // Customer events
  | 'customer.created'
  | 'customer.updated'
  // Job events
  | 'job.created'
  | 'job.updated'
  | 'job.scheduled'
  | 'job.started'
  | 'job.completed'
  | 'job.canceled'
  // Estimate events
  | 'estimate.created'
  | 'estimate.sent'
  | 'estimate.viewed'
  | 'estimate.signed'
  | 'estimate.declined'
  | 'estimate.expired'
  // Invoice events
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'invoice.overdue'
  // Appointment events
  | 'appointment.created'
  | 'appointment.confirmed'
  | 'appointment.reminder_sent'
  | 'appointment.on_my_way'
  | 'appointment.completed'
  | 'appointment.canceled'
  | 'appointment.no_show'
  // Review events
  | 'review.request_sent'
  | 'review.sentiment_received'
  | 'review.received'
  | 'review.response_sent'
  // Conversation events
  | 'conversation.created'
  | 'conversation.message_received'
  | 'conversation.message_sent'
  | 'conversation.resolved';

export interface DomainEvent<T = unknown> {
  id?: string;
  type: DomainEventType;
  organizationId: string;
  aggregateType: string;
  aggregateId: string;
  data: T;
  metadata?: {
    userId?: string;
    source?: string;
    correlationId?: string;
    [key: string]: unknown;
  };
  timestamp?: Date;
}

// ============================================
// EVENT DATA TYPES
// ============================================

export interface CallMissedEventData {
  callId: string;
  customerId: string | null;
  from: string;
  to: string;
  duration: number;
  status: 'no_answer' | 'busy' | 'voicemail';
}

export interface SmsReceivedEventData {
  messageId: string;
  conversationId: string;
  customerId: string;
  from: string;
  to: string;
  content: string;
}

export interface SmsSentEventData {
  messageId: string;
  conversationId: string;
  customerId: string;
  to: string;
  content: string;
  templateType?: string;
}

export interface JobCompletedEventData {
  jobId: string;
  customerId: string;
  actualValue: number | null;
  technicianId: string | null;
}

// ============================================
// EVENT EMITTER
// ============================================

class EventService {
  private emitter: EventEmitter;
  private handlers: Map<DomainEventType, Array<(event: DomainEvent) => Promise<void>>>;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100); // Allow many listeners
    this.handlers = new Map();
  }

  /**
   * Emit a domain event
   * Persists to database and triggers handlers
   */
  async emit<T>(event: DomainEvent<T>): Promise<string> {
    // Persist event to database
    const savedEvent = await prisma.event.create({
      data: {
        organizationId: event.organizationId,
        type: event.type,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        data: event.data as any,
        metadata: event.metadata as any,
      },
    });

    console.log(`📣 Event emitted: ${event.type} (${savedEvent.id})`);

    // Trigger handlers asynchronously (fire and forget for now)
    // In production, use a job queue for reliability
    this.processHandlers(event.type, { ...event, id: savedEvent.id }).catch((err) => {
      console.error(`Error processing handlers for ${event.type}:`, err);
    });

    return savedEvent.id;
  }

  /**
   * Register an event handler
   */
  on<T = unknown>(eventType: DomainEventType, handler: (event: DomainEvent<T>) => Promise<void>): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler as (event: DomainEvent) => Promise<void>);
    this.handlers.set(eventType, handlers);
    console.log(`📌 Handler registered for: ${eventType}`);
  }

  /**
   * Register handler for multiple event types
   */
  onMany(
    eventTypes: DomainEventType[],
    handler: (event: DomainEvent) => Promise<void>
  ): void {
    for (const eventType of eventTypes) {
      this.on(eventType, handler);
    }
  }

  /**
   * Process all handlers for an event type
   */
  private async processHandlers(eventType: DomainEventType, event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(eventType) || [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Handler error for ${eventType}:`, error);
        // In production, log to error tracking service
      }
    }

    // Mark event as processed
    if (event.id) {
      await prisma.event.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
    }
  }

  /**
   * Replay events from a specific point
   * Useful for rebuilding state or debugging
   */
  async replay(
    organizationId: string,
    fromDate: Date,
    eventTypes?: DomainEventType[]
  ): Promise<number> {
    const events = await prisma.event.findMany({
      where: {
        organizationId,
        createdAt: { gte: fromDate },
        ...(eventTypes && { type: { in: eventTypes } }),
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`🔄 Replaying ${events.length} events from ${fromDate.toISOString()}`);

    for (const event of events) {
      await this.processHandlers(event.type as DomainEventType, {
        id: event.id,
        type: event.type as DomainEventType,
        organizationId: event.organizationId,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        data: event.data,
        metadata: event.metadata as DomainEvent['metadata'],
      });
    }

    return events.length;
  }
}

// Singleton instance
export const events = new EventService();

export default events;
