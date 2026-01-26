/**
 * Sentry Client Configuration
 *
 * This configures the Sentry SDK for the browser (client-side).
 * Loaded automatically by @sentry/nextjs.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Performance Monitoring
  tracesSampleRate: 0.1, // Sample 10% of transactions

  // Session Replay
  replaysSessionSampleRate: 0.1, // Sample 10% of sessions
  replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors

  // Don't send PII
  sendDefaultPii: false,

  // Filter errors
  ignoreErrors: [
    // Common browser errors that aren't actionable
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    // Network errors
    'Network request failed',
    'Load failed',
    'Failed to fetch',
    // Third-party script errors
    /^Script error\.?$/,
  ],

  // Before sending an error
  beforeSend(event, hint) {
    // Filter out errors from browser extensions
    const frames = event.exception?.values?.[0]?.stacktrace?.frames;
    if (frames?.some(frame => frame.filename?.includes('extension://'))) {
      return null;
    }

    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      // Mask all text for privacy
      maskAllText: true,
      // Block all media
      blockAllMedia: true,
    }),
  ],
});
