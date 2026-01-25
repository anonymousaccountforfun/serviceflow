# PRD-001: Real AI Integration

## Overview

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Phase** | 1 - Foundation |
| **Estimated Effort** | 5 days |
| **Dependencies** | None |
| **Owner** | Backend Team |

## Problem Statement

Current AI implementation uses mock functions with hardcoded if/then responses. The `generateMockResponse()` function in `ai-sms.ts` pattern-matches keywords instead of using actual LLM capabilities. Similarly, `vapi.ts` returns fake availability slots.

**User Impact**:
- Customers receive generic, unhelpful responses
- AI cannot actually check calendar or book appointments
- "AI-powered" marketing claim is misleading

## Goals

1. Replace mock AI responses with real Claude/GPT integration
2. Enable AI to access real business context (calendar, customer history)
3. Achieve 80% successful conversation handling rate

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| AI response accuracy | 80% | Manual review of 100 conversations |
| Average response latency | <3 seconds | P95 latency tracking |
| Conversation completion rate | 70% | % of conversations not requiring human handoff |
| Customer satisfaction | 4.0/5.0 | Post-conversation survey |

## Functional Requirements

### FR-1: LLM Integration Service
- Create `AIService` class that wraps Claude/GPT API
- Support streaming responses for voice
- Implement token usage tracking per organization
- Cache common responses to reduce costs

### FR-2: Context Injection
- AI must receive: business name, hours, service types, current availability
- AI must access: customer history if phone number matches existing customer
- AI must know: job types, pricing guidelines, emergency keywords

### FR-3: Tool Calling for Actions
- `check_availability(date)` - Query real calendar
- `book_appointment(customer_id, datetime, job_type)` - Create real appointment
- `transfer_to_human(reason)` - Trigger actual call transfer
- `create_lead(name, phone, issue)` - Create customer record

### FR-4: Conversation Memory
- Maintain context within single conversation
- Store conversation transcripts for review
- Enable conversation handoff to human with context

## Technical Design

### Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vapi      │────▶│  AI Service │────▶│  Claude API │
│  Webhook    │     │             │     │             │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                    ┌─────▼─────┐
                    │  Tool     │
                    │  Handlers │
                    └─────┬─────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────┐     ┌───────────┐     ┌───────────┐
│ Calendar  │     │ Customer  │     │   Job     │
│  Service  │     │  Service  │     │  Service  │
└───────────┘     └───────────┘     └───────────┘
```

### Files to Modify/Create
- `apps/api/src/services/ai.ts` - New AI service
- `apps/api/src/services/ai-sms.ts` - Replace mock with real
- `apps/api/src/webhooks/vapi.ts` - Wire up real tool handlers
- `apps/api/src/services/calendar.ts` - Expose availability query

### Environment Variables
```
ANTHROPIC_API_KEY=xxx
AI_MODEL=claude-3-5-sonnet-20241022
AI_MAX_TOKENS_PER_ORG_DAY=100000
AI_CACHE_TTL_SECONDS=300
```

## Tasks for Parallel Execution

### Agent 1: Core AI Service
```
Task: Create AIService class with Claude integration

Subtasks:
1. Create apps/api/src/services/ai.ts with AIService class
2. Implement sendMessage(prompt, context, tools) method
3. Implement streaming support for voice responses
4. Add token usage tracking with per-org limits
5. Add response caching for common queries
6. Write unit tests for AIService

Acceptance Criteria:
- AIService can send prompts and receive responses
- Token usage is tracked in database
- Responses are cached when appropriate
- All tests pass
```

### Agent 2: Tool Handlers
```
Task: Implement real tool handlers for AI actions

Subtasks:
1. Create apps/api/src/services/ai-tools.ts
2. Implement check_availability tool - query Prisma for open slots
3. Implement book_appointment tool - create Appointment record
4. Implement create_lead tool - create Customer record
5. Implement transfer_to_human tool - trigger Twilio transfer
6. Wire tools into Vapi webhook handler
7. Write integration tests

Acceptance Criteria:
- Each tool performs real database operations
- Availability reflects actual calendar state
- Appointments created by AI appear in dashboard
- Transfer actually routes call (or queues if unavailable)
```

### Agent 3: Context & Prompts
```
Task: Build context injection and system prompts

Subtasks:
1. Create apps/api/src/services/ai-context.ts
2. Build getBusinessContext(orgId) - returns hours, services, name
3. Build getCustomerContext(phone) - returns history if exists
4. Build getAvailabilityContext(orgId, date) - returns open slots
5. Create system prompt templates in apps/api/src/prompts/
6. Test context injection with real conversations

Acceptance Criteria:
- AI receives accurate business information
- Returning customers are recognized
- System prompts produce natural, helpful responses
- Context size stays under token limits
```

## Non-Functional Requirements

- **Latency**: P95 response time <3 seconds
- **Cost**: <$0.10 per conversation average
- **Reliability**: 99.5% uptime for AI service
- **Security**: No PII in logs, API keys encrypted

## Rollout Plan

1. **Day 1-2**: Implement AIService and tool handlers
2. **Day 3**: Integrate with Vapi webhook
3. **Day 4**: Internal testing with test phone number
4. **Day 5**: Gradual rollout (10% → 50% → 100%)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM hallucination | Constrain responses with tool-calling, validate outputs |
| High API costs | Token limits per org, response caching |
| Latency spikes | Streaming responses, timeout fallback to human |

---

*PRD Version: 1.0*
*Author: CPTO*
*Date: 2026-01-25*
