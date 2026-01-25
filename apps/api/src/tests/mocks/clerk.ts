/**
 * Mock Clerk Backend SDK
 *
 * Provides a mocked version of @clerk/backend for testing.
 */

// Mock verifyToken function
export const mockVerifyToken = jest.fn().mockResolvedValue({ sub: 'clerk_test123' });

// Mock Clerk client instance
export const mockClerkClient = {
  verifyToken: mockVerifyToken,
};

// Mock createClerkClient factory
export const createClerkClient = jest.fn().mockReturnValue(mockClerkClient);

// Reset function for tests
export function resetClerkMocks() {
  mockVerifyToken.mockClear();
  mockVerifyToken.mockResolvedValue({ sub: 'clerk_test123' });
  createClerkClient.mockClear();
  createClerkClient.mockReturnValue(mockClerkClient);
}
