/**
 * Test Helpers
 *
 * Utilities for integration testing.
 */

import request from 'supertest';
import app from '../index';
import { mockPrisma, testData } from './mocks/database';

// Test user for authentication
const testUser = testData.user();

/**
 * Create authenticated request agent
 * Mocks the auth middleware to inject a test user
 */
export function createAuthenticatedAgent() {
  // Mock Clerk token verification
  jest.mock('@clerk/backend', () => ({
    createClerkClient: () => ({
      verifyToken: jest.fn().mockResolvedValue({ sub: testUser.clerkId }),
    }),
  }));

  // Mock user lookup
  mockPrisma.user.findUnique.mockResolvedValue(testUser);

  return request(app);
}

/**
 * Create unauthenticated request agent
 */
export function createAgent() {
  return request(app);
}

/**
 * Set up mock for a specific user
 */
export function mockUser(user = testUser) {
  mockPrisma.user.findUnique.mockResolvedValue(user);
  return user;
}

/**
 * Set up mock for customers
 */
export function mockCustomers(customers = [testData.customer()]) {
  mockPrisma.customer.findMany.mockResolvedValue(customers);
  mockPrisma.customer.count.mockResolvedValue(customers.length);
  return customers;
}

/**
 * Set up mock for jobs
 */
export function mockJobs(jobs = [testData.job()]) {
  mockPrisma.job.findMany.mockResolvedValue(jobs);
  mockPrisma.job.count.mockResolvedValue(jobs.length);
  return jobs;
}

/**
 * Set up mock for conversations
 */
export function mockConversations(conversations = [testData.conversation()]) {
  mockPrisma.conversation.findMany.mockResolvedValue(conversations);
  mockPrisma.conversation.count.mockResolvedValue(conversations.length);
  return conversations;
}

/**
 * Set up mock for reviews
 */
export function mockReviews(reviews = [testData.review()]) {
  mockPrisma.review.findMany.mockResolvedValue(reviews);
  mockPrisma.review.count.mockResolvedValue(reviews.length);
  return reviews;
}

/**
 * Assert successful API response
 */
export function expectSuccess(response: request.Response) {
  expect(response.body.success).toBe(true);
  expect(response.body.error).toBeUndefined();
}

/**
 * Assert error API response
 */
export function expectError(response: request.Response, code?: string) {
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();
  if (code) {
    expect(response.body.error.code).toBe(code);
  }
}

/**
 * Create auth header for requests
 */
export function authHeader(token = 'test_token') {
  return { Authorization: `Bearer ${token}` };
}

export { testData, mockPrisma };
