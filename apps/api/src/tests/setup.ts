/**
 * Jest Test Setup
 *
 * This file runs after environment setup but before tests.
 * Environment variables are set in env-setup.ts (setupFiles).
 */

import { resetMocks } from './mocks/database';

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
