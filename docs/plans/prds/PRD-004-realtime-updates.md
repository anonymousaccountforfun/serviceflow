# PRD-004: Real-time Updates

## Overview

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Phase** | 1 - Foundation |
| **Estimated Effort** | 3 days |
| **Dependencies** | None |
| **Owner** | Backend Team |

## Problem Statement

All data fetching uses polling with 30-second cache. Users must refresh to see new calls, messages, or job updates. This is unacceptable for time-sensitive operations.

## Goals

1. Real-time updates for critical events (<3 second latency)
2. No manual refresh needed for new data
3. Efficient connection management

## Success Metrics

| Metric | Target |
|--------|--------|
| Event latency | <3 seconds |
| Connection reliability | 99.5% uptime |
| Battery impact | <5% increase |

## Functional Requirements

### FR-1: WebSocket Infrastructure
- WebSocket server alongside REST API
- Authentication via token
- Auto-reconnect on disconnect
- Heartbeat to detect stale connections

### FR-2: Event Types
- `call.incoming` - new inbound call
- `call.missed` - missed call
- `message.received` - new SMS/chat
- `job.updated` - job status change
- `appointment.reminder` - upcoming appointment

### FR-3: Client Integration
- React hook `useRealtime(eventTypes[])`
- Automatic cache invalidation on events
- Fallback to polling if WebSocket fails

## Tasks for Parallel Execution

### Agent 1: WebSocket Server
```
Task: Set up WebSocket infrastructure

Subtasks:
1. Install ws or socket.io
2. Create apps/api/src/websocket/server.ts
3. Implement connection authentication
4. Implement room-per-organization
5. Add heartbeat/ping-pong
6. Handle reconnection gracefully
7. Test with multiple concurrent connections

Acceptance Criteria:
- WebSocket accepts authenticated connections
- Organizations isolated to their rooms
- Auto-disconnect stale connections
```

### Agent 2: Event Emitters
```
Task: Add event emission to business logic

Subtasks:
1. Create event emitter utility
2. Emit call.incoming in Twilio webhook
3. Emit call.missed after timeout
4. Emit message.received in SMS webhook
5. Emit job.updated on job PATCH
6. Include relevant payload data

Acceptance Criteria:
- Events emitted at correct points
- Payloads contain useful data
- No performance degradation
```

### Agent 3: React Client
```
Task: Build real-time React integration

Subtasks:
1. Create apps/web/lib/realtime.ts client
2. Create useRealtime() hook
3. Integrate with React Query cache invalidation
4. Add reconnection logic with backoff
5. Add connection status indicator
6. Test with simulated events

Acceptance Criteria:
- Hook subscribes to specified events
- Data auto-refreshes on events
- Shows connection status
```

---

*PRD Version: 1.0*
