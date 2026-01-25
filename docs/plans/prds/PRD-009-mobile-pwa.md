# PRD-009: Mobile-First PWA

## Overview

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Phase** | 3 - Mobile & Field |
| **Estimated Effort** | 8 days |
| **Dependencies** | Core features working |
| **Owner** | Frontend Team |

## Problem Statement

ServiceFlow has no mobile experience. The README lists mobile as "future." Field service technicians spend 90% of their day away from a desk, making a desktop-only product unusable for them.

**Impact**:
- Technicians can't see their assigned jobs
- Can't mark jobs complete from the field
- Can't capture photos/signatures
- Owners can't delegate effectively

## Goals

1. Ship PWA that works on iOS and Android
2. Core flows functional on mobile in <4 weeks
3. Offline capability for critical features
4. Achieve 40% of sessions from mobile by week 8

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Mobile session % | 40% | Analytics |
| Lighthouse PWA score | 90+ | Lighthouse audit |
| Offline functionality | Core flows work | Manual testing |
| Install rate | 30% | PWA install prompts |
| Mobile task completion | 85% | % of mobile users completing a job action |

## Functional Requirements

### FR-1: PWA Infrastructure
- Service worker for offline caching
- Web app manifest for installability
- Push notification support
- App icon and splash screen
- "Add to Home Screen" prompt

### FR-2: Mobile-Optimized Navigation
- Bottom tab navigation (Dashboard, Jobs, Calendar, Inbox, More)
- Thumb-friendly touch targets (48px minimum)
- Swipe gestures for common actions
- Pull-to-refresh on lists

### FR-3: Responsive Layouts
- All pages work on 375px+ width
- Stack layouts on mobile, grid on desktop
- Collapsible sidebar → bottom nav on mobile
- Touch-optimized forms

### FR-4: Offline Support
- Cache today's jobs for offline access
- Queue actions when offline (mark complete, add notes)
- Sync when connection restored
- Clear offline indicator

### FR-5: Mobile-Specific Features
- Camera access for job photos
- GPS for location services
- Click-to-call customer phone numbers
- Click-to-navigate to job address

## Technical Design

### PWA Configuration

```javascript
// next.config.js with next-pwa
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.serviceflow\.com\/api\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 300 },
      },
    },
  ],
});
```

### Web App Manifest
```json
{
  "name": "ServiceFlow",
  "short_name": "ServiceFlow",
  "description": "Field service management",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#f97316",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Mobile Navigation Structure
```
┌─────────────────────────────────────────┐
│              [Page Content]             │
│                                         │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  🏠    📋    📅    💬    ⋯             │
│ Home  Jobs  Cal  Inbox  More            │
└─────────────────────────────────────────┘
```

### Offline Data Strategy
```typescript
// IndexedDB for offline storage
interface OfflineStore {
  jobs: Job[];           // Today's assigned jobs
  customers: Customer[]; // Recently accessed
  pendingActions: QueuedAction[]; // Actions to sync
}

// Sync on reconnect
window.addEventListener('online', () => {
  syncPendingActions();
});
```

## Tasks for Parallel Execution

### Agent 1: PWA Infrastructure
```
Task: Set up PWA foundation

Subtasks:
1. Install and configure next-pwa
2. Create public/manifest.json
3. Create service worker with caching strategies
4. Add PWA meta tags to _document.tsx or layout.tsx
5. Create app icons (192px, 512px)
6. Create splash screens for iOS
7. Add "Install App" prompt component
8. Test PWA installation on iOS and Android
9. Run Lighthouse PWA audit, fix issues

Acceptance Criteria:
- App installable on iOS and Android
- Lighthouse PWA score 90+
- Service worker caching API responses
- Offline page shown when no connection
```

### Agent 2: Mobile Navigation
```
Task: Build mobile navigation system

Subtasks:
1. Create MobileNav component (bottom tabs)
2. Create MobileHeader component (minimal top bar)
3. Update layout.tsx to switch nav based on viewport
4. Implement useIsMobile() hook
5. Add swipe gestures for back navigation
6. Add pull-to-refresh to list pages
7. Ensure all touch targets are 48px+
8. Test on real devices (iOS Safari, Android Chrome)

Acceptance Criteria:
- Bottom nav appears on mobile viewports
- Sidebar hidden on mobile
- Touch targets meet accessibility guidelines
- Swipe/pull gestures work naturally
```

### Agent 3: Responsive Dashboard
```
Task: Make dashboard mobile-responsive

Subtasks:
1. Update dashboard/page.tsx for mobile layout
2. Stack metric cards vertically on mobile
3. Simplify chart displays for small screens
4. Make quick actions full-width buttons
5. Optimize "Today's Appointments" for mobile
6. Add touch-friendly interactions
7. Test all breakpoints (375px, 414px, 768px, 1024px+)

