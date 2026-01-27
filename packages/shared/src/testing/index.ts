/**
 * Test Requirements Tracking System
 *
 * This module provides a code-based system for tracking pre-launch test requirements.
 *
 * Usage:
 * 1. Import feature requirement files to register them
 * 2. Use registry to query requirements
 * 3. Run generate-test-report.ts to create markdown report
 *
 * @example
 * ```typescript
 * import { registry } from '@serviceflow/shared/testing';
 *
 * // Add a requirement
 * registry.add({
 *   id: 'MY-FEAT-001',
 *   feature: 'My Feature',
 *   title: 'API returns correct data',
 *   description: 'GET /api/endpoint returns expected shape',
 *   priority: 'P0',
 *   category: 'api',
 *   status: 'not_started',
 *   addedBy: 'developer-name',
 * });
 *
 * // Update status after writing tests
 * registry.updateStatus('MY-FEAT-001', 'written', {
 *   testFile: 'src/__tests__/my-feature.test.ts'
 * });
 *
 * // Generate report
 * const report = registry.generateReport();
 * ```
 */

// Import all feature requirements to register them
import './features/ai-voice-v1';

// Future features - uncomment as they're added:
// import './features/billing-v2';
// import './features/mobile-app';

// Export types
export * from './requirements';

// Export registry
export { registry, TestRequirementsRegistry } from './registry';
