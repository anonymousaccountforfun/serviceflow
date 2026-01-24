// ============================================
// API RESPONSE WRAPPERS
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  perPage?: number;
  total?: number;
  totalPages?: number;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// WEBHOOK PAYLOADS
// ============================================
export interface TwilioVoiceWebhook {
  AccountSid: string;
  ApiVersion: string;
  CallSid: string;
  CallStatus: string;
  Called: string;
  CalledCity?: string;
  CalledCountry?: string;
  CalledState?: string;
  CalledZip?: string;
  Caller: string;
  CallerCity?: string;
  CallerCountry?: string;
  CallerState?: string;
  CallerZip?: string;
  Direction: string;
  From: string;
  To: string;
  CallDuration?: string;
  RecordingUrl?: string;
  RecordingSid?: string;
  Digits?: string;
}

export interface TwilioSmsWebhook {
  AccountSid: string;
  ApiVersion: string;
  Body: string;
  From: string;
  FromCity?: string;
  FromCountry?: string;
  FromState?: string;
  FromZip?: string;
  MessageSid: string;
  NumMedia: string;
  NumSegments: string;
  SmsMessageSid: string;
  SmsSid: string;
  SmsStatus: string;
  To: string;
  ToCity?: string;
  ToCountry?: string;
  ToState?: string;
  ToZip?: string;
}

export interface TwilioStatusCallback {
  AccountSid: string;
  MessageSid: string;
  MessageStatus: 'queued' | 'sending' | 'sent' | 'delivered' | 'undelivered' | 'failed';
  ErrorCode?: string;
  ErrorMessage?: string;
}

export interface VapiWebhook {
  type: VapiEventType;
  call?: VapiCall;
  message?: VapiMessage;
  transcript?: VapiTranscript;
}

export type VapiEventType = 
  | 'call.started'
  | 'call.ended'
  | 'message.user'
  | 'message.assistant'
  | 'transcript.complete'
  | 'function.call';

export interface VapiCall {
  id: string;
  orgId: string;
  assistantId: string;
  phoneNumberId: string;
  customer: {
    number: string;
    name?: string;
  };
  status: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  cost?: number;
}

export interface VapiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface VapiTranscript {
  text: string;
  messages: VapiMessage[];
}

export interface StripeWebhook {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

// Customers
export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  notes?: string;
  tags?: string[];
  source?: string;
}

export interface UpdateCustomerRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    street2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  notes?: string;
  tags?: string[];
}

// Jobs
export interface CreateJobRequest {
  customerId: string;
  title: string;
  description?: string;
  type: string;
  priority?: string;
  scheduledAt?: string;
  assignedToId?: string;
  estimatedValue?: number;
}

export interface UpdateJobRequest {
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  scheduledAt?: string;
  assignedToId?: string;
  estimatedValue?: number;
  actualValue?: number;
  notes?: string;
}

// Estimates
export interface CreateEstimateRequest {
  jobId: string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    tier?: 'good' | 'better' | 'best';
  }[];
  notes?: string;
  validUntil?: string;
  taxRate?: number;
}

export interface SendEstimateRequest {
  estimateId: string;
  method: 'sms' | 'email' | 'both';
  message?: string;
}

// Messages
export interface SendMessageRequest {
  customerId: string;
  content: string;
  channel?: 'sms' | 'email';
}

// Appointments
export interface CreateAppointmentRequest {
  jobId: string;
  scheduledAt: string;
  scheduledEndAt?: string;
  assignedToId?: string;
  notes?: string;
}

export interface RescheduleAppointmentRequest {
  scheduledAt: string;
  scheduledEndAt?: string;
  reason?: string;
}

// Reviews
export interface RequestReviewRequest {
  customerId: string;
  jobId: string;
  delay?: number; // minutes to wait before sending
}

export interface RespondToReviewRequest {
  reviewId: string;
  response: string;
}

// AI
export interface AICompletionRequest {
  prompt: string;
  context?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface AICompletionResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Dashboard
export interface DashboardMetrics {
  period: {
    start: string;
    end: string;
  };
  calls: {
    total: number;
    answered: number;
    missed: number;
    answerRate: number;
    avgDuration: number;
  };
  messages: {
    total: number;
    inbound: number;
    outbound: number;
    aiHandled: number;
  };
  leads: {
    total: number;
    converted: number;
    conversionRate: number;
    avgResponseTime: number;
  };
  jobs: {
    total: number;
    completed: number;
    totalValue: number;
    avgValue: number;
  };
  reviews: {
    total: number;
    avgRating: number;
    requestsSent: number;
    conversionRate: number;
  };
  revenue: {
    total: number;
    collected: number;
    outstanding: number;
  };
}
