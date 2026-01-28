/**
 * ServiceFlow TypeScript Type Definitions for Client-Side
 *
 * This file re-exports types from @serviceflow/shared with Serialized<T>
 * applied to convert Date fields to strings (as they appear in JSON responses).
 *
 * Types also include optional relation fields that the API may include.
 */

import type { Serialized } from '@serviceflow/shared';
import type {
  // Settings types
  OrganizationSettings as OrgSettingsBase,
  BusinessHours,
  DayHours,
  NotificationSettings,
  AISettings,
  BrandingSettings,
  ServiceArea,
  Address,
  // Enums
  SubscriptionTier,
  SubscriptionStatus,
  UserRole,
  CustomerSource,
  ConversationChannel,
  ConversationStatus,
  MessageDirection,
  SenderType,
  ContentType,
  MessageStatus,
  JobType,
  JobStatus,
  JobPriority,
  AppointmentStatus,
  ReviewPlatform,
  PhoneNumberType,
  EstimateStatus,
  InvoiceStatus,
  // API types
  ApiResponse,
  ApiError,
  ApiMeta,
  CreateCustomerRequest,
  CreateJobRequest,
  UpdateJobRequest,
  CreateAppointmentRequest,
} from '@serviceflow/shared';

// Re-export enums and simple types directly
export type {
  SubscriptionTier,
  SubscriptionStatus,
  UserRole,
  CustomerSource,
  ConversationChannel,
  ConversationStatus,
  MessageDirection,
  SenderType,
  ContentType,
  MessageStatus,
  JobType,
  JobStatus,
  JobPriority,
  AppointmentStatus,
  ReviewPlatform,
  PhoneNumberType,
  EstimateStatus,
  InvoiceStatus,
  // Settings (no Date fields)
  BusinessHours,
  DayHours,
  NotificationSettings,
  AISettings,
  BrandingSettings,
  ServiceArea,
  // API types
  ApiResponse,
  ApiError,
  ApiMeta,
  CreateCustomerRequest,
  CreateJobRequest,
  UpdateJobRequest,
  CreateAppointmentRequest,
};

// ============================================
// ORGANIZATION SETTINGS
// Extended with web-specific optional fields for backwards compat
// ============================================

export interface OrganizationSettings extends OrgSettingsBase {
  // Legacy fields used during onboarding
  onboardingCompleted?: boolean;
  firstJobCompleted?: boolean;
  smsEnabled?: boolean;
  aiAssistantEnabled?: boolean;
  twilioPhoneNumber?: string;
  googleConnected?: boolean;
  yelpConnected?: boolean;
  stripeConnected?: boolean;
  // Allow additional unknown properties
  [key: string]: unknown;
}

// ============================================
// ADDRESS TYPE
// Keep customer address structure compatible with legacy code
// ============================================

export interface CustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

// Re-export shared Address type for use with newer fields
export type { Address };

// ============================================
// CORE ENTITIES WITH RELATIONS
// These include optional relation fields that APIs may return
// ============================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  email?: string | null;
  timezone: string;
  settings: OrganizationSettings;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
}

export interface Customer {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
  address?: CustomerAddress | null;
  notes?: string | null;
  tags: string[];
  source: CustomerSource;
  lifetimeValue: number;
  jobCount: number;
  lastContactAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations (optional, included when API returns them)
  jobs?: Job[];
  conversations?: Conversation[];
}

export interface Job {
  id: string;
  organizationId: string;
  customerId: string;
  assignedToId?: string | null;
  title: string;
  description?: string | null;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  estimatedValue?: number | null;
  actualValue?: number | null;
  notes?: string | null;
  photos: string[];
  createdAt: string;
  updatedAt: string;
  // Relations (optional)
  customer?: Customer;
  assignedTo?: User;
  appointments?: Appointment[];
}

export interface Appointment {
  id: string;
  jobId: string;
  organizationId: string;
  customerId: string;
  assignedToId?: string | null;
  scheduledAt: string;
  scheduledEndAt: string;
  status: AppointmentStatus;
  reminderSentAt?: string | null;
  onMyWaySentAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations (optional)
  job?: Job;
  customer?: Customer;
  assignedTo?: User;
}

export interface Conversation {
  id: string;
  organizationId: string;
  customerId: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  assignedToId?: string | null;
  lastMessageAt: string;
  aiHandled: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations (optional)
  customer?: Customer;
  assignedTo?: User;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  senderType: SenderType;
  senderId?: string | null;
  content: string;
  createdAt: string;
  // Relations (optional)
  sender?: User;
}

export interface Review {
  id: string;
  organizationId: string;
  customerId?: string | null;
  jobId?: string | null;
  platform: ReviewPlatform;
  externalId?: string | null;
  rating: number;
  content?: string | null;
  reviewerName?: string | null;
  response?: string | null;
  respondedAt?: string | null;
  requestSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations (optional)
  customer?: Customer;
  job?: Job;
}

export interface PhoneNumber {
  id: string;
  organizationId: string;
  number: string;
  twilioSid: string;
  type: PhoneNumberType;
  label: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PAGINATION
// ============================================

export type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

// ============================================
// FORM/INPUT TYPES
// ============================================

export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: CustomerAddress;
  notes?: string;
  tags?: string[];
  source?: CustomerSource;
}

export interface CreateJobInput {
  customerId: string;
  title: string;
  description?: string;
  type?: JobType;
  status?: JobStatus;
  priority?: JobPriority;
  scheduledAt?: string;
  estimatedValue?: number;
  assignedToId?: string;
  notes?: string;
}

export interface UpdateJobInput {
  title?: string;
  description?: string;
  type?: JobType;
  status?: JobStatus;
  priority?: JobPriority;
  scheduledAt?: string;
  estimatedValue?: number;
  actualValue?: number;
  assignedToId?: string;
  notes?: string;
}

export interface CreateAppointmentInput {
  jobId: string;
  scheduledAt: string;
  scheduledEndAt: string;
  assignedToId?: string;
  notes?: string;
}

// ============================================
// PHONE NUMBERS
// ============================================

export interface PhoneStatus {
  twilioConfigured: boolean;
  hasPhoneNumber: boolean;
  hasMainNumber: boolean;
  phoneNumbers: Array<{
    id: string;
    number: string;
    type: PhoneNumberType;
    label: string;
    isExternal: boolean;
  }>;
}

export interface AvailablePhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}
