/**
 * Test data factories for AI Voice V1 tests
 */

// ============================================
// ORGANIZATION FACTORIES
// ============================================

export const createTestOrganization = (overrides = {}) => ({
  id: 'test-org-id',
  name: 'Test Plumbing Co',
  settings: {
    aiSettings: {
      voiceEnabled: true,
      textEnabled: true,
      servicesOffered: ['plumbing', 'water heaters', 'drains'],
      servicesNotOffered: ['electrical', 'HVAC'],
      afterHoursBehavior: 'emergency_only',
      emergencyCallbackMinutes: 15,
      nonEmergencyCallbackMinutes: 120,
      serviceCallFee: 8900,
      freeEstimates: true,
      recordingDisclosure: true,
      recordingDisclosureText: 'This call may be recorded.',
    },
    serviceArea: {
      cities: ['Austin', 'Round Rock', 'Cedar Park'],
      zipCodes: ['78701', '78702', '78703'],
    },
    businessHours: {
      monday: { open: '08:00', close: '18:00' },
      tuesday: { open: '08:00', close: '18:00' },
      wednesday: { open: '08:00', close: '18:00' },
      thursday: { open: '08:00', close: '18:00' },
      friday: { open: '08:00', close: '17:00' },
      saturday: null,
      sunday: null,
    },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ============================================
// CUSTOMER FACTORIES
// ============================================

export const createTestCustomer = (overrides = {}) => ({
  id: 'test-customer-id',
  organizationId: 'test-org-id',
  firstName: 'John',
  lastName: 'Smith',
  phone: '+15551234567',
  email: 'john.smith@example.com',
  address: '123 Main St, Austin, TX 78701',
  source: 'phone_ai',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createAICustomer = (overrides = {}) =>
  createTestCustomer({
    source: 'phone_ai',
    ...overrides,
  });

// ============================================
// CALL FACTORIES
// ============================================

export const createTestCall = (overrides = {}) => ({
  id: 'test-call-id',
  organizationId: 'test-org-id',
  customerId: 'test-customer-id',
  direction: 'inbound' as const,
  status: 'completed' as const,
  aiHandled: true,
  duration: 180,
  summary: 'Customer called about leaking faucet',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createAIHandledCall = (overrides = {}) =>
  createTestCall({
    aiHandled: true,
    ...overrides,
  });

export const createRecentCall = (daysAgo: number, overrides = {}) =>
  createTestCall({
    createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    ...overrides,
  });

// ============================================
// JOB FACTORIES
// ============================================

export const createTestJob = (overrides = {}) => ({
  id: 'test-job-id',
  organizationId: 'test-org-id',
  customerId: 'test-customer-id',
  title: 'Plumbing Service',
  description: 'Fix leaking faucet in kitchen',
  status: 'scheduled' as const,
  priority: 'normal' as const,
  estimatedValue: 15000, // $150 in cents
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createEmergencyJob = (overrides = {}) =>
  createTestJob({
    priority: 'emergency',
    title: 'Emergency - Burst Pipe',
    description: 'Water flooding basement',
    estimatedValue: 50000, // $500
    ...overrides,
  });

export const createAIBookedJob = (overrides = {}) =>
  createTestJob({
    // Job created via AI booking
    ...overrides,
  });

// ============================================
// AI SETTINGS FACTORIES
// ============================================

export const createTestAISettings = (overrides = {}) => ({
  voiceEnabled: true,
  textEnabled: true,
  voiceId: 'alloy',
  greeting: 'Thanks for calling Test Plumbing!',
  escalationKeywords: ['manager', 'supervisor', 'complaint'],
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  servicesOffered: ['plumbing', 'water heaters'],
  servicesNotOffered: ['electrical'],
  afterHoursBehavior: 'emergency_only' as const,
  emergencyCallbackMinutes: 15,
  nonEmergencyCallbackMinutes: 120,
  serviceCallFee: 8900,
  freeEstimates: true,
  recordingDisclosure: true,
  recordingDisclosureText: 'This call may be recorded for quality purposes.',
  ...overrides,
});

export const createMinimalAISettings = (overrides = {}) => ({
  voiceEnabled: true,
  textEnabled: true,
  ...overrides,
});

// ============================================
// ANALYTICS DATA FACTORIES
// ============================================

export const createAnalyticsDataset = () => {
  const calls: ReturnType<typeof createTestCall>[] = [];
  const jobs: ReturnType<typeof createTestJob>[] = [];

  // Create 10 AI-handled calls
  for (let i = 0; i < 10; i++) {
    calls.push(createAIHandledCall({ id: `call-ai-${i}` }));
  }

  // Create 5 non-AI calls
  for (let i = 0; i < 5; i++) {
    calls.push(createTestCall({ id: `call-human-${i}`, aiHandled: false }));
  }

  // Create 5 AI-booked jobs (3 routine, 2 emergency)
  for (let i = 0; i < 3; i++) {
    jobs.push(createAIBookedJob({ id: `job-routine-${i}` }));
  }
  for (let i = 0; i < 2; i++) {
    jobs.push(createEmergencyJob({ id: `job-emergency-${i}` }));
  }

  return { calls, jobs };
};
