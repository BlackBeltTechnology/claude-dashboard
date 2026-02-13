---
phase: 09-clear-session-group-button-and-working-directory-graph-overview
plan: 01
subsystem: ui-filtering
tags: [ui, zustand, session-management, filtering]
dependency_graph:
  requires: [session-grouping, zustand-store]
  provides: [cwd-filtering, clear-sessions]
  affects: [SessionList, sessionStore]
tech_stack:
  added: []
  patterns: [zustand-set-state, filtering-not-removal, confirmation-dialogs]
key_files:
  created: []
  modified:
    - client/src/store/sessionStore.ts
    - client/src/components/SessionList.tsx
decisions:
  - "Use Set<string> for hiddenCwds to enable O(1) lookup in filter"
  - "Apply hiddenCwds filter after existing filter/search logic for layered filtering"
  - "Filter sessions (not remove) to prevent WebSocket update conflicts"
  - "Show Clear button on hover only to reduce visual clutter"
  - "Use window.confirm for destructive action confirmation"
  - "Display directory name and session count in confirmation dialog"
metrics:
  duration_seconds: 107
  completed_date: 2026-02-09
---

# Phase 09 Plan 01: Clear Session Group Button Summary

**One-liner:** Add hover-activated Clear button to working directory groups that hides sessions via Zustand filtering with confirmation dialog.

## Implementation Details

### Task 1: Add hiddenCwds state and actions to sessionStore

**Status:** Complete

Added state management for hiding sessions by working directory:

- Added `hiddenCwds: Set<string>` to SessionStore interface and initial state
- Added `hideSessionsByCwd(cwd: string)` action that adds cwd to hiddenCwds set
- Added `unhideAllCwds()` action that clears hiddenCwds set
- Updated `getFilteredSessions()` to apply hiddenCwds filter after existing filter/search logic
- Used Set for O(1) lookup performance when filtering sessions

**Key changes:**
- Interface: Added `hiddenCwds: Set<string>` and two new actions
- Initial state: `hiddenCwds: new Set<string>()`
- Filter logic: Sessions with `cwd` in `hiddenCwds` are excluded from results
- Layered filtering: hiddenCwds filter applied after type/search filters

### Task 2: Add Clear button to SessionList group headers

**Status:** Complete

Added Clear button with hover activation and confirmation dialog:

- Added `isClearHovered` state for button hover styling
- Clear button only appears when group header is hovered (`isHovered`)
- `handleClear` function:
  - Calls `e.stopPropagation()` to prevent group expand/collapse
  - Shows confirmation dialog with directory name and session count
  - Calls `sessionStore.hideSessionsByCwd(cwd)` on confirmation
- Styled button with red background (`#dc2626`) for destructive action indication
- Updated SessionList to use `getFilteredSessions()` instead of raw `sessions` array

**Key changes:**
- Added Clear button styles (red, small, hover state)
- Confirmation dialog message: "Clear all N session(s) from 'directory'?"
- Button placement: Right side of group header after session count
- Integration: Uses Zustand `hideSessionsByCwd` action from store

## Verification

Both tasks verified via TypeScript compilation:
- ✅ No type errors for `hiddenCwds` in SessionStore interface
- ✅ Clear button properly integrated with Zustand store actions
- ✅ Build successful (shared, server, client workspaces compiled)

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Met

- ✅ hiddenCwds state added to sessionStore with hide/unhide actions
- ✅ getFilteredSessions applies hiddenCwds filter after existing filters
- ✅ Clear button visible on hover in SessionList group headers
- ✅ Confirmation dialog prevents accidental clears (shows directory name and count)
- ✅ Sessions filtered by cwd (not removed) to prevent WebSocket conflicts
- ✅ TypeScript compilation passes without errors

## Architecture Notes

**Filtering over Removal:**
The implementation uses filtering (not removal from sessions array) to avoid conflicts when WebSocket updates arrive. Hidden sessions remain in the store's sessions array but are excluded from `getFilteredSessions()` results. This prevents race conditions where a WebSocket update could re-add a "removed" session.

**Layered Filtering:**
The hiddenCwds filter is applied after existing type/search filters in `getFilteredSessions()`, allowing users to combine hiding directories with other filtering mechanisms.

**UI Pattern:**
The hover-activated Clear button reduces visual clutter while maintaining discoverability. The red color and confirmation dialog provide clear affordance that this is a destructive action.

## Self-Check: PASSED

**Files modified:**
- ✅ /home/botond/claude-session-dashboard/client/src/store/sessionStore.ts
- ✅ /home/botond/claude-session-dashboard/client/src/components/SessionList.tsx

**Code verification:**
- ✅ hiddenCwds: Set<string> present in SessionStore interface (line 42)
- ✅ hideSessionsByCwd and unhideAllCwds actions exported (lines 60-61)
- ✅ getFilteredSessions applies hiddenCwds filter (lines 250-267)
- ✅ Clear button in CollapsibleSessionGroup with confirmation (lines 184-217)
- ✅ TypeScript compilation successful
