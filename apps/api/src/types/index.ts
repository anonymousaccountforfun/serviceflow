/**
 * API Type Definitions
 *
 * Shared types for the API layer.
 */

import { Prisma } from '@serviceflow/database';

// ============================================
// ORGANIZATION SETTINGS
// ============================================

export interface BusinessHours {
  open: string; // HH:mm format
  close: string; // HH:mm format
}

export interface AISettings {
  enabled?: boolean;
  voiceEnabled?: boolean;
  smsEnabled?: boolean;
  greeting?: string;
  quietHoursStart?: number; // Hour 0-23
  quietHoursEnd?: number; // Hour 0-23
  responseDelay?: number; // Seconds
}

export interface ReviewSettings {
  googleReviewUrl?: string;
  autoRequestEnabled?: boolean;
  delayHours?: number;
}

export interface PhoneSetup {
  provisioned?: boolean;
  twilioPhoneNumber?: string;
  useExisting?: boolean;
  externalPhoneNumber?: string;
}

export interface OrganizationSettings {
  businessHours?: Record<string, BusinessHours | null>;
  aiSettings?: AISettings;
  reviewSettings?: ReviewSettings;
  phoneSetup?: PhoneSetup;
}

// ============================================
// PRISMA QUERY HELPERS
// ============================================

/**
 * Type-safe where clause builder for common filters
 */
export interface CustomerWhereInput {
  organizationId: string;
  id?: string;
  phone?: string;
  source?: string;
  createdAt?: { gte?: Date; lte?: Date };
}

export interface JobWhereInput {
  organizationId: string;
  id?: string;
  customerId?: string;
  status?: string;
  type?: string;
  assignedToId?: string;
  createdAt?: { gte?: Date; lte?: Date };
  completedAt?: { gte?: Date; lte?: Date };
}

export interface ConversationWhereInput {
  organizationId: string;
  id?: string;
  customerId?: string;
  channel?: 'sms' | 'voice' | 'email';
  status?: string | { in: string[] };
  createdAt?: { gte?: Date; lte?: Date };
}

export interface AppointmentWhereInput {
  organizationId: string;
  id?: string;
  jobId?: string;
  customerId?: string;
  assignedToId?: string | null;
  status?: string | { in?: string[]; notIn?: string[] };
  scheduledAt?: { gte?: Date; lte?: Date; lt?: Date };
}

export interface CallWhereInput {
  organizationId: string;
  id?: string;
  customerId?: string;
  status?: string | { in?: string[] };
  direction?: 'inbound' | 'outbound';
  aiHandled?: boolean;
  createdAt?: { gte?: Date; lte?: Date };
}

// ============================================
// PRISMA GROUPBY RESULT TYPES
// ============================================

export interface GroupByCount {
  _count: number;
}

export interface StatusGroupBy extends GroupByCount {
  status: string;
}

export interface ChannelGroupBy extends GroupByCount {
  channel: string;
}

export interface DirectionGroupBy extends GroupByCount {
  direction: string;
}

export interface SourceGroupBy extends GroupByCount {
  source: string | null;
}

export interface TypeGroupBy extends GroupByCount {
  type: string;
  _sum?: { actualValue: number | null };
}

export interface AIHandledGroupBy extends GroupByCount {
  aiHandled: boolean;
}

// ============================================
// API REQUEST TYPES
// ============================================

export interface PaginationQuery {
  page?: string;
  perPage?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeQuery {
  period?: 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Parse organization settings from database JSON
 */
export function parseOrgSettings(settings: Prisma.JsonValue | null): OrganizationSettings {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return {};
  }
  return settings as OrganizationSettings;
}

/**
 * Type guard for checking if value is non-null
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
