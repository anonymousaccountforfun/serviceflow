const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@serviceflow/shared', '@serviceflow/database'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in production
  silent: process.env.NODE_ENV !== 'production',

  // Automatically instrument routes
  widenClientFileUpload: true,

  // Hide source maps from client bundles
  hideSourceMaps: true,

  // Disable telemetry
  disableLogger: true,

  // Automatically tree-shake Sentry in production
  tunnelRoute: '/monitoring',
});
