# PRD-005: Technician Management UI

## Overview

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Phase** | 2 - Core Workflows |
| **Estimated Effort** | 4 days |
| **Dependencies** | None (DB models exist) |
| **Owner** | Frontend Team |

## Problem Statement

The database has `User` model with roles (owner, admin, technician) and jobs have `assignedToId`, but there is **zero UI** to:
- Add team members
- View team members
- Assign jobs to technicians
- See technician workloads

Multi-tech businesses cannot use ServiceFlow without this feature.

## Goals

1. Enable owners to invite and manage team members
2. Allow job assignment to specific technicians
3. Show technician workload at a glance
4. Achieve job assignment in <3 clicks

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Team member added | 90% success | % of invite attempts that complete |
| Job assignment time | <3 clicks | UX testing |
| Technician utilization visible | 100% | Owners can see workload |
| Multi-tech org retention | +30% | 30-day retention for 2+ tech orgs |

## Functional Requirements

### FR-1: Team Settings Page
- List all team members with role, status, contact info
- Invite new team member via email
- Edit team member role (admin, technician, viewer)
- Remove team member (with job reassignment prompt)
- Show pending invitations

### FR-2: Team Member Invitation Flow
- Enter email address
- Select role
- Send invitation email via Clerk
- Track invitation status (pending, accepted, expired)
- Allow resend/cancel invitation

### FR-3: Job Assignment UI
- Add "Assign To" dropdown in job creation modal
- Add "Assign To" field in job detail page (editable)
- Show technician avatar + name
- Filter jobs by assigned technician
- Bulk assign multiple jobs

### FR-4: Technician Workload View
- Show today's job count per technician
- Show weekly job count per technician
- Visual indicator (green/yellow/red) for load
- Quick link to technician's schedule

### FR-5: Technician Quick Actions
- From team list: "View Schedule", "Assign Job"
- From job detail: "Change Assignment"
- From calendar: Drag job to different tech (future)

## Technical Design

### New Pages/Components

```
apps/web/app/dashboard/settings/team/
├── page.tsx              # Team list page
├── invite/page.tsx       # Invitation flow
└── [id]/page.tsx         # Team member detail

apps/web/components/
├── TeamMemberCard.tsx    # Team member display
├── TeamMemberInvite.tsx  # Invitation modal
├── TechnicianSelect.tsx  # Dropdown for job assignment
└── WorkloadIndicator.tsx # Visual load indicator
```

### API Endpoints

```typescript
// List team members
GET /api/team
Response: { members: [{ id, email, firstName, lastName, role, status, jobCount }] }

// Invite team member
POST /api/team/invite
Body: { email: string, role: "technician" | "admin" }
Response: { invitationId: string, status: "pending" }

// Update team member role
PATCH /api/team/:id
Body: { role: "technician" | "admin" | "viewer" }

// Remove team member
DELETE /api/team/:id

// Get technician workload
GET /api/team/workload?period=week
Response: { technicians: [{ id, name, todayJobs: 3, weekJobs: 15, status: "available" }] }

// Assign job to technician
PATCH /api/jobs/:id
Body: { assignedToId: "user-id" }
```

### Database (Already Exists)
```prisma
model User {
  id        String   @id
  role      UserRole @default(technician)
  // ... existing fields
}

model Job {
  assignedToId String?
  assignedTo   User?   @relation(...)
}
```

## Tasks for Parallel Execution

### Agent 1: Team Management API
```
Task: Create team management API routes

Subtasks:
1. Create apps/api/src/routes/team.ts
2. GET / - list team members with job counts
3. POST /invite - create Clerk invitation
4. PATCH /:id - update role
5. DELETE /:id - remove member (check for assigned jobs first)
6. GET /workload - aggregate job counts by technician
7. Add proper authorization (only owner/admin)
8. Write API tests

Acceptance Criteria:
- Can list, invite, update, remove team members
- Workload endpoint returns accurate counts
- Proper role-based access control
```

### Agent 2: Team Settings UI
```
Task: Build team settings page

Subtasks:
1. Create apps/web/app/dashboard/settings/team/page.tsx
2. Create TeamMemberCard component
3. Create TeamMemberInvite modal component
4. Implement invite flow with form validation
5. Implement role editing
6. Implement member removal with confirmation
7. Add loading states and error handling
8. Add to settings navigation

Acceptance Criteria:
- Team list displays all members
- Can invite new members via email
- Can edit roles and remove members
- Proper loading and error states
```

### Agent 3: Job Assignment UI
```
Task: Add technician assignment to job flows

Subtasks:
1. Create TechnicianSelect dropdown component
2. Add to job creation modal (jobs/page.tsx)
3. Add editable field to job detail page (jobs/[id]/page.tsx)
4. Add "Assigned To" filter to jobs list
5. Implement assignment via PATCH /api/jobs/:id
6. Show avatar + name in job cards
7. Test assignment flow end-to-end

Acceptance Criteria:
- Can assign technician when creating job
- Can change assignment from job detail
- Jobs list shows who's assigned
- Can filter by technician
```

### Agent 4: Workload Dashboard
```
Task: Build technician workload view

Subtasks:
1. Create WorkloadIndicator component (green/yellow/red)
2. Add workload section to team settings page
3. Create mini workload widget for dashboard
4. Show today + this week job counts
5. Link to technician's filtered job list
6. Update in real-time (or on refresh)

Acceptance Criteria:
- Workload visible on team page
- Color indicates load (0-3 green, 4-6 yellow, 7+ red)
- Clicking tech shows their jobs
```

## UI Mockups

### Team List
```
┌────────────────────────────────────────────────────────────┐
│ Team Members                           [ + Invite Member ] │
├────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 👤 Marcus Johnson                                    │   │
│ │    Technician · marcus@email.com                     │   │
│ │    Today: 3 jobs │ This Week: 12 jobs   🟢 Available │   │
│ │    [ View Schedule ] [ Edit ] [ Remove ]             │   │
│ └──────────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 👤 Alex Rivera                                       │   │
│ │    Technician · alex@email.com                       │   │
│ │    Today: 5 jobs │ This Week: 18 jobs   🟡 Busy      │   │
│ │    [ View Schedule ] [ Edit ] [ Remove ]             │   │
│ └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### Job Assignment Dropdown
```
┌─────────────────────────────────┐
│ Assign To                       │
├─────────────────────────────────┤
│ ▼ Select technician...          │
│ ┌─────────────────────────────┐ │
│ │ 👤 Marcus J. (3 jobs today) │ │
│ │ 👤 Alex R. (5 jobs today)   │ │
│ │ ○ Unassigned                │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

## Non-Functional Requirements

- **Performance**: Team list loads <500ms
- **Scalability**: Support up to 50 team members
- **Security**: Only owner/admin can manage team
- **UX**: Assignment in <3 clicks

## Rollout Plan

1. **Day 1**: API routes for team management
2. **Day 2**: Team settings UI
3. **Day 3**: Job assignment UI
4. **Day 4**: Workload view, testing, polish

---

*PRD Version: 1.0*
*Author: CPTO*
*Date: 2026-01-25*
