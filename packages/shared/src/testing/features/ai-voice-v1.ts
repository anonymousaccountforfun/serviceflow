/**
 * AI Voice V1 Test Requirements
 *
 * Pre-launch test requirements for the AI Voice V1 feature.
 * Added: 2026-01-26
 */

import { registry } from '../registry';

// AI Voice V1 Requirements
registry
  .add({
    id: 'AI-VOICE-001',
    feature: 'AI Voice V1',
    title: 'AISettings schema validation',
    description:
      'Validate all V1 AI settings fields (services, callbacks, pricing, disclosure)',
    priority: 'P0',
    category: 'api',
    status: 'passing',
    testFile: 'packages/shared/src/__tests__/validators.test.ts',
    verifiedAt: '2026-01-26T19:42:44Z',
    addedBy: 'claude',
  })
  .add({
    id: 'AI-VOICE-002',
    feature: 'AI Voice V1',
    title: 'System prompt includes emergency tiers',
    description:
      'buildSystemPrompt generates prompt with Tier 0/1/2 emergency handling',
    priority: 'P0',
    category: 'api',
    status: 'written',
    testFile: 'apps/api/src/services/__tests__/vapi.test.ts',
    addedBy: 'claude',
  })
  .add({
    id: 'AI-VOICE-003',
    feature: 'AI Voice V1',
    title: 'Recording disclosure in greeting',
    description:
      'Greeting prepends recording disclosure when enabled in settings',
    priority: 'P0',
    category: 'api',
    status: 'written',
    testFile: 'apps/api/src/services/__tests__/vapi.test.ts',
    addedBy: 'claude',
  })
  .add({
    id: 'AI-VOICE-004',
    feature: 'AI Voice V1',
    title: 'lookup_customer tool returns recent calls',
    description:
      'Tool finds customer by phone and returns calls from last 7 days',
    priority: 'P1',
    category: 'api',
    status: 'written',
    testFile: 'apps/api/src/services/__tests__/vapi.test.ts',
    addedBy: 'claude',
  })
  .add({
    id: 'AI-VOICE-005',
    feature: 'AI Voice V1',
    title: 'send_sms_confirmation sends appropriate message',
    description:
      'Emergency gets URGENT prefix, routine includes opt-out language',
    priority: 'P1',
    category: 'integration',
    status: 'written',
    testFile: 'apps/api/src/services/__tests__/vapi.test.ts',
    addedBy: 'claude',
  })
  .add({
    id: 'AI-VOICE-006',
    feature: 'AI Voice V1',
    title: 'AI ROI analytics endpoint',
    description: '/api/analytics/ai-roi returns calls, jobs, value metrics',
    priority: 'P1',
    category: 'api',
    status: 'written',
    testFile: 'apps/api/src/routes/__tests__/analytics.test.ts',
    addedBy: 'claude',
  })
  .add({
    id: 'AI-VOICE-007',
    feature: 'AI Voice V1',
    title: 'AI Performance dashboard renders',
    description: 'Dashboard page loads and displays ROI metrics',
    priority: 'P1',
    category: 'ui',
    status: 'not_started',
    addedBy: 'claude',
  })
  .add({
    id: 'AI-VOICE-008',
    feature: 'AI Voice V1',
    title: 'Tier 0 emergency instructs 911',
    description:
      'When user mentions gas smell, AI does NOT collect info, instructs to call 911',
    priority: 'P0',
    category: 'integration',
    status: 'not_started',
    addedBy: 'claude',
  });

export default registry;
