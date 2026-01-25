# PRD-010: Technician Day View

## Overview

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Phase** | 3 - Mobile & Field |
| **Estimated Effort** | 3 days |
| **Dependencies** | PRD-005 (Technician Management), PRD-009 (Mobile PWA) |
| **Owner** | Frontend Team |

## Problem Statement

Technicians have no dedicated view of their workday. They must navigate through the owner-focused dashboard and job lists to find their assignments. The current UI assumes a desk-bound owner, not a mobile technician.

**Impact**:
- Technicians don't know their next job
- Can't see route/order of jobs
- No quick actions for field work
- Friction causes them to avoid the app

## Goals

1. Technicians see their day at a glance
2. One-tap access to navigate, call, start job
3. Works perfectly on mobile
4. Reduces technician app friction to near-zero

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Technician daily active use | 80% | % of technicians using app daily |
| Time to find next job | <5 seconds | From app open to viewing next job |
| Job actions from day view | 90% | % of job starts/completes from this view |
| Technician satisfaction | 4.5/5 | Survey score |

## Functional Requirements

### FR-1: Day Overview
- Show today's date prominently
- List all assigned jobs in chronological order
- Show job count and total estimated time
- Show current/next job highlighted
- Pull-to-refresh for updates

### FR-2: Job Cards (Mobile-Optimized)
- Time slot (start time, duration estimate)
- Customer name and job title
- Address with distance/ETA
- Status indicator (scheduled, in progress, complete)
- Quick action buttons

### FR-3: Quick Actions
- Navigate: Opens maps app to job address
- Call: Calls customer phone
- Start Job: Marks job as "in progress"
- Complete: Opens completion flow
- Notes: Add quick note

### FR-4: Route View
- Show all jobs on map
- Optimized route between jobs
- Tap job pin to see details
- "Start Route" button for turn-by-turn

### FR-5: Time Tracking
- Auto-clock-in when starting first job
- Track time per job
- Show daily summary (jobs done, hours worked)
- Handle breaks

### FR-6: Real-Time Updates
- New job assigned → notification + list update
- Job rescheduled → immediate update
- Customer cancelled → alert with updated schedule

## Technical Design

### Page Structure
```
apps/web/app/technician/
├── page.tsx              # Day view (default for techs)
├── [jobId]/page.tsx      # Job detail
├── route/page.tsx        # Map route view
└── timesheet/page.tsx    # Time tracking summary
```

### Components
```typescript
// TechnicianDayView - Main view
interface TechnicianDayViewProps {
  date: Date;
  jobs: Job[];
  currentJobId?: string;
}

// TechJobCard - Mobile-optimized job card
interface TechJobCardProps {
  job: Job;
  isCurrent: boolean;
  onNavigate: () => void;
  onCall: () => void;
  onStart: () => void;
}

// RouteMap - Day's jobs on map
interface RouteMapProps {
  jobs: Job[];
  optimizedOrder: string[];
}
```

### API Endpoints
```typescript
// Get technician's day
GET /api/technician/day?date=2026-01-25
Response: {
  jobs: Job[],
  stats: { totalJobs, completedJobs, estimatedHours },
  currentJobId?: string
}

// Get optimized route
GET /api/technician/route?date=2026-01-25
Response: {
  jobs: Job[],
  optimizedOrder: string[],
  totalDistance: number,
  totalDuration: number
}

// Time tracking
POST /api/technician/clock-in
POST /api/technician/clock-out
GET /api/technician/timesheet?week=2026-W04
```

### Route Optimization
```typescript
// Use Google Directions API or simple nearest-neighbor
async function optimizeRoute(jobs: Job[], startLocation: Coordinates) {
  // Sort by optimal driving order
  // Return ordered job IDs
}
```

## Tasks for Parallel Execution

### Agent 1: Day View API
```
Task: Build technician day view API

Subtasks:
1. Create apps/api/src/routes/technician.ts
2. GET /day - return day's jobs sorted by time
3. Include customer details and addresses
4. Calculate stats (total jobs, completed, hours)
5. Identify current/next job
6. GET /route - return optimized job order
7. Add simple route optimization (nearest neighbor)
8. Add caching for route calculations
9. Write API tests

Acceptance Criteria:
- Day endpoint returns jobs with all needed data
- Stats calculated correctly
- Route optimization provides reasonable order
```

