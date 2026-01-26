/**
 * Sentry Server Configuration
 *
 * This configures the Sentry SDK for the server (SSR, API routes).
 * Loaded automatically by @sentry/nextjs.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Performance Monitoring
  tracesSampleRate: 0.1, // Sample 10% of transactions

  // Don't send PII
  sendDefaultPii: false,

  // Filter errors
  ignoreErrors: [
    // Database connection errors (handled by retries)
    'ECONNRESET',
    'ETIMEDOUT',
    // Clerk authentication errors (expected)
    'unauthorized',
  ],

  // Before sending an error
  beforeSend(event, hint) {
    // Remove sensitive data from event
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }

    return event;
  },
});
