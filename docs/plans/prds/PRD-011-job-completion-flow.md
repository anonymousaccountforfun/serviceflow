# PRD-011: Job Completion Flow

## Overview

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Phase** | 3 - Mobile & Field |
| **Estimated Effort** | 3 days |
| **Dependencies** | PRD-009 (Mobile PWA), PRD-010 (Technician Day View) |
| **Owner** | Full-stack Team |

## Problem Statement

Completing a job is currently just clicking a status dropdown. There's no guided flow for:
- Capturing what was done
- Taking before/after photos
- Collecting customer signature
- Creating invoice from completed work
- Requesting review

Technicians finish jobs but the data capture is minimal, making invoicing and follow-up manual.

**Impact**:
- No proof of work (photos, signatures)
- Manual invoice creation
- Missed review requests
- Poor data for future reference

## Goals

1. Guided completion flow captures all needed data
2. Photos and signature collected on-site
3. Invoice generated automatically from completion
4. Review request sent automatically
5. Complete flow in <3 minutes

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Completion flow usage | 90% | % of jobs completed via flow (not status dropdown) |
| Photo capture rate | 70% | % of completions with at least 1 photo |
| Signature capture rate | 85% | % of completions with customer signature |
| Invoice-from-completion | 80% | % of completions that generate invoice |
| Review request sent | 95% | % of completions that trigger review request |

## Functional Requirements

### FR-1: Completion Wizard
- Step-by-step flow (not a form dump)
- Progress indicator
- Can save progress and resume
- Works offline (syncs when online)

### FR-2: Work Summary Step
- What was done (text)
- Parts/materials used (from inventory or manual entry)
- Actual time spent
- Any issues or notes for follow-up

### FR-3: Photo Capture Step
- Take photos with device camera
- Before photos (optional, if taken at start)
- After photos (required)
- Photo annotation (draw on photo)
- Multiple photos supported

### FR-4: Customer Approval Step
- Show work summary to customer
- Customer signature capture
- Customer email for receipt (optional)
- "Customer not present" option

### FR-5: Payment/Invoice Step
- Show calculated total
- Option to create invoice now
- Option to collect payment on-site (cash/check)
- Skip for "bill later" customers

### FR-6: Review Request Step
- Auto-send review request via SMS
- Preview message
- Option to skip (with reason)

### FR-7: Completion Confirmation
- Summary of what was captured
- Confirmation message
- Return to day view

## Technical Design

### Flow State Machine
```typescript
enum CompletionStep {
  work_summary = 'work_summary',
  photos = 'photos',
  customer_approval = 'customer_approval',
  payment = 'payment',
  review_request = 'review_request',
  confirmation = 'confirmation',
}

interface CompletionState {
  jobId: string;
  currentStep: CompletionStep;
  workSummary?: {
    description: string;
    partsUsed: PartEntry[];
    actualDuration: number;
    notes: string;
  };
  photos?: {
    before: Photo[];
    after: Photo[];
  };
  customerApproval?: {
    signature: string; // Base64
    customerEmail?: string;
    customerNotPresent: boolean;
  };
  payment?: {
    createInvoice: boolean;
    collectNow: boolean;
    paymentMethod?: 'cash' | 'check' | 'card';
    amount?: number;
  };
  reviewRequest?: {
    sent: boolean;
    skipped: boolean;
    skipReason?: string;
  };
}
```

### Offline Support
```typescript
// Store completion state in IndexedDB
interface OfflineCompletion {
  id: string;
  jobId: string;
  state: CompletionState;
  photos: Blob[]; // Stored locally until sync
  createdAt: Date;
  syncedAt?: Date;
}

// Sync when online
window.addEventListener('online', async () => {
  const pending = await db.offlineCompletions.filter(c => !c.syncedAt).toArray();
  for (const completion of pending) {
    await syncCompletion(completion);
  }
});
```

### API Endpoints
```typescript
// Save completion progress (partial)
POST /api/jobs/:id/completion
Body: { step: CompletionStep, data: Partial<CompletionState> }

// Complete job (final)
POST /api/jobs/:id/complete
Body: CompletionState

// Upload completion photos
POST /api/jobs/:id/photos
Body: FormData with photos

// Get completion state (for resume)
GET /api/jobs/:id/completion
```

### Photo Handling
```typescript
// Compress before upload
async function processPhoto(file: File): Promise<Blob> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
  });
  return compressed;
}

// Upload with progress
async function uploadPhotos(jobId: string, photos: Blob[]) {
  const formData = new FormData();
  photos.forEach((photo, i) => formData.append(`photo_${i}`, photo));

  await fetch(`/api/jobs/${jobId}/photos`, {
    method: 'POST',
    body: formData,
  });
}
```

## Tasks for Parallel Execution

### Agent 1: Completion API
```
Task: Build job completion API

Subtasks:
1. Create apps/api/src/routes/job-completion.ts
2. POST /jobs/:id/completion - save partial progress
3. POST /jobs/:id/complete - finalize completion
4. POST /jobs/:id/photos - upload photos (multipart)
5. GET /jobs/:id/completion - get saved state
6. Store photos in S3/Cloudflare R2
7. Update job status and add completion data
8. Trigger invoice creation if requested
9. Trigger review request if not skipped
10. Write API tests

Acceptance Criteria:
- Partial progress saved and resumable
- Photos uploaded and stored correctly
- Final completion updates job with all data
- Triggers downstream actions (invoice, review)
```

