---
phase: 44-ux-fixes
plan: 02
subsystem: client
tags: [ux, navigation, tree-view, auto-scroll]
requires: [client/src/components/TreeView.tsx, client/src/store/sessionStore.ts]
provides: [auto-disable-follow-end-on-tree-click]
affects: [tree-navigation, graph-focus, follow-end-toggle]
tech-stack:
  added: []
  patterns: [zustand-store-action, callback-side-effect]
key-files:
  created: []
  modified:
    - client/src/components/TreeView.tsx
decisions:
  - Auto-disable follow-end on tree node click prevents auto-scroll from fighting user navigation
  - setFollowPipelineEnd(false) called as first line in selectNode callback for immediate effect
  - Added to useCallback dependencies to prevent stale closure bugs
metrics:
  duration: ~2min
  completed: 2026-02-17T09:27:54Z
---

# Phase 44 Plan 02: Auto-disable Follow End on Tree Navigation Summary

Auto-disable the "Follow End" toggle when users click tree nodes to prevent graph auto-scroll from fighting deliberate navigation.

## Tasks Completed

### Task 1: Auto-disable followPipelineEnd on tree node click

**Status:** Complete

**Changes:**
1. Added `setFollowPipelineEnd` selector from sessionStore (line 285)
2. Added `setFollowPipelineEnd(false)` as first line in `selectNode` callback (line 318) — disables follow-end before setting focused node
3. Added `setFollowPipelineEnd` to useCallback dependency array (line 357) — prevents stale closure

**Files Modified:**
- `client/src/components/TreeView.tsx` — 3 line additions

**Verification:**
- `npm run build` passed with no TypeScript errors
- Build completed in 9.58s with no type issues

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

**Flow:**
1. User clicks any tree node
2. `selectNode` callback fires
3. **First action:** `setFollowPipelineEnd(false)` — immediately disables auto-scroll
4. Then: `setSelectedNodeKey(nodeKey)` — updates selection
5. Then: Navigation logic proceeds (expandAllSubagentBoxes, setFocusedNode, etc.)
6. Result: GraphFocusHandler navigates to clicked node without follow-end fighting it

**Why This Order Matters:**
- Disabling follow-end BEFORE setFocusedNode ensures GraphFocusHandler receives the correct follow-end state when it reacts to focusedNodeId change
- If follow-end were still enabled during navigation, GraphFocusHandler would try to scroll to the end node instead of the clicked node

## Verification

All success criteria met:
- Follow-end is automatically disabled when user clicks a tree node
- No TypeScript errors or build failures
- Implementation matches plan specification exactly

## Self-Check: PASSED

**Files modified exist:**
```
FOUND: client/src/components/TreeView.tsx
```

**No commits created (per user preference):**
Git operations disabled per project configuration.