### Agent 2: Day View UI
```
Task: Build technician day view page

Subtasks:
1. Create apps/web/app/technician/page.tsx
2. Date header with navigation (prev/next day)
3. Stats summary bar (X jobs, Y hours)
4. Job list with TechJobCard components
5. Current job highlighting
6. Empty state for no jobs
7. Pull-to-refresh functionality
8. Real-time updates via WebSocket (if available)
9. Mobile-first responsive design

Acceptance Criteria:
- Clean, mobile-optimized layout
- Jobs listed in time order
- Current job clearly highlighted
- Pull-to-refresh works
```

### Agent 3: Quick Actions & Navigation
```
Task: Implement quick action buttons

Subtasks:
1. Create TechJobCard component with quick actions
2. Navigate button - opens native maps with address
3. Call button - opens phone dialer
4. Start Job button - PATCH job to in_progress
5. Complete button - navigates to completion flow
6. Add Note button - quick note modal
7. Handle action loading states
8. Haptic feedback on mobile
9. Test on iOS and Android

Acceptance Criteria:
- Navigate opens Google/Apple Maps
- Call opens phone dialer
- Start/Complete update job status
- Works on both iOS and Android
```

### Agent 4: Route Map View
```
Task: Build map route view

Subtasks:
1. Create apps/web/app/technician/route/page.tsx
2. Integrate mapping library (Google Maps or Mapbox)
3. Show all day's jobs as pins
4. Number pins by order
5. Draw route line between jobs
6. Tap pin to see job summary
7. "Start Navigation" to open native maps
8. Show total distance/time
9. Handle jobs with missing coordinates

Acceptance Criteria:
- All jobs shown on map
- Route drawn in order
- Can tap to see job details
- Start navigation opens native maps
```

## UI Mockups

### Technician Day View
```
┌─────────────────────────────────────────┐
│  ← Today, Sat Jan 25              🗺️   │
│     5 jobs · ~6 hours                   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 🔴 IN PROGRESS                      ││
│  │ 9:00 AM - Fix leaky faucet          ││
│  │ John Smith · (512) 555-1234         ││
│  │ 123 Main St · 0.0 mi                ││
│  │                                      ││
│  │ [📞 Call] [🗺 Nav] [✓ Complete]     ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ NEXT UP                             ││
│  │ 11:00 AM - HVAC maintenance         ││
│  │ Sarah Williams · (512) 555-5678     ││
│  │ 456 Oak Ave · 3.2 mi · 12 min       ││
│  │                                      ││
│  │ [📞 Call] [🗺 Nav] [▶ Start]        ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 2:00 PM - Water heater install      ││
│  │ Bob Wilson                           ││
│  │ 789 Pine Rd · 5.1 mi                ││
│  │                                      ││
│  │ [📞] [🗺] [▶]                       ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ + 2 more jobs                      │  │
│  └───────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│  🏠   📋   📅   💬   ⋯                 │
└─────────────────────────────────────────┘
```

### Route Map View
```
┌─────────────────────────────────────────┐
│  ← Route for Today                      │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────────┐│
│  │                                      ││
│  │        📍1                           ││
│  │         \                            ││
│  │          \   📍2                     ││
│  │           \ /                        ││
│  │            X                         ││
│  │           / \                        ││
│  │       📍3    📍4                     ││
│  │                 \                    ││
│  │                  📍5                 ││
│  │                                      ││
│  │      [ MAP VIEW ]                    ││
│  │                                      ││
│  └─────────────────────────────────────┘│
│                                         │
│  Total: 28.4 miles · ~52 min driving   │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │       🗺 Start Route Navigation      ││
│  └─────────────────────────────────────┘│
│                                         │
│  1. 123 Main St (current)              │
│  2. 456 Oak Ave · 3.2 mi               │
│  3. 789 Pine Rd · 5.1 mi               │
│  4. 321 Elm Blvd · 8.3 mi              │
│  5. 555 Cedar Ln · 11.8 mi             │
│                                         │
├─────────────────────────────────────────┤
│  🏠   📋   📅   💬   ⋯                 │
└─────────────────────────────────────────┘
```

## Non-Functional Requirements

- **Performance**: Day view loads <2 seconds on 3G
- **Offline**: Day's jobs cached for offline viewing
- **Battery**: Minimal GPS/location drain
- **Accessibility**: Large touch targets, high contrast

## Rollout Plan

1. **Day 1**: API endpoints, data fetching
2. **Day 2**: Day view UI, quick actions
3. **Day 3**: Route map view, testing

---

*PRD Version: 1.0*
*Author: CPTO*
*Date: 2026-01-25*