### Agent 2: Completion Wizard UI
```
Task: Build completion wizard component

Subtasks:
1. Create apps/web/app/technician/[jobId]/complete/page.tsx
2. Create CompletionWizard component with step navigation
3. Step 1: WorkSummaryStep component
4. Step 2: PhotoCaptureStep component (camera integration)
5. Step 3: CustomerApprovalStep (signature pad)
6. Step 4: PaymentStep component
7. Step 5: ReviewRequestStep component
8. Step 6: ConfirmationStep component
9. Progress indicator and back/next navigation
10. Mobile-optimized layout

Acceptance Criteria:
- Wizard flows through all steps
- Can navigate back to edit
- Progress shown clearly
- Works on mobile devices
```

### Agent 3: Photo & Signature Capture
```
Task: Implement photo and signature capture

Subtasks:
1. Camera capture component using device camera
2. Photo preview with retake option
3. Photo annotation (draw on image)
4. Multiple photo management (add/remove)
5. Signature capture canvas component
6. Clear and redo signature
7. Compress images before upload
8. Handle permissions gracefully
9. Test on iOS and Android

Acceptance Criteria:
- Camera opens and captures photos
- Can annotate photos with drawings
- Signature capture works with finger/stylus
- Images compressed to reasonable size
- Works on both platforms
```

### Agent 4: Offline Completion
```
Task: Implement offline completion support

Subtasks:
1. Set up IndexedDB store for completions
2. Save completion state locally on each step
3. Store photos as blobs locally
4. Detect online/offline status
5. Queue completion for sync when offline
6. Sync completions when back online
7. Handle sync conflicts
8. Show sync status to user
9. Test offline scenarios

Acceptance Criteria:
- Can complete job while offline
- Data synced when back online
- Photos uploaded after reconnection
- User knows when offline/syncing
```

## UI Mockups

### Work Summary Step
```
┌─────────────────────────────────────────┐
│  ← Complete Job            Step 1 of 6  │
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
├─────────────────────────────────────────┤
│                                         │
│  Work Summary                           │
│                                         │
│  What was done?                         │
│  ┌─────────────────────────────────────┐│
│  │ Replaced kitchen faucet cartridge.  ││
│  │ Tested for leaks - all clear.       ││
│  │ Recommended replacing supply lines  ││
│  │ within next year.                   ││
│  └─────────────────────────────────────┘│
│                                         │
│  Parts Used                             │
│  ┌─────────────────────────────────────┐│
│  │ Moen cartridge 1225      $24.99    ││
│  │ Plumber's tape            $3.50    ││
│  │ [ + Add Part ]                      ││
│  └─────────────────────────────────────┘│
│                                         │
│  Time Spent                             │
│  [ 1 ] hours [ 30 ] minutes            │
│                                         │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │              Next →                  ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

### Photo Capture Step
```
┌─────────────────────────────────────────┐
│  ← Complete Job            Step 2 of 6  │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
├─────────────────────────────────────────┤
│                                         │
│  Photos                                 │
│                                         │
│  Before (optional)                      │
│  ┌───────┐ ┌───────┐                   │
│  │       │ │       │                   │
│  │ 📷    │ │  +    │                   │
│  │       │ │       │                   │
│  └───────┘ └───────┘                   │
│                                         │
│  After (required)                       │
│  ┌───────┐ ┌───────┐ ┌───────┐        │
│  │       │ │       │ │       │        │
│  │ 📷    │ │ 📷    │ │  +    │        │
│  │       │ │       │ │       │        │
│  └───────┘ └───────┘ └───────┘        │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │        📸 Take Photo                 ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │              Next →                  ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

### Customer Signature Step
```
┌─────────────────────────────────────────┐
│  ← Complete Job            Step 3 of 6  │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░  │
├─────────────────────────────────────────┤
│                                         │
│  Customer Approval                      │
│                                         │
│  Work completed:                        │
│  • Replaced faucet cartridge           │
│  • Parts: $28.49                        │
│  • Labor: 1.5 hrs × $85 = $127.50      │
│  • Total: $155.99                       │
│                                         │
│  Please sign below to confirm work      │
│  was completed satisfactorily:          │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │                                      ││
│  │         ~~~~~~signature~~~~~~        ││
│  │                                      ││
│  │                                      ││
│  └─────────────────────────────────────┘│
│  [ Clear ]                              │
│                                         │
│  Email receipt to:                      │
│  [ john.smith@email.com           ]    │
│                                         │
│  [ ] Customer not present              │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │              Next →                  ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

### Confirmation Step
```
┌─────────────────────────────────────────┐
│             ✓ Job Complete!             │
├─────────────────────────────────────────┤
│                                         │
│  Fix leaky faucet                       │
│  John Smith · 123 Main St               │
│                                         │
│  ────────────────────────────────────   │
│                                         │
│  ✓ Work summary saved                   │
│  ✓ 3 photos uploaded                    │
│  ✓ Customer signature captured          │
│  ✓ Invoice #INV-048 created             │
│  ✓ Review request sent                  │
│                                         │
│  ────────────────────────────────────   │
│                                         │
│  Total: $155.99                         │
│  Payment: Invoice sent                  │
│                                         │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │       Back to My Day                 ││
│  └─────────────────────────────────────┘│
│                                         │
│  [ View Invoice ] [ View Job ]         │
│                                         │
└─────────────────────────────────────────┘
```

## Non-Functional Requirements

- **Performance**: Each step loads instantly
- **Offline**: Full flow works offline, syncs later
- **Reliability**: No data loss even if app crashes
- **Mobile**: Optimized for one-handed use

## Rollout Plan

1. **Day 1**: Completion API, photo upload
2. **Day 2**: Wizard UI, all step components
3. **Day 3**: Photo/signature capture, offline support, testing

---

*PRD Version: 1.0*
*Author: CPTO*
*Date: 2026-01-25*