Acceptance Criteria:
- Dashboard fully usable on 375px screen
- No horizontal scrolling
- Charts readable on mobile
- Quick actions easily tappable
```

### Agent 4: Responsive Job Pages
```
Task: Make job list and detail mobile-responsive

Subtasks:
1. Update jobs/page.tsx for mobile
2. Job cards stack vertically
3. Filters collapse into dropdown/modal on mobile
4. Update jobs/[id]/page.tsx for mobile
5. Stack sections vertically
6. Full-width action buttons
7. Easy access to customer phone (click-to-call)
8. Easy access to address (click-to-navigate)

Acceptance Criteria:
- Job list scrolls smoothly with many items
- Job detail sections stack cleanly
- Click customer phone opens dialer
- Click address opens maps app
```

### Agent 5: Offline Support
```
Task: Implement offline functionality

Subtasks:
1. Set up IndexedDB store (use idb or Dexie)
2. Cache today's jobs on app load
3. Cache recently viewed customers
4. Create action queue for offline mutations
5. Implement sync on reconnect
6. Add offline indicator UI
7. Handle conflicts (server vs local)
8. Test offline scenarios thoroughly

Acceptance Criteria:
- Can view today's jobs offline
- Can mark job complete offline (queued)
- Syncs automatically when online
- Clear indicator when offline
```

### Agent 6: Mobile-Specific Features
```
Task: Add mobile-only capabilities

Subtasks:
1. Implement camera capture for job photos
2. Implement GPS location for check-in
3. Add click-to-call for all phone numbers
4. Add click-to-navigate for all addresses
5. Add share functionality (share job details)
6. Optimize for one-handed use
7. Test on variety of devices

Acceptance Criteria:
- Camera opens and captures photos
- GPS location accessible
- Phone numbers open dialer
- Addresses open maps app
```

## UI Mockups

### Mobile Dashboard
```
┌─────────────────────────────┐
│  ServiceFlow      👤        │
├─────────────────────────────┤
│  Today                      │
│  ┌────────────────────────┐ │
│  │ 📞 Calls    12 │ 3 🔴  │ │
│  │ Answered     Missed    │ │
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │ 💵 Revenue             │ │
│  │ $4,250 this week       │ │
│  └────────────────────────┘ │
│                             │
│  Next Appointment           │
│  ┌────────────────────────┐ │
│  │ 🔧 Fix leaky faucet    │ │
│  │ John Smith · 2:00 PM   │ │
│  │ 123 Main St            │ │
│  │ [📞 Call] [🗺 Navigate] │ │
│  └────────────────────────┘ │
│                             │
│  [ + New Job ]              │
│                             │
├─────────────────────────────┤
│  🏠   📋   📅   💬   ⋯    │
└─────────────────────────────┘
```

### Mobile Job Detail
```
┌─────────────────────────────┐
│  ← Back      Job #1047      │
├─────────────────────────────┤
│                             │
│  Fix leaky faucet           │
│  🟢 Scheduled               │
│                             │
│  ┌────────────────────────┐ │
│  │ 👤 John Smith          │ │
│  │ [📞 Call] [💬 Text]    │ │
│  └────────────────────────┘ │
│                             │
│  ┌────────────────────────┐ │
│  │ 📍 123 Main Street     │ │
│  │    Austin, TX 78701    │ │
│  │ [ 🗺 Open in Maps ]    │ │
│  └────────────────────────┘ │
│                             │
│  ┌────────────────────────┐ │
│  │ 📅 Today, 2:00 PM      │ │
│  │    Est. 2 hours        │ │
│  └────────────────────────┘ │
│                             │
│  Notes:                     │
│  Kitchen sink dripping...   │
│                             │
│  ┌────────────────────────┐ │
│  │  ✓ Start Job           │ │
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │  📸 Add Photos         │ │
│  └────────────────────────┘ │
│                             │
├─────────────────────────────┤
│  🏠   📋   📅   💬   ⋯    │
└─────────────────────────────┘
```

## Non-Functional Requirements

- **Performance**: First contentful paint <2 seconds on 3G
- **Offline**: Core features work without connection
- **Battery**: Minimal background battery drain
- **Storage**: <50MB app footprint
- **Compatibility**: iOS 14+, Android 8+, Safari, Chrome

## Rollout Plan

1. **Days 1-2**: PWA infrastructure, service worker
2. **Days 3-4**: Mobile navigation, responsive dashboard
3. **Days 5-6**: Responsive job pages, forms
4. **Days 7-8**: Offline support, mobile features, testing

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| iOS PWA limitations | Document limitations, plan native app for v2 |
| Offline sync conflicts | Last-write-wins with conflict UI for critical data |
| Performance on low-end devices | Aggressive code splitting, lazy loading |

---

*PRD Version: 1.0*
*Author: CPTO*
*Date: 2026-01-25*
