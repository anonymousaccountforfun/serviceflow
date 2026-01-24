// ============================================
// SUBSCRIPTION TIERS
// ============================================
export const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter',
    price: 14900, // cents
    features: [
      'Missed call text-back',
      'Review request automation',
      'GBP optimization',
      'Basic dashboard',
      '1 phone number',
      '500 SMS/month',
    ],
    limits: {
      phoneNumbers: 1,
      smsPerMonth: 500,
      aiMinutesPerMonth: 0,
      users: 2,
    },
  },
  growth: {
    name: 'Growth',
    price: 29900,
    features: [
      'Everything in Starter',
      'AI phone answering',
      'Digital estimates',
      'Follow-up sequences',
      'Unified inbox',
      '3 phone numbers',
      '1500 SMS/month',
      '100 AI minutes/month',
    ],
    limits: {
      phoneNumbers: 3,
      smsPerMonth: 1500,
      aiMinutesPerMonth: 100,
      users: 5,
    },
  },
  scale: {
    name: 'Scale',
    price: 49900,
    features: [
      'Everything in Growth',
      'Advanced analytics',
      'Multi-location support',
      'Custom integrations',
      'Priority support',
      '10 phone numbers',
      'Unlimited SMS',
      '300 AI minutes/month',
    ],
    limits: {
      phoneNumbers: 10,
      smsPerMonth: -1, // unlimited
      aiMinutesPerMonth: 300,
      users: -1, // unlimited
    },
  },
} as const;

// ============================================
// SMS TEMPLATES
// ============================================
export const SMS_TEMPLATES = {
  missedCall: {
    businessHours: `Hi! This is {{businessName}}. Sorry we missed your call - we're currently helping another customer. Reply here or call back and we'll get you taken care of ASAP. What can we help with today?`,
    afterHours: `Hi! This is {{businessName}}. We're closed for the day but wanted to let you know we got your call. We'll reach out first thing tomorrow, or reply here with details and we'll be ready to help.`,
  },
  appointmentReminder: {
    dayBefore: `Reminder: You have an appointment with {{businessName}} tomorrow at {{time}}. Reply C to confirm or R to reschedule.`,
    dayOf: `Your appointment with {{businessName}} is today at {{time}}. We'll text when we're on our way. Reply if you need anything!`,
  },
  onMyWay: `{{technicianName}} from {{businessName}} is on the way! ETA: {{eta}}. They'll arrive in a {{vehicleDescription}}.`,
  reviewRequest: {
    initial: `Thanks for choosing {{businessName}}! How did we do today? Reply 1-5 (5 being amazing!)`,
    positive: `Awesome, thanks! 🙌 Would you mind leaving us a quick Google review? It really helps: {{reviewLink}}`,
    negative: `We're sorry to hear that. What could we have done better? Your feedback helps us improve.`,
  },
  estimateFollowUp: {
    day1: `Hi {{customerName}}, just checking in - did you have a chance to review the estimate we sent? Let us know if you have any questions!`,
    day3: `Following up on your estimate for {{jobTitle}}. Ready to schedule? Just reply here and we'll get you on the calendar.`,
    day7: `Last reminder about your estimate from {{businessName}}. It expires soon - let us know if you'd like to move forward!`,
  },
  paymentReminder: {
    due: `Hi {{customerName}}, friendly reminder that your invoice from {{businessName}} is due. Pay securely here: {{paymentLink}}`,
    overdue: `Your invoice from {{businessName}} is now overdue. Please complete payment to avoid late fees: {{paymentLink}}`,
  },
  maintenanceReminder: `Hi {{customerName}}! It's been {{months}} months since we serviced your {{equipmentType}}. Time for a check-up? Reply to schedule.`,
} as const;

// ============================================
// AI PROMPTS
// ============================================
export const AI_PROMPTS = {
  voiceGreeting: `You are a friendly, professional receptionist for {{businessName}}, a plumbing company in {{serviceArea}}. Your job is to:
1. Greet callers warmly
2. Understand their plumbing issue
3. Collect their name, phone number, and address
4. Determine if it's an emergency
5. Book an appointment if possible
6. Transfer to a human if the caller is upset or the issue is complex

Business hours: {{businessHours}}
Services offered: {{services}}
Service area ZIP codes: {{zipCodes}}

Be conversational and helpful. Don't sound robotic. If you can't help with something, offer to have someone call back.`,

  textResponse: `You are responding to text messages for {{businessName}}, a plumbing company. 
Keep responses brief (under 160 characters when possible), friendly, and helpful.
If you can answer the question, do so. If you need to collect information, ask one question at a time.
If the customer is upset or the issue is complex, let them know someone will call them.

Context about this customer: {{customerContext}}
Recent conversation: {{recentMessages}}`,

  reviewResponse: {
    positive: `Write a brief, warm thank-you response to this positive review. Mention something specific from the review if possible. Keep it under 100 words. Don't be overly effusive.`,
    negative: `Write a professional, empathetic response to this negative review. Apologize for their experience, don't be defensive, and offer to make it right. Ask them to contact us directly. Keep it under 150 words.`,
  },

  estimateSummary: `Summarize this estimate in a friendly text message (under 300 characters). Include the total and main work items.`,

  callSummary: `Summarize this phone call transcript. Include:
- Caller's name and phone (if mentioned)
- The issue they called about
- Any appointment scheduled
- Action items for follow-up
Keep it concise (under 200 words).`,
} as const;

