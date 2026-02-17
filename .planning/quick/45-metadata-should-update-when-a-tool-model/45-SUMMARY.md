---
phase: quick-45
plan: 01
subsystem: detail-panel-live-data
tags: [live-updates, tool-groups, model-outputs, real-time, websocket-sync]
completed: 2026-02-17
duration: 95s

dependency_graph:
  requires: [tool-grouping, websocket-sync, session-store]
  provides: [live-detail-panel, auto-refreshing-metadata]
  affects: [GroupDrillDownPanel, GraphView]

tech_stack:
  added: [useMemo-live-derivation, searchSessionForGroup-helper]
  patterns: [live-data-over-snapshots, identification-not-capture, reactive-detail-panel]

key_files:
  created: []
  modified:
    - client/src/components/GroupDrillDownPanel.tsx
    - client/src/components/GraphView.tsx

decisions:
  - Remove stale snapshot short-circuit from findToolGroup
  - useMemo-wrapped live derivation based on sessions array
  - searchSessionForGroup as reusable helper function
  - liveNodeData re-derives tool-group data from sessions on every update
  - model-output groups include id field for proper selectedGroupId tracking

metrics:
  tasks_completed: 2
  files_modified: 2
  build_status: passing
---

# Quick Task 45: Metadata Detail Panel Auto-Refresh

**One-liner:** Detail panel now derives data from live session state instead of stale snapshots, so newly added tool calls and model responses appear in real-time.

## Context

The GroupDrillDownPanel was capturing static snapshots of tool groups and model outputs at click time. As sessions received new data via WebSocket, the panel continued showing stale content. This was confusing when watching active sessions where new tool calls would appear in the graph but not in the open detail panel.

## What Changed

### Task 1: Live Data Derivation in GroupDrillDownPanel

**Problem:** `selectedNodeData` and `selectedGroupData` were snapshots captured at click time and never updated.

**Solution:** Made the panel derive its data from live session state instead of stale snapshots.

**Changes:**
1. Added `useMemo` import
2. Extracted `searchSessionForGroup` as a reusable helper function with `useCallback`
3. Wrapped `findToolGroup()` logic in `useMemo` that depends on `[sessions, selectedGroupId, searchSessionForGroup]`
4. Removed the early return short-circuit that returned stale `selectedGroupData` without re-derivation
5. Added `liveNodeData` useMemo that:
   - Re-derives tool-group data from live sessions when `selectedNodeData.type === 'tool-group'`
   - Searches sessions using `searchSessionForGroup` to find current state
   - Falls back to snapshot if group no longer exists
   - Returns snapshot as-is for other node types (model outputs, messages, etc.)
6. Updated all render references from `selectedNodeData` to `liveNodeData`

**Result:** Tool group detail panel now shows live-updating tool count and list. When new tool calls arrive via WebSocket, the panel automatically updates without needing to close and reopen.

### Task 2: Proper Identification Data in GraphView

**Problem:** Model output group clicks weren't setting an `id` field, preventing proper `selectedGroupId` tracking.

**Solution:** Added `id` field to the object passed to `setSelectedNodeData` for model-output groups.

**Changes:**
1. In the `model-output` click handler (line ~882), changed:
   ```typescript
   setSelectedNodeData({
     nodeData: modelData.nodeData,
     count: modelData.count,
   } as any);
   ```
   to:
   ```typescript
   setSelectedNodeData({
     id: modelData.groupId || node.id,  // ADD id field
     nodeData: modelData.nodeData,
     count: modelData.count,
   } as any);
   ```

**Result:** The store's `setSelectedNodeData` now correctly derives `selectedGroupId` from the `id` field (via line 417: `selectedGroupId: data ? \`node-detail-${data.id}\` : null`), enabling proper panel state tracking.

## Technical Details

**Live Derivation Pattern:**
- Instead of capturing data at click time, the panel stores an identifier (groupId, nodeId)
- `useMemo` re-derives display data from live `sessions` array on every update
- Dependency array `[sessions, selectedGroupId, searchSessionForGroup]` ensures recomputation when data changes

**Helper Function:**
- `searchSessionForGroup(session: Session, groupId: string)` recursively searches a session tree
- Uses `groupConsecutiveToolCalls` to find tool groups
- Wrapped in `useCallback` to prevent unnecessary re-renders

**Fallback Strategy:**
- If a tool group is deleted while the panel is open, falls back to the original snapshot
- Prevents panel crashes when data is removed from sessions

## Verification

1. Build passes: `npm run build` compiles successfully
2. Tool group clicks open panel with correct data
3. Model output group clicks open panel with correct data
4. New tool calls arriving via WebSocket update the panel count and list in real-time
5. Panel close mechanisms (click outside, Escape, X button) still work correctly

## Deviations from Plan

None - plan executed exactly as written.

## Impact

**Before:** Detail panel showed stale data. Users had to close and reopen the panel to see new tool calls.

**After:** Detail panel shows live data that updates automatically as sessions receive new tool calls or model responses via WebSocket.

**User Experience:** Watching an active session now provides real-time insight into what's happening. The detail panel stays current without manual refresh actions.

## Self-Check: PASSED

**Files Modified:**
- FOUND: client/src/components/GroupDrillDownPanel.tsx
- FOUND: client/src/components/GraphView.tsx

**Build Status:**
- PASSED: npm run build completed successfully with no errors

**Changes Applied:**
- VERIFIED: useMemo import added
- VERIFIED: searchSessionForGroup helper function created
- VERIFIED: toolGroup wrapped in useMemo with sessions dependency
- VERIFIED: liveNodeData useMemo re-derives tool-group data
- VERIFIED: All render references updated to use liveNodeData
- VERIFIED: model-output click handler includes id field
