/**
 * Sentry Client-side Configuration
 *
 * This file configures Sentry error tracking for the browser.
 * It is automatically loaded by @sentry/nextjs.
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

  // Session replay sample rate (captures user sessions for debugging)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Don't send PII
  sendDefaultPii: false,

  // Ignore common non-actionable errors
  ignoreErrors: [
    // Network errors
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    // User-triggered navigation
    'ResizeObserver loop',
    // Browser extensions
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Third-party scripts
    /^Script error\.?$/,
  ],

  // Filter breadcrumbs
  beforeBreadcrumb(breadcrumb) {
    // Don't log console messages
    if (breadcrumb.category === 'console') {
      return null;
    }
    return breadcrumb;
  },

  // Filter sensitive data
  beforeSend(event) {
    // Remove sensitive URL parameters
    if (event.request?.query_string && typeof event.request.query_string === 'string') {
      const sensitiveParams = ['token', 'key', 'secret', 'password'];
      let queryString = event.request.query_string;
      for (const param of sensitiveParams) {
        if (queryString.includes(param)) {
          queryString = queryString.replace(
            new RegExp(`${param}=[^&]*`, 'gi'),
            `${param}=[REDACTED]`
          );
        }
      }
      event.request.query_string = queryString;
    }
    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