// ============================================
// ERROR CODES
// ============================================
export const ERROR_CODES = {
  // Auth errors (1xxx)
  UNAUTHORIZED: { code: 'E1001', message: 'Authentication required' },
  FORBIDDEN: { code: 'E1002', message: 'Insufficient permissions' },
  INVALID_TOKEN: { code: 'E1003', message: 'Invalid or expired token' },

  // Validation errors (2xxx)
  VALIDATION_ERROR: { code: 'E2001', message: 'Validation failed' },
  INVALID_PHONE: { code: 'E2002', message: 'Invalid phone number format' },
  INVALID_EMAIL: { code: 'E2003', message: 'Invalid email address' },

  // Resource errors (3xxx)
  NOT_FOUND: { code: 'E3001', message: 'Resource not found' },
  ALREADY_EXISTS: { code: 'E3002', message: 'Resource already exists' },
  CONFLICT: { code: 'E3003', message: 'Resource conflict' },

  // External service errors (4xxx)
  TWILIO_ERROR: { code: 'E4001', message: 'Telephony service error' },
  STRIPE_ERROR: { code: 'E4002', message: 'Payment service error' },
  AI_ERROR: { code: 'E4003', message: 'AI service error' },
  GOOGLE_ERROR: { code: 'E4004', message: 'Google API error' },

  // Rate limiting (5xxx)
  RATE_LIMITED: { code: 'E5001', message: 'Rate limit exceeded' },
  QUOTA_EXCEEDED: { code: 'E5002', message: 'Monthly quota exceeded' },

  // Internal errors (9xxx)
  INTERNAL_ERROR: { code: 'E9001', message: 'Internal server error' },
  SERVICE_UNAVAILABLE: { code: 'E9002', message: 'Service temporarily unavailable' },
} as const;

// ============================================
// TIMING CONSTANTS
// ============================================
export const TIMING = {
  // Missed call text-back
  MISSED_CALL_DELAY_MS: 30000, // 30 seconds

  // Review requests
  REVIEW_REQUEST_DEFAULT_DELAY_MS: 7200000, // 2 hours
  REVIEW_FOLLOWUP_DELAY_MS: 259200000, // 3 days

  // Estimate follow-ups
  ESTIMATE_FOLLOWUP_DAY_1_MS: 86400000, // 1 day
  ESTIMATE_FOLLOWUP_DAY_3_MS: 259200000, // 3 days
  ESTIMATE_FOLLOWUP_DAY_7_MS: 604800000, // 7 days

  // Appointment reminders
  APPOINTMENT_REMINDER_DAY_BEFORE_MS: 86400000, // 1 day
  APPOINTMENT_REMINDER_MORNING_HOURS: 3, // 3 hours before

  // Payment reminders
  PAYMENT_REMINDER_DAY_3_MS: 259200000, // 3 days
  PAYMENT_REMINDER_DAY_7_MS: 604800000, // 7 days
  PAYMENT_REMINDER_DAY_14_MS: 1209600000, // 14 days

  // Quiet hours (default)
  QUIET_HOURS_START: '21:00',
  QUIET_HOURS_END: '08:00',

  // Session/token
  ACCESS_TOKEN_EXPIRY_MS: 900000, // 15 minutes
  REFRESH_TOKEN_EXPIRY_MS: 604800000, // 7 days
} as const;

// ============================================
// NASSAU COUNTY SPECIFIC
// ============================================
export const NASSAU_COUNTY = {
  name: 'Nassau County',
  state: 'NY',
  timezone: 'America/New_York',
  zipCodes: [
    '11001', '11002', '11003', '11010', '11020', '11021', '11022', '11023', '11024', '11025',
    '11026', '11027', '11030', '11040', '11042', '11050', '11051', '11052', '11053', '11054',
    '11055', '11096', '11099', '11501', '11507', '11509', '11510', '11514', '11516', '11518',
    '11520', '11530', '11531', '11535', '11536', '11542', '11545', '11547', '11548', '11549',
    '11550', '11551', '11552', '11553', '11554', '11555', '11556', '11557', '11558', '11559',
    '11560', '11561', '11563', '11565', '11566', '11568', '11569', '11570', '11571', '11572',
    '11575', '11576', '11577', '11579', '11580', '11581', '11582', '11590', '11592', '11594',
    '11595', '11596', '11597', '11598', '11599', '11709', '11710', '11714', '11732', '11735',
    '11753', '11756', '11758', '11762', '11765', '11771', '11773', '11783', '11791', '11793',
    '11797', '11801', '11802', '11803', '11804', '11815', '11819', '11853', '11854', '11855',
  ],
  majorCities: [
    'Hempstead', 'Freeport', 'Long Beach', 'Valley Stream', 'Lynbrook',
    'Garden City', 'Mineola', 'Hicksville', 'Levittown', 'East Meadow',
    'Uniondale', 'Franklin Square', 'Oceanside', 'Massapequa', 'Bethpage',
    'Westbury', 'New Hyde Park', 'Manhasset', 'Great Neck', 'Glen Cove',
    'Rockville Centre', 'Baldwin', 'Merrick', 'Bellmore', 'Wantagh',
  ],
} as const;
