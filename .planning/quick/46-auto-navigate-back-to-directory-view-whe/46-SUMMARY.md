---
phase: quick-46
plan: 01
subsystem: navigation
tags: [auto-navigation, session-lifecycle, ux]
dependencies:
  requires: [sessionStore, App component]
  provides: [auto-navigation on session removal]
  affects: [directory view, session timeline view]
tech-stack:
  added: []
  patterns: [defensive navigation, dual-guard pattern]
key-files:
  created: []
  modified:
    - client/src/store/sessionStore.ts
    - client/src/App.tsx
decisions:
  - Primary guard in setSessions handles snapshot replacements (main scenario)
  - Secondary React effect guard catches edge cases (incremental updates)
  - Silent navigation (no logs/toasts) for seamless UX
  - Checks navigationView + selectedSessionId + session existence to avoid false positives
metrics:
  duration: ~3min
  completed: 2026-02-17T14:05:03Z
---

# Quick Task 46: Auto-navigate back to directory view when session disappears

**One-liner:** When viewing a session timeline and that session is removed from the snapshot, the UI automatically navigates back to directory view using a dual-guard pattern (store + React effect).

## Objective

Prevent stale session views when a session is deleted, cleared, or disappears from snapshots. Users should seamlessly return to the directory overview instead of being stuck viewing a non-existent session.

## Implementation Summary

### Changes Made

**1. sessionStore.ts - Primary guard in `setSessions`:**
- Added check when processing snapshot messages
- Detects if `navigationView === 'session-timeline'` AND `selectedSessionId` is set AND the new sessions array doesn't contain that session ID
- Resets navigation state to directory view (same fields as `exitToDirectory` action)
- Handles the primary scenario: server sends snapshot without the currently viewed session

**2. App.tsx - Secondary safety guard:**
- Added React useEffect that monitors `sessions`, `selectedSessionId`, `navigationView`, and `exitToDirectory`
- When in session-timeline view with a selected session that doesn't exist in the sessions list, calls `exitToDirectory()`
- Catches edge cases where incremental updates (not snapshot) might remove a session
- Uses individual selectors to avoid unnecessary re-renders

### Technical Approach

**Dual-guard pattern:**
- **Store-level guard**: Handles snapshot replacements (most common case)
- **Component-level guard**: Handles incremental removals and edge cases
- Both guards use the same logic: check if selected session exists in sessions list
- Silent operation: no console logs or toast notifications (seamless UX)

**Defensive checks:**
- Only triggers when `navigationView === 'session-timeline'` (not in directory view)
- Only triggers when `selectedSessionId` is set (not null)
- Only triggers when session is actually missing from the list

## Verification

- `npm run build` completed successfully with no errors
- setSessions in sessionStore.ts includes auto-navigation logic
- App.tsx has useEffect guard watching for stale selectedSessionId
- TypeScript compilation passes for both files

## Deviations from Plan

None - plan executed exactly as written.

## Output

**Files Modified:**
- `client/src/store/sessionStore.ts` - Added auto-navigation check in setSessions
- `client/src/App.tsx` - Added safety useEffect guard

## Self-Check: PASSED

**Files verified:**
```bash
# Both files exist and contain the expected logic
✓ client/src/store/sessionStore.ts - setSessions has auto-navigation check
✓ client/src/App.tsx - useEffect guard present with correct dependencies
```

**Build verification:**
```bash
# Build completed successfully
✓ npm run build - All workspaces compiled without errors
```

## Impact

**Before:** Users viewing a session timeline when that session gets removed would see a stale/empty view with no way to recover except manual navigation.

**After:** UI automatically and silently navigates back to directory view when the selected session disappears, providing a seamless experience.

**User scenarios handled:**
1. User viewing session A, runs /clear creating session B → auto-navigate to directory
2. User viewing session, server restarts and sends snapshot without it → auto-navigate to directory
3. User viewing session, session file deleted or expired → auto-navigate to directory
4. Normal session updates (session still exists) → no navigation triggered
