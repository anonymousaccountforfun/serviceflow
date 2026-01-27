/**
 * Mock Prisma Client for Testing
 *
 * Provides a mocked version of the Prisma client that can be used
 * in integration tests without hitting a real database.
 */

// Create mock Prisma methods using global jest
const createMockMethods = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
  upsert: jest.fn(),
  createMany: jest.fn(),
});

// Mock Prisma client
export const mockPrisma = {
  user: createMockMethods(),
  organization: createMockMethods(),
  customer: createMockMethods(),
  job: createMockMethods(),
  conversation: createMockMethods(),
  message: createMockMethods(),
  review: createMockMethods(),
  appointment: createMockMethods(),
  estimate: createMockMethods(),
  estimateLineItem: createMockMethods(),
  invoice: createMockMethods(),
  invoiceLineItem: createMockMethods(),
  invoicePayment: createMockMethods(),
  template: createMockMethods(),
  messageTemplate: createMockMethods(),
  googleCredential: createMockMethods(),
  queuedSms: createMockMethods(),
  call: createMockMethods(),
  pushSubscription: createMockMethods(),
  notificationPreference: createMockMethods(),
  phoneNumber: createMockMethods(),
  delayedJob: createMockMethods(),
  smsOptOut: createMockMethods(),
  event: createMockMethods(),
  webhookLog: createMockMethods(),
  $transaction: jest.fn((fn: Function) => fn(mockPrisma)),
};

// Export as prisma for the module mock
export const prisma = mockPrisma;

// Reset all mocks
export function resetMocks() {
  Object.values(mockPrisma).forEach((model) => {
    if (typeof model === 'object') {
      Object.values(model).forEach((method) => {
        if (typeof method === 'function' && 'mockReset' in method) {
          (method as jest.Mock).mockReset();
        }
      });
    } else if (typeof model === 'function' && 'mockReset' in model) {
      (model as jest.Mock).mockReset();
    }
  });

  // Reset $transaction to default behavior
  mockPrisma.$transaction.mockImplementation((fn: Function) => fn(mockPrisma));
}

// Test data factories
export const testData = {
  organization: (overrides = {}) => ({
    id: 'org_test123',
    name: 'Test Organization',
    subscriptionTier: 'growth',
    subscriptionStatus: 'active',
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  user: (overrides = {}) => ({
    id: 'user_test123',
    clerkId: 'clerk_test123',
    organizationId: 'org_test123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'owner',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: testData.organization(),
    ...overrides,
  }),

  customer: (overrides = {}) => ({
    id: 'cust_test123',
    organizationId: 'org_test123',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+15551234567',
    email: 'john@example.com',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    source: 'website',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  job: (overrides = {}) => ({
    id: 'job_test123',
    organizationId: 'org_test123',
    customerId: 'cust_test123',
    title: 'Fix leaking faucet',
    description: 'Kitchen faucet is dripping',
    type: 'repair',
    status: 'lead',
    priority: 'normal',
    estimatedValue: 15000,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: testData.customer(),
    ...overrides,
  }),

  conversation: (overrides = {}) => ({
    id: 'conv_test123',
    organizationId: 'org_test123',
    customerId: 'cust_test123',
    channel: 'sms',
    status: 'open',
    aiHandled: true,
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: testData.customer(),
    ...overrides,
  }),

  message: (overrides = {}) => ({
    id: 'msg_test123',
    conversationId: 'conv_test123',
    content: 'Hello, this is a test message',
    direction: 'inbound',
    senderType: 'customer',
    createdAt: new Date(),
    ...overrides,
  }),

  review: (overrides = {}) => ({
    id: 'rev_test123',
    organizationId: 'org_test123',
    platform: 'google',
    externalId: 'google_review_123',
    rating: 5,
    content: 'Great service!',
    reviewerName: 'Happy Customer',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  pushSubscription: (overrides = {}) => ({
    id: 'push_test123',
    userId: 'user_test123',
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
    p256dh: 'test-p256dh-key',
    auth: 'test-auth-secret',
    userAgent: 'Mozilla/5.0 Test Browser',
    createdAt: new Date(),
    lastUsedAt: new Date(),
    ...overrides,
  }),

  notificationPreference: (overrides = {}) => ({
    id: 'pref_test123',
    userId: 'user_test123',
    incomingCall: true,
    missedCall: true,
    newMessage: true,
    jobAssigned: true,
    jobUpdated: false,
    appointmentReminder: true,
    paymentReceived: true,
    quietHoursStart: null,
    quietHoursEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  phoneNumber: (overrides = {}) => ({
    id: 'phone_test123',
    organizationId: 'org_test123',
    number: '+15551234567',
    twilioSid: 'PN_test123',
    type: 'main',
    label: 'Main Line',
    forwardTo: '+15559876543',
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  }),

  appointment: (overrides = {}) => ({
    id: 'apt_test123',
    organizationId: 'org_test123',
    jobId: 'job_test123',
    customerId: 'cust_test123',
    assignedToId: 'user_test123',
    scheduledAt: new Date(),
    scheduledEndAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours later
    status: 'scheduled',
    reminderSentAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  call: (overrides = {}) => ({
    id: 'call_test123',
    organizationId: 'org_test123',
    customerId: 'cust_test123',
    conversationId: null,
    direction: 'inbound',
    status: 'completed',
    from: '+15551111111',
    to: '+15551234567',
    duration: 120,
    recordingUrl: null,
    transcript: null,
    transcriptUrl: null,
    summary: null,
    aiHandled: false,
    twilioSid: 'CA_test123',
    vapiCallId: 'vapi_call_123',
    textBackSentAt: null,
    textBackMessageId: null,
    startedAt: new Date(),
    endedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  }),

  smsOptOut: (overrides = {}) => ({
    id: 'optout_test123',
    organizationId: 'org_test123',
    phone: '+15551234567',
    source: 'stop_keyword',
    optedOutAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  }),

  messageTemplate: (overrides = {}) => ({
    id: 'tmpl_test123',
    organizationId: 'org_test123',
    type: 'missed_call_textback',
    name: 'Missed Call Text-Back',
    content: 'Hi {{customerName}}! This is {{businessName}}. Sorry we missed your call.',
    isDefault: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  delayedJob: (overrides = {}) => ({
    id: 'job_test123',
    type: 'missed_call_textback',
    organizationId: 'org_test123',
    payload: {},
    processAfter: new Date(),
    maxAttempts: 3,
    attempts: 0,
    lastError: null,
    processedAt: null,
    createdAt: new Date(),
    ...overrides,
  }),

  event: (overrides = {}) => ({
    id: 'evt_test123',
    organizationId: 'org_test123',
    type: 'call.missed',
    aggregateType: 'call',
    aggregateId: 'call_test123',
    data: {},
    metadata: null,
    processedAt: null,
    createdAt: new Date(),
    ...overrides,
  }),
};
