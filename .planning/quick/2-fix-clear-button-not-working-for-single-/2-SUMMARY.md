---
phase: quick-2
plan: 01
subsystem: ui-session-list
tags: [bugfix, session-management, clear-button]
dependency_graph:
  requires: [phase-04-01-collapsible-session-groups, phase-09-01-clear-button]
  provides: [consistent-clear-button-access]
  affects: [session-list-rendering]
tech_stack:
  added: []
  patterns: [consistent-group-rendering]
key_files:
  created: []
  modified:
    - path: client/src/components/SessionList.tsx
      impact: Removed single-session bypass, all groups now render with CollapsibleSessionGroup
decisions:
  - choice: Remove special case for single-session groups entirely
    rationale: CollapsibleSessionGroup already handles any session count correctly, special case prevented Clear button access
    alternatives_considered: [add Clear button to bare SessionItem, conditional Clear button rendering]
    trade_offs: Minimal visual change (single-session groups now show group header with "(1)" count)
metrics:
  duration_seconds: 33
  completed_at: "2026-02-09T14:43:36Z"
---

# Quick Task 2: Fix Clear Button Not Working for Single-Session Groups

**One-liner:** Removed single-session group bypass to enable Clear button access for all cwd groups regardless of session count.

## Problem

The Clear button (which calls `hideSessionsByCwd`) was not accessible for cwd groups containing only a single session. This was due to lines 301-312 in `SessionList.tsx` which rendered a bare `SessionItem` without the `CollapsibleSessionGroup` wrapper when `groupSessions.length === 1`. Since the Clear button only exists inside `CollapsibleSessionGroup`, single-session groups had no way to be cleared/hidden.

This was an oversight from Phase 04-01 which optimized single-session groups to avoid "unnecessary UI complexity" by rendering them without the group wrapper. When Phase 09-01 added the Clear button functionality, it was only added to `CollapsibleSessionGroup`, breaking the feature for single-session groups.

## Solution

Removed the `if (groupSessions.length === 1)` conditional branch entirely from the render loop (lines 300-326). Now ALL groups render via `CollapsibleSessionGroup` regardless of session count:

```tsx
{Array.from(sessionGroups.entries()).map(([cwd, groupSessions]) => (
  <CollapsibleSessionGroup
    key={cwd}
    cwd={cwd}
    sessions={groupSessions}
    displayNames={displayNames}
    selectedSessionId={selectedSessionId}
    onSessionSelect={setSelectedSession}
  />
))}
```

No changes were needed to `CollapsibleSessionGroup` itself - it already correctly handles groups of any size by mapping over the sessions array.

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Details

**Files Modified:**
- `client/src/components/SessionList.tsx` (lines 300-326): Replaced conditional rendering with consistent `CollapsibleSessionGroup` wrapper for all group sizes

**Visual Changes:**
- Single-session groups now display with group header (chevron, directory name, "(1)" count badge)
- Clear button appears on hover for all groups, including single-session ones
- Multi-session groups continue to work identically to before

**Behavior:**
1. User hovers over any cwd group header (including single-session)
2. Clear button appears
3. Clicking Clear shows confirmation dialog with session count
4. Confirming clears/hides the entire group via `hideSessionsByCwd(cwd)`

## Verification

- Build completed successfully with no TypeScript errors
- All cwd groups now render consistently through `CollapsibleSessionGroup`
- Clear button is accessible for groups of any size (1 session or many)
- Confirmation dialog correctly pluralizes message based on session count

## Impact

**Fixed:**
- Clear button now accessible for single-session cwd groups
- Consistent UI pattern for all group sizes

**User Experience:**
- Users can now clear/hide any cwd group regardless of how many sessions it contains
- Slight visual consistency improvement: all groups now have the same header structure

## Self-Check: PASSED

**Verified modified files exist:**
```
FOUND: client/src/components/SessionList.tsx
```

**Verified changes applied:**
- Single-session bypass removed (lines 301-312 eliminated)
- All groups render via CollapsibleSessionGroup
- Build successful with no errors

All claims in this summary are verified and accurate.
