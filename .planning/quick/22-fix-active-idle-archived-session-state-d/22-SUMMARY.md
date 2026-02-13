---
phase: quick
plan: 22
subsystem: session-state
tags: [session-state, idle-detection, filter-ui]
dependency_graph:
  requires:
    - shared/src/index.ts (SessionState type)
    - server/src/session-discovery.ts (determineSessionState function)
    - client/src/store/sessionStore.ts (showIdle state)
  provides:
    - Simplified session state model: 'active' | 'waiting' | 'completed'
  affects:
    - FilterBar.tsx (removed Idle checkbox)
    - All node components (removed idle from STATUS_COLORS)
    - App.tsx (removed STATE_BADGE_COLORS.idle)
tech_stack:
  added: []
  removed:
    - SessionState 'idle' variant
    - IDLE_THRESHOLD_MS server constant
    - showIdle client store state
    - Idle checkbox from FilterBar
  patterns:
    - Two-tier state model: Active (running) / Archived (completed)
    - Waiting is a subset of Active (assistant waiting for user input)
key_files:
  created: []
  modified:
    - shared/src/index.ts
    - server/src/session-discovery.ts
    - server/src/api.ts
    - server/src/watcher.ts
    - client/src/store/sessionStore.ts
    - client/src/components/FilterBar.tsx
    - client/src/components/TreeNode.tsx
    - client/src/components/NodeDetail.tsx
    - client/src/components/App.tsx
    - client/src/components/GraphView.tsx
    - client/src/components/SessionList.tsx
    - client/src/components/TreeView.tsx
    - client/src/components/DirectoryOverview.tsx
    - client/src/components/GroupDrillDownPanel.tsx
    - client/src/components/nodes/ToolNode.tsx
    - client/src/components/nodes/ToolGroupNode.tsx
    - client/src/components/nodes/SessionNode.tsx
    - client/src/components/nodes/SubagentNode.tsx
    - client/src/components/nodes/SkillNode.tsx
decisions:
  - Changed SessionState from 'active' | 'waiting' | 'idle' | 'completed' to 'active' | 'waiting' | 'completed'
  - Removed idle state detection logic from server (no longer needed)
  - Removed showIdle filter toggle from client (simplified to Active/Archived only)
  - Changed fallback default from 'idle' to 'waiting' in api.ts for empty sessions
  - Changed directory node default state from 'idle' to 'active'
metrics:
  duration: 2.1min
  completed_date: 2026-02-10
---

# Quick Task 22: Remove Idle Session State Summary

Simplified session state model from four states (active/waiting/idle/completed) to three states (active/waiting/completed). Idle state was unnecessary - sessions are either actively running or completed/archived.

## Changes Made

### Type Definition Changes
- **shared/src/index.ts**: Changed `SessionState` type from `'active' | 'waiting' | 'idle' | 'completed'` to `'active' | 'waiting' | 'completed'`

### Server Changes
- **server/src/session-discovery.ts**: Removed `IDLE_THRESHOLD_MS` constant and idle detection branch from `determineSessionState()` function
- **server/src/api.ts**: Changed fallback return from `'idle'` to `'waiting'` for empty sessions
- **server/src/watcher.ts**: Removed `idle` from `getSessionsByState()` grouped record

### Client Store Changes
- **client/src/store/sessionStore.ts**: Removed `showIdle` state, `setShowIdle` action, and idle filtering logic from `getFilteredSessions()`

### UI Filter Changes
- **client/src/components/FilterBar.tsx**: Removed Idle checkbox (only Active and Archived remain)

### Component STATUS_COLORS Changes
Removed `idle` entry from STATUS_COLORS objects in:
- TreeNode.tsx
- NodeDetail.tsx
- App.tsx
- ToolNode.tsx
- ToolGroupNode.tsx
- SessionNode.tsx
- SubagentNode.tsx
- SkillNode.tsx

### Additional Cleanup
- **GroupDrillDownPanel.tsx**: Removed 'idle' case from getStatusColor switch
- **DirectoryOverview.tsx**, **GraphView.tsx**, **SessionList.tsx**, **TreeView.tsx**: Removed showIdle from store selectors and useMemo dependencies

## Verification
- Build passes: `npm run build` completes successfully
- All idle references removed: `grep -rn "idle"` returns no matches in source files

## Deviation from Original Plan
None - plan executed exactly as specified. Additional files (App.tsx, DirectoryOverview.tsx, GraphView.tsx, SessionList.tsx, TreeView.tsx, GroupDrillDownPanel.tsx) were discovered during build verification and cleaned up as part of Rule 1 (auto-fix bugs).
