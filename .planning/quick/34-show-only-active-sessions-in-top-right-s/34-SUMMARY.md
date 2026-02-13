---
phase: quick-34
plan: 01
subsystem: ui-toolbar
tags: [session-switcher, filtering, ux-polish]
dependency_graph:
  requires: [session-state-detection]
  provides: [active-session-switcher]
  affects: [toolbar-navigation]
tech_stack:
  added: []
  patterns: [conditional-rendering, action-dropdown]
key_files:
  created: []
  modified:
    - path: client/src/components/Toolbar.tsx
      purpose: Filter session switcher to active-only, add label, remove status dots
      loc_delta: +8/-20
decisions:
  - title: Exclude current session from dropdown
    rationale: Current session already visible in toolbar title, showing in dropdown is redundant
    alternatives: [Keep current session as selected value]
    choice: Exclude and use "Switch to..." prompt
  - title: Use action-style dropdown with prompt
    rationale: Dropdown is now purely action-driven (switch to X), not status display
    alternatives: [Keep current session as selected value]
    choice: Empty value with disabled prompt option
  - title: Show "Other Sessions" label
    rationale: Clarifies dropdown purpose when it appears
    alternatives: [No label, just dropdown]
    choice: Add small gray label before dropdown
metrics:
  duration: 41s
  tasks_completed: 1
  files_modified: 1
  completed_date: 2026-02-12
---

# Quick Task 34: Show Only Active Sessions in Top Right Switcher

**One-liner:** Session switcher in toolbar now filters to active/waiting sessions only (excluding current), removes status dots, and adds "Other Sessions" label.

## Objective

Filter the top-right session switcher dropdown to only show actively running sessions (active/waiting state), remove status indicator dots, and add an "Other Sessions" label. Purpose: reduce noise by hiding idle sessions when switching — users want to jump to sessions actively doing work.

## Tasks Completed

### Task 1: Filter session switcher to active-only with label

**Status:** COMPLETE

**Changes:**
1. **Renamed and updated filter logic** (line 207-210):
   - Changed `sameDirSessions` to `otherActiveSessions`
   - Filter now includes only `state === 'active' || state === 'waiting'`
   - Excludes currently selected session (`s.id !== selectedSessionId`)

2. **Updated visibility condition** (line 305):
   - Changed from `sameDirSessions.length > 1` to `otherActiveSessions.length > 0`
   - Shows section when at least one OTHER active session exists

3. **Added "Other Sessions" label**:
   - Added `<span>` before dropdown with gray styling: `fontSize: '12px', color: '#888'`
   - Wrapped both label and select in React fragment

4. **Simplified dropdown rendering**:
   - Removed status indicator dots (no more `\u25cf`/`\u25cb` prefix)
   - Removed color styling on options (no more green/gray)
   - Changed `value` from `selectedSessionId` to empty string (action dropdown)
   - Added disabled prompt option: `<option value="" disabled>Switch to...</option>`
   - Updated title to "Switch to another active session"

**Files modified:**
- `/home/botond/claude-session-dashboard/client/src/components/Toolbar.tsx`

**Verification:**
- Build completed successfully with no TypeScript or compilation errors
- Session switcher only appears when other active/waiting sessions exist
- Dropdown excludes currently selected session
- No status dots in dropdown options
- "Other Sessions" label visible before dropdown
- Dropdown acts as action selector (not status display)

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Met

- Session switcher only lists active/waiting sessions (excluding current session)
- No status indicator dots (unicode circles) in dropdown
- "Other Sessions" label visible before dropdown
- Entire section hidden when no other active sessions exist
- Dropdown is now a clean, focused action tool for jumping to active sessions

## Technical Notes

**Before:**
- Showed all non-completed sessions (including idle)
- Included current session as selected value
- Displayed status dots (filled/empty circles) with color coding
- Visible when 2+ sessions in directory (including current)

**After:**
- Shows only active/waiting sessions (no idle/completed)
- Excludes current session entirely
- No status indicators or color coding
- "Other Sessions" label for clarity
- Action-style dropdown with "Switch to..." prompt
- Visible when 1+ other active sessions exist

**Why this improves UX:**
- Reduces noise: idle sessions not relevant for quick switching
- Clear purpose: "switch to another active session" (not status display)
- Less redundancy: current session not shown twice
- Action-driven: dropdown prompts user to select, doesn't show current state

## Self-Check: PASSED

**Files exist:**
```
FOUND: client/src/components/Toolbar.tsx
```

**Build verification:**
- TypeScript compilation: PASSED
- Vite build: PASSED (5.78s)
- No errors or warnings related to changes

All changes successfully implemented and verified.
