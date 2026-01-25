/**
 * Sentry Edge Runtime Configuration
 *
 * This file configures Sentry error tracking for Edge runtime functions.
 * It is automatically loaded by @sentry/nextjs for middleware and edge API routes.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Performance monitoring sample rate
  tracesSampleRate: 0.1,
});
