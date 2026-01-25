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
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
  upsert: jest.fn(),
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
  googleCredential: createMockMethods(),
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
};
