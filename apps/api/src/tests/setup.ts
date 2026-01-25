/**
 * Jest Test Setup
 *
 * This file runs before all tests and sets up the test environment.
 */

import { mockPrisma, resetMocks } from './mocks/database';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CLERK_SECRET_KEY = 'test_clerk_secret';
process.env.TWILIO_ACCOUNT_SID = 'test_twilio_sid';
process.env.TWILIO_AUTH_TOKEN = 'test_twilio_token';

// Reset mocks before each test
beforeEach(() => {
  resetMocks();
});

// Silence console during tests (optional - comment out for debugging)
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  // Keep console.error for test debugging
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Export mock for use in tests
export { mockPrisma };
