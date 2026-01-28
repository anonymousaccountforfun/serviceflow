/**
 * Mock Resend client for testing
 */

export class Resend {
  emails = {
    send: jest.fn().mockResolvedValue({
      data: { id: 'mock-email-id' },
      error: null,
    }),
  };
}
