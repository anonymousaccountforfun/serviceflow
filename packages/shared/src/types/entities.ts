// ============================================
// ORGANIZATION
// ============================================
export interface Organization {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  email?: string;
  address?: Address;
  timezone: string;
  settings: OrganizationSettings;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  businessHours: BusinessHours;
  serviceArea: ServiceArea;
  aiSettings: AISettings;
  notificationSettings: NotificationSettings;
  brandingSettings: BrandingSettings;
}

export interface BusinessHours {
  monday: DayHours | null;
  tuesday: DayHours | null;
  wednesday: DayHours | null;
  thursday: DayHours | null;
  friday: DayHours | null;
  saturday: DayHours | null;
  sunday: DayHours | null;
}

export interface DayHours {
  open: string; // HH:mm format
  close: string;
}

export interface ServiceArea {
  zipCodes: string[];
  cities: string[];
  radius?: number; // miles from address
}

export interface AISettings {
  // Existing fields
  voiceEnabled: boolean;
  textEnabled: boolean;
  voiceId?: string;
  greeting?: string;
  escalationKeywords: string[];
  quietHoursStart?: string; // HH:mm
  quietHoursEnd?: string;

  // V1 Fields - Services
  servicesOffered?: string[];
  servicesNotOffered?: string[];

  // V1 Fields - After Hours
  afterHoursBehavior?: 'emergency_only' | 'full_service' | 'message_only';

  // V1 Fields - Callback Promises
  emergencyCallbackMinutes?: number;
  nonEmergencyCallbackMinutes?: number;

  // V1 Fields - Pricing
  serviceCallFee?: number; // cents
  freeEstimates?: boolean;

  // V1 Fields - Compliance
  recordingDisclosure?: boolean;
  recordingDisclosureText?: string;
}

export interface NotificationSettings {
  smsEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  notifyOnNewLead: boolean;
  notifyOnBooking: boolean;
  notifyOnReview: boolean;
  notifyOnPayment: boolean;
}

export interface BrandingSettings {
  logoUrl?: string;
  primaryColor?: string;
  companyTagline?: string;
}

export type SubscriptionTier = 'starter' | 'growth' | 'scale';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

