// ServiceFlow TypeScript Type Definitions
// These types mirror the Prisma schema for client-side usage

// ============================================
// ENUMS
// ============================================

export type SubscriptionTier = 'starter' | 'growth' | 'scale';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';
export type UserRole = 'owner' | 'admin' | 'technician' | 'viewer';
export type CustomerSource = 'phone_inbound' | 'phone_ai' | 'sms_inbound' | 'web_form' | 'referral' | 'google' | 'yelp' | 'manual' | 'import';
export type ConversationChannel = 'sms' | 'phone' | 'email' | 'web_form';
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'archived';
export type MessageDirection = 'inbound' | 'outbound';
export type SenderType = 'customer' | 'user' | 'ai' | 'system';
export type JobType = 'repair' | 'installation' | 'maintenance' | 'inspection' | 'emergency' | 'estimate' | 'other';
export type JobStatus = 'lead' | 'quoted' | 'scheduled' | 'in_progress' | 'completed' | 'canceled' | 'on_hold';
export type JobPriority = 'low' | 'normal' | 'high' | 'emergency';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'canceled' | 'no_show' | 'rescheduled';
export type ReviewPlatform = 'google' | 'yelp' | 'facebook' | 'internal';

// ============================================
// CORE ENTITIES
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

export interface OrganizationSettings {
  onboardingCompleted?: boolean;
  businessHours?: BusinessHours;
  smsEnabled?: boolean;
  aiAssistantEnabled?: boolean;
  twilioPhoneNumber?: string;
  googleConnected?: boolean;
  yelpConnected?: boolean;
  stripeConnected?: boolean;
  notificationSettings?: NotificationSettings;
  [key: string]: unknown;
}

export interface BusinessHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  closed?: boolean;
}

export interface NotificationSettings {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  newLeadAlerts?: boolean;
  appointmentReminders?: boolean;
  reviewAlerts?: boolean;
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

// ============================================
// CUSTOMERS
// ============================================

export interface CustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
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

// ============================================
// JOBS
// ============================================

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

// ============================================
// APPOINTMENTS
// ============================================

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

// ============================================
// CONVERSATIONS & MESSAGES
// ============================================

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

// ============================================
// REVIEWS
// ============================================

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

// ============================================
// API RESPONSE TYPES
// ============================================

// Import shared types (avoid duplication)
export type { ApiResponse, ApiError, ApiMeta } from '@serviceflow/shared';

// Alias for backwards compatibility
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

export type PhoneNumberType = 'main' | 'tracking';

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
