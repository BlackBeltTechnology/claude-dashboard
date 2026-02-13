---
phase: quick-4
plan: 01
subsystem: session-filtering
tags: [ui, filter, session-state]
completed: 2026-02-09T15:56:56Z
duration: 1.7min

dependency_graph:
  requires: []
  provides:
    - Three-state session filter (Active/Idle/Archived)
    - Completed session visibility toggle
  affects:
    - FilterBar component
    - SessionList component
    - sessionStore Zustand store

tech_stack:
  added: []
  patterns:
    - Session state to toggle mapping (active+waiting→Active, idle→Idle, completed→Archived)
    - Zustand state subscription for reactive filtering

key_files:
  created: []
  modified:
    - client/src/store/sessionStore.ts (added showArchived state + setter + filter logic)
    - client/src/components/FilterBar.tsx (added Archived checkbox)
    - client/src/components/SessionList.tsx (subscribed to showArchived for reactivity)

decisions:
  - Map session states to UI toggles: active+waiting→Active, idle→Idle, completed→Archived (matches user mental model of session lifecycle)
  - All three toggles default to true (show everything by default, user opts out selectively)
  - Completed sessions now filterable instead of unconditionally hidden (removes hardcoded assumption)

metrics:
  tasks_completed: 2
  tasks_total: 2
  build_status: passing
  typescript_errors: 0
---

# Quick Task 4: Implement Idle/Active/Archived Session State Filters

**One-liner:** Three-toggle session filter (Active/Idle/Archived) with completed sessions now visible and filterable.

## Objective

Implement idle/active/archived session state filters in the FilterBar component. Previously, only Active and Idle toggles existed, and completed sessions were unconditionally hidden. This adds the missing Archived toggle and ensures all three session states are user-controllable.

## Implementation Summary

### Task 1: Add showArchived to Zustand store and fix getFilteredSessions

**Files modified:**
- `client/src/store/sessionStore.ts`
- `client/src/components/SessionList.tsx`

**Changes:**
1. Added `showArchived: boolean` to `SessionStore` interface (defaults to `true`)
2. Added `setShowArchived: (show: boolean) => void` action to interface
3. Initialized `showArchived: true` in store creation
4. Implemented `setShowArchived` action setter
5. Updated `getFilteredSessions()` filter logic:
   - Removed unconditional `completed` session hide
   - Mapped states to toggles: `active`/`waiting` → `showActive`, `idle` → `showIdle`, `completed` → `showArchived`
6. Updated `SessionList.tsx`:
   - Added `showArchived` selector subscription
   - Added `showArchived` to useMemo dependency array for reactivity

**Verification:** Build passed with no TypeScript errors.

### Task 2: Add Archived toggle to FilterBar

**Files modified:**
- `client/src/components/FilterBar.tsx`

**Changes:**
1. Added `showArchived` and `setShowArchived` selectors
2. Added third checkbox label after Idle toggle:
   - Checkbox bound to `showArchived` state
   - onChange handler calls `setShowArchived`
   - Label text: "Archived"

**Verification:** Build passed with no TypeScript errors. FilterBar now renders three checkboxes: Active, Idle, Archived.

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

Build verification completed successfully. All TypeScript compilation passes with no errors.

**Expected behavior:**
1. FilterBar displays three checkboxes: Active, Idle, Archived
2. All three default to checked (all sessions visible)
3. Unchecking Active: hides sessions with state `active` or `waiting`
4. Unchecking Idle: hides sessions with state `idle`
5. Unchecking Archived: hides sessions with state `completed`
6. Completed sessions are no longer unconditionally hidden from the UI

## Success Criteria Met

- [x] FilterBar has Active, Idle, and Archived toggle checkboxes
- [x] Each toggle controls visibility of its corresponding session states
- [x] All three default to true (all sessions visible)
- [x] Completed sessions are no longer unconditionally hidden
- [x] Build passes with no TypeScript errors

## Self-Check: PASSED

**Files exist:**
- FOUND: client/src/store/sessionStore.ts
- FOUND: client/src/components/FilterBar.tsx
- FOUND: client/src/components/SessionList.tsx

**Build status:** PASSED (no TypeScript errors, Vite build successful)

## Next Steps

None - quick task complete. User can now filter sessions by Active, Idle, and Archived states. All sessions are visible by default, giving users full control over which session states to display.