// ============================================
// USER
// ============================================
export interface User {
  id: string;
  organizationId: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'owner' | 'admin' | 'technician' | 'viewer';

// ============================================
// CUSTOMER
// ============================================
export interface Customer {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: Address;
  notes?: string;
  tags: string[];
  source: CustomerSource;
  lifetimeValue: number;
  jobCount: number;
  lastContactAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export type CustomerSource = 
  | 'phone_inbound'
  | 'phone_ai'
  | 'sms_inbound'
  | 'web_form'
  | 'referral'
  | 'google'
  | 'yelp'
  | 'manual'
  | 'import';

// ============================================
// PHONE NUMBER
// ============================================
export interface PhoneNumber {
  id: string;
  organizationId: string;
  number: string;
  twilioSid: string;
  type: PhoneNumberType;
  label?: string;
  forwardTo?: string;
  isActive: boolean;
  createdAt: Date;
}

export type PhoneNumberType = 'main' | 'tracking' | 'sms_only';

// ============================================
// CONVERSATION
// ============================================
export interface Conversation {
  id: string;
  organizationId: string;
  customerId: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  assignedToId?: string;
  lastMessageAt: Date;
  aiHandled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationChannel = 'sms' | 'phone' | 'email' | 'web_form';
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'archived';

// ============================================
// MESSAGE
// ============================================
export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  senderType: SenderType;
  senderId?: string;
  content: string;
  contentType: ContentType;
  metadata?: MessageMetadata;
  status: MessageStatus;
  createdAt: Date;
}

export type MessageDirection = 'inbound' | 'outbound';
export type SenderType = 'customer' | 'user' | 'ai' | 'system';
export type ContentType = 'text' | 'image' | 'audio' | 'document';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageMetadata {
  twilioSid?: string;
  errorCode?: string;
  errorMessage?: string;
}

// ============================================
// CALL
// ============================================
export interface Call {
  id: string;
  conversationId: string;
  organizationId: string;
  customerId?: string;
  direction: CallDirection;
  status: CallStatus;
  from: string;
  to: string;
  duration?: number; // seconds
  recordingUrl?: string;
  transcriptUrl?: string;
  transcript?: string;
  summary?: string;
  aiHandled: boolean;
  twilioSid: string;
  vapiCallId?: string;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
}

export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 
  | 'ringing'
  | 'in_progress'
  | 'completed'
  | 'busy'
  | 'no_answer'
  | 'failed'
  | 'voicemail';

// ============================================
// JOB
// ============================================
export interface Job {
  id: string;
  organizationId: string;
  customerId: string;
  assignedToId?: string;
  title: string;
  description?: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedValue?: number;
  actualValue?: number;
  notes?: string;
  photos: JobPhoto[];
  createdAt: Date;
  updatedAt: Date;
}

export type JobType = 
  | 'repair'
  | 'installation'
  | 'maintenance'
  | 'inspection'
  | 'emergency'
  | 'estimate'
  | 'other';

export type JobStatus = 
  | 'lead'
  | 'quoted'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'canceled'
  | 'on_hold';

export type JobPriority = 'low' | 'normal' | 'high' | 'emergency';

export interface JobPhoto {
  id: string;
  url: string;
  type: 'before' | 'after' | 'other';
  caption?: string;
  createdAt: Date;
}

// ============================================
// ESTIMATE
// ============================================
export interface Estimate {
  id: string;
  jobId: string;
  organizationId: string;
  customerId: string;
  status: EstimateStatus;
  lineItems: EstimateLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  validUntil?: Date;
  sentAt?: Date;
  viewedAt?: Date;
  signedAt?: Date;
  signatureUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EstimateStatus = 
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined'
  | 'expired';

export interface EstimateLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  tier?: 'good' | 'better' | 'best';
}

// ============================================
// INVOICE
// ============================================
export interface Invoice {
  id: string;
  jobId: string;
  estimateId?: string;
  organizationId: string;
  customerId: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  dueDate?: Date;
  sentAt?: Date;
  paidAt?: Date;
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceStatus = 
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'paid'
  | 'partial'
  | 'overdue'
  | 'canceled'
  | 'refunded';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ============================================
// APPOINTMENT
// ============================================
export interface Appointment {
  id: string;
  jobId: string;
  organizationId: string;
  customerId: string;
  assignedToId?: string;
  scheduledAt: Date;
  scheduledEndAt: Date;
  status: AppointmentStatus;
  reminderSentAt?: Date;
  onMyWaySentAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AppointmentStatus = 
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'canceled'
  | 'no_show'
  | 'rescheduled';

// ============================================
// REVIEW
// ============================================
export interface Review {
  id: string;
  organizationId: string;
  customerId?: string;
  jobId?: string;
  platform: ReviewPlatform;
  externalId?: string;
  rating: number;
  content?: string;
  reviewerName?: string;
  response?: string;
  respondedAt?: Date;
  requestSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewPlatform = 'google' | 'yelp' | 'facebook' | 'internal';

// ============================================
// REVIEW REQUEST
// ============================================
export interface ReviewRequest {
  id: string;
  organizationId: string;
  customerId: string;
  jobId: string;
  status: ReviewRequestStatus;
  sentAt?: Date;
  sentimentResponse?: number;
  clickedAt?: Date;
  reviewId?: string;
  createdAt: Date;
}

export type ReviewRequestStatus = 
  | 'pending'
  | 'sent'
  | 'clicked'
  | 'completed'
  | 'declined'
  | 'opted_out';

// ============================================
// SEQUENCE
// ============================================
export interface Sequence {
  id: string;
  organizationId: string;
  name: string;
  type: SequenceType;
  trigger: SequenceTrigger;
  isActive: boolean;
  steps: SequenceStep[];
  createdAt: Date;
  updatedAt: Date;
}

export type SequenceType = 
  | 'estimate_followup'
  | 'review_request'
  | 'payment_reminder'
  | 'appointment_reminder'
  | 'maintenance_reminder'
  | 'custom';

export interface SequenceTrigger {
  event: string;
  conditions?: Record<string, unknown>;
}

export interface SequenceStep {
  id: string;
  order: number;
  delayMinutes: number;
  action: SequenceAction;
  template: string;
  conditions?: SequenceCondition[];
}

export type SequenceAction = 'send_sms' | 'send_email' | 'create_task' | 'webhook';

export interface SequenceCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt';
  value: unknown;
}

// ============================================
// SEQUENCE ENROLLMENT
// ============================================
export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  organizationId: string;
  customerId: string;
  referenceId: string; // jobId, estimateId, etc.
  referenceType: string;
  status: EnrollmentStatus;
  currentStepIndex: number;
  nextStepAt?: Date;
  completedAt?: Date;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type EnrollmentStatus = 'active' | 'completed' | 'canceled' | 'paused';

// ============================================
// RELATION TYPES
// These interfaces extend base entities with optional relations
// that may be included when the API returns related data.
// ============================================

export interface CustomerWithRelations extends Customer {
  jobs?: Job[];
  conversations?: Conversation[];
  appointments?: Appointment[];
  _count?: {
    jobs?: number;
    conversations?: number;
    appointments?: number;
  };
}

export interface JobWithRelations extends Job {
  customer?: Customer;
  assignedTo?: User;
  appointments?: Appointment[];
  estimates?: Estimate[];
  invoices?: Invoice[];
}

export interface ConversationWithRelations extends Conversation {
  customer?: Customer;
  assignedTo?: User;
  messages?: Message[];
}

export interface AppointmentWithRelations extends Appointment {
  job?: Job;
  customer?: Customer;
  assignedTo?: User;
}

export interface ReviewWithRelations extends Review {
  customer?: Customer;
  job?: Job;
}

export interface EstimateWithRelations extends Estimate {
  job?: Job;
  customer?: Customer;
}

export interface InvoiceWithRelations extends Invoice {
  job?: Job;
  customer?: Customer;
  estimate?: Estimate;
}
