import { z } from 'zod';

// ============================================
// COMMON VALIDATORS
// ============================================
export const phoneSchema = z.string().regex(
  /^\+?[1-9]\d{1,14}$/,
  'Invalid phone number format. Use E.164 format (e.g., +15551234567)'
);

export const emailSchema = z.string().email('Invalid email address');

export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2-letter code'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  country: z.string().default('US'),
});

// Base pagination schema without sortBy (use entity-specific schemas below)
const basePaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Generic pagination for backwards compatibility (no sort)
export const paginationSchema = basePaginationSchema;

// Job-specific pagination with validated sortBy allowlist
export const jobPaginationSchema = basePaginationSchema.extend({
  sortBy: z.enum(['createdAt', 'updatedAt', 'scheduledAt', 'title', 'status', 'priority']).optional().default('createdAt'),
});

// Customer-specific pagination with validated sortBy allowlist
export const customerPaginationSchema = basePaginationSchema.extend({
  sortBy: z.enum(['createdAt', 'updatedAt', 'firstName', 'lastName', 'phone']).optional().default('createdAt'),
});

// Review-specific pagination with validated sortBy allowlist
export const reviewPaginationSchema = basePaginationSchema.extend({
  sortBy: z.enum(['createdAt', 'rating', 'platform']).optional().default('createdAt'),
});

// Message-specific pagination with validated sortBy allowlist
export const messagePaginationSchema = basePaginationSchema.extend({
  sortBy: z.enum(['createdAt', 'sentAt']).optional().default('createdAt'),
});

// ============================================
// CUSTOMER VALIDATORS
// ============================================
export const customerSourceSchema = z.enum([
  'phone_inbound',
  'phone_ai',
  'sms_inbound',
  'web_form',
  'referral',
  'google',
  'yelp',
  'manual',
  'import',
]);

export const createCustomerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: phoneSchema,
  email: emailSchema.optional(),
  address: addressSchema.optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).default([]),
  source: customerSourceSchema.optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ============================================
// JOB VALIDATORS
// ============================================
export const jobTypeSchema = z.enum([
  'repair',
  'installation',
  'maintenance',
  'inspection',
  'emergency',
  'estimate',
  'other',
]);

export const jobStatusSchema = z.enum([
  'lead',
  'quoted',
  'scheduled',
  'in_progress',
  'completed',
  'canceled',
  'on_hold',
]);

export const jobPrioritySchema = z.enum(['low', 'normal', 'high', 'emergency']);

export const createJobSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  type: jobTypeSchema,
  priority: jobPrioritySchema.default('normal'),
  scheduledAt: z.string().datetime().optional(),
  assignedToId: z.string().uuid().optional(),
  estimatedValue: z.number().positive().optional(),
});

export const updateJobSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  type: jobTypeSchema.optional(),
  status: jobStatusSchema.optional(),
  priority: jobPrioritySchema.optional(),
  scheduledAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  estimatedValue: z.number().positive().optional(),
  actualValue: z.number().positive().optional(),
  notes: z.string().max(5000).optional(),
});

// ============================================
// ESTIMATE VALIDATORS
// ============================================
export const estimateLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  tier: z.enum(['good', 'better', 'best']).optional(),
});

export const createEstimateSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  lineItems: z.array(estimateLineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().max(2000).optional(),
  validUntil: z.string().datetime().optional(),
  taxRate: z.number().min(0).max(1).default(0),
});

export const sendEstimateSchema = z.object({
  estimateId: z.string().uuid('Invalid estimate ID'),
  method: z.enum(['sms', 'email', 'both']),
  message: z.string().max(500).optional(),
});

// ============================================
// MESSAGE VALIDATORS
// ============================================
export const sendMessageSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  content: z.string().min(1, 'Message content is required').max(1600),
  channel: z.enum(['sms', 'email']).default('sms'),
});

// ============================================
// APPOINTMENT VALIDATORS
// ============================================
export const createAppointmentSchema = z.object({
  jobId: z.string().min(1, 'Invalid job ID'),
  scheduledAt: z.string().datetime('Invalid date/time'),
  scheduledEndAt: z.string().datetime().optional(),
  assignedToId: z.string().min(1).optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => {
    if (data.scheduledEndAt) {
      return new Date(data.scheduledEndAt) > new Date(data.scheduledAt);
    }
    return true;
  },
  { message: 'End time must be after start time', path: ['scheduledEndAt'] }
);

export const rescheduleAppointmentSchema = z.object({
  scheduledAt: z.string().datetime('Invalid date/time'),
  scheduledEndAt: z.string().datetime().optional(),
  reason: z.string().max(500).optional(),
});

// ============================================
// REVIEW VALIDATORS
// ============================================
export const requestReviewSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  jobId: z.string().uuid('Invalid job ID'),
  delay: z.number().int().min(0).max(10080).default(120), // max 1 week in minutes
});

export const respondToReviewSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
  response: z.string().min(1, 'Response is required').max(1000),
});

// ============================================
// ORGANIZATION SETTINGS VALIDATORS
// ============================================
export const dayHoursSchema = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  close: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
}).refine(
  (data) => data.close > data.open,
  { message: 'Close time must be after open time' }
);

export const businessHoursSchema = z.object({
  monday: dayHoursSchema.nullable(),
  tuesday: dayHoursSchema.nullable(),
  wednesday: dayHoursSchema.nullable(),
  thursday: dayHoursSchema.nullable(),
  friday: dayHoursSchema.nullable(),
  saturday: dayHoursSchema.nullable(),
  sunday: dayHoursSchema.nullable(),
});

export const serviceAreaSchema = z.object({
  zipCodes: z.array(z.string().regex(/^\d{5}$/, 'Invalid ZIP code')).default([]),
  cities: z.array(z.string()).default([]),
  radius: z.number().positive().optional(),
});

export const aiSettingsSchema = z.object({
  voiceEnabled: z.boolean().default(true),
  textEnabled: z.boolean().default(true),
  voiceId: z.string().optional(),
  greeting: z.string().max(500).optional(),
  escalationKeywords: z.array(z.string()).default([]),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
});

export const updateOrganizationSettingsSchema = z.object({
  businessHours: businessHoursSchema.optional(),
  serviceArea: serviceAreaSchema.optional(),
  aiSettings: aiSettingsSchema.optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type CreateEstimateInput = z.infer<typeof createEstimateSchema>;
export type SendEstimateInput = z.infer<typeof sendEstimateSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type RequestReviewInput = z.infer<typeof requestReviewSchema>;
export type RespondToReviewInput = z.infer<typeof respondToReviewSchema>;
export type UpdateOrganizationSettingsInput = z.infer<typeof updateOrganizationSettingsSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type JobPaginationInput = z.infer<typeof jobPaginationSchema>;
export type CustomerPaginationInput = z.infer<typeof customerPaginationSchema>;
export type ReviewPaginationInput = z.infer<typeof reviewPaginationSchema>;
export type MessagePaginationInput = z.infer<typeof messagePaginationSchema>;
