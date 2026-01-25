/**
 * API Response Utilities
 *
 * Standardized response helpers for consistent API responses.
 * All API endpoints should use these helpers.
 */

import { Response } from 'express';

/**
 * Error codes by category
 * E1xxx - Authentication errors
 * E2xxx - Validation errors
 * E3xxx - Resource not found errors
 * E4xxx - External service errors (Twilio, Google, etc.)
 * E5xxx - Business logic errors
 * E9xxx - Internal server errors
 */
export const ErrorCodes = {
  // Authentication (E1xxx)
  UNAUTHORIZED: 'E1001',
  FORBIDDEN: 'E1002',
  TOKEN_EXPIRED: 'E1003',
  INVALID_TOKEN: 'E1004',

  // Validation (E2xxx)
  VALIDATION_FAILED: 'E2001',
  MISSING_FIELD: 'E2002',
  INVALID_FORMAT: 'E2003',
  DUPLICATE_ENTRY: 'E2004',

  // Not Found (E3xxx)
  RESOURCE_NOT_FOUND: 'E3001',
  CUSTOMER_NOT_FOUND: 'E3002',
  JOB_NOT_FOUND: 'E3003',
  CONVERSATION_NOT_FOUND: 'E3004',
  REVIEW_NOT_FOUND: 'E3005',
  PHONE_NOT_FOUND: 'E3006',

  // External Services (E4xxx)
  TWILIO_ERROR: 'E4001',
  TWILIO_NOT_CONFIGURED: 'E4002',
  GOOGLE_ERROR: 'E4003',
  GOOGLE_NOT_CONFIGURED: 'E4004',
  STRIPE_ERROR: 'E4005',
  OPENAI_ERROR: 'E4006',
  VAPI_ERROR: 'E4007',

  // Business Logic (E5xxx)
  OPTED_OUT: 'E5001',
  QUIET_HOURS: 'E5002',
  NO_PHONE_NUMBER: 'E5003',
  RATE_LIMITED: 'E5004',
  FEATURE_DISABLED: 'E5005',
  INVALID_PHONE: 'E5006',

  // Internal (E9xxx)
  INTERNAL_ERROR: 'E9001',
  DATABASE_ERROR: 'E9002',
} as const;

type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

interface ApiError {
  code: ErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/**
 * Send a success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  status: number = 200
): void {
  res.status(status).json({
    success: true,
    data,
  });
}

/**
 * Send a success response with pagination metadata
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  status: number = 200
): void {
  res.status(status).json({
    success: true,
    data,
    meta,
  });
}

/**
 * Send an error response
 */
export function sendError(
  res: Response,
  code: ErrorCode | string,
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
): void {
  const error: ApiError = { code, message };
  if (details) {
    error.details = details;
  }

  res.status(status).json({
    success: false,
    error,
  });
}

/**
 * Common error response helpers
 */
export const errors = {
  notFound: (res: Response, resource: string = 'Resource') =>
    sendError(res, ErrorCodes.RESOURCE_NOT_FOUND, `${resource} not found`, 404),

  unauthorized: (res: Response, message: string = 'Authentication required') =>
    sendError(res, ErrorCodes.UNAUTHORIZED, message, 401),

  forbidden: (res: Response, message: string = 'Access denied') =>
    sendError(res, ErrorCodes.FORBIDDEN, message, 403),

  validation: (res: Response, message: string, details?: Record<string, unknown>) =>
    sendError(res, ErrorCodes.VALIDATION_FAILED, message, 400, details),

  internal: (res: Response, message: string = 'Internal server error') =>
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
      500
    ),

  serviceUnavailable: (res: Response, service: string) =>
    sendError(res, ErrorCodes.FEATURE_DISABLED, `${service} is not configured`, 503),

  rateLimited: (res: Response, message: string = 'Too many requests') =>
    sendError(res, ErrorCodes.RATE_LIMITED, message, 429),
};

/**
 * Wrap an async route handler with error handling
 */
export function asyncHandler(
  fn: (req: any, res: Response, next: any) => Promise<any>
) {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('Unhandled route error:', error);
      errors.internal(res, error.message);
    });
  };
}
