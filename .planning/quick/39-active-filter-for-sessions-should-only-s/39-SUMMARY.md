---
phase: 39-active-filter-for-sessions-should-only-s
plan: 01
subsystem: UI Filtering
tags: [filtering, session-state, quick-fix]
dependency_graph:
  requires: [session-state-tracking]
  provides: [precise-active-filter]
  affects: [FilterBar, sessionStore]
tech_stack:
  added: []
  patterns: [state-based-filtering]
key_files:
  created: []
  modified:
    - client/src/store/sessionStore.ts
decisions:
  - Active filter now exclusively shows state==='active' (green/running) sessions
  - Waiting and idle sessions always hidden regardless of Active toggle
  - Removed IDLE_TIMEOUT_MS constant as it's no longer used in filter logic
  - Archived toggle behavior unchanged (still controls 'completed' state)
metrics:
  duration: 40s
  completed: 2026-02-13
---

# Quick Task 39: Active Filter Shows Only Running Sessions

**One-liner:** Active filter toggle now exclusively shows sessions with state==='active' (green/running), hiding waiting and idle sessions completely.

## Objective

Restrict the "Active" filter toggle to only show truly running sessions (state === 'active', green). Previously, the Active toggle also showed 'waiting' and 'idle' sessions (within 10min timeout), which made the filter imprecise.

## Changes Made

### Task 1: Update getFilteredSessions to only show 'active' state for Active toggle

**Files modified:** `client/src/store/sessionStore.ts`

**Changes:**
- Simplified session status filtering logic in `getFilteredSessions()` (lines 422-436)
- Changed from compound condition `if (s.state === 'active' || s.state === 'waiting') return showActive;` to precise `if (s.state === 'active') return showActive;`
- Added explicit `if (s.state === 'waiting' || s.state === 'idle') return false;` to always hide these states
- Removed `IDLE_TIMEOUT_MS` constant (no longer needed)
- Updated comment to reflect new behavior: "Active (running/green) maps to the Active toggle, waiting and idle sessions are always hidden"

**Before:**
```typescript
// 'active', 'waiting', and 'idle' map to the Active toggle
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
let result: Session[] = sessions.filter((s) => {
  if (s.state === 'active' || s.state === 'waiting') return showActive;
  if (s.state === 'idle') {
    if (!showActive) return false;
    return (Date.now() - s.lastActivity) < IDLE_TIMEOUT_MS;
  }
  if (s.state === 'completed') return showArchived;
  return true;
});
```

**After:**
```typescript
// 'active' (running/green) maps to the Active toggle
// 'waiting' and 'idle' sessions are always hidden
// 'completed' maps to Archived toggle
let result: Session[] = sessions.filter((s) => {
  if (s.state === 'active') return showActive;
  if (s.state === 'waiting' || s.state === 'idle') return false;
  if (s.state === 'completed') return showArchived;
  return true;
});
```

**Verification:**
- Build completes successfully with no TypeScript errors
- Active checkbox now controls only green/running sessions
- Waiting and idle sessions hidden regardless of toggle state
- Archived checkbox behavior unchanged

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Met

- [x] Active filter toggle exclusively shows sessions with state === 'active' (green/running)
- [x] Waiting and idle sessions never visible regardless of Active toggle state
- [x] Archived toggle behavior unchanged (still controls 'completed' sessions)
- [x] `npm run build` passes with no TypeScript errors
- [x] Filter logic simplified and comment updated to reflect behavior

## User Impact

Users can now use the "Active" filter to see only truly running sessions (green state). This provides precise control over what's displayed in the sidebar. Sessions in waiting or idle states are now always hidden, making the session list cleaner and more focused on actual work in progress.

## Self-Check: PASSED

**Files modified exist:**
- FOUND: client/src/store/sessionStore.ts

**Changes verified:**
- Active filter logic updated to only check `s.state === 'active'`
- Waiting/idle states explicitly return false
- IDLE_TIMEOUT_MS constant removed
- Comment updated to reflect new behavior
- Build completes successfully
