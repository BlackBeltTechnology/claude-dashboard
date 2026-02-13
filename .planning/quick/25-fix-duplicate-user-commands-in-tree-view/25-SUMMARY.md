---
phase: quick-25
plan: 01
subsystem: tree-view
tags: [bugfix, deduplication, user-interface]
dependency_graph:
  requires: []
  provides: [deduplicated-tree-view]
  affects: [tree-view-rendering]
tech_stack:
  added: []
  patterns: [client-side-filtering]
key_files:
  created: []
  modified: [client/src/components/TreeView.tsx]
decisions:
  - Filter user-role MessageNodes in tree view (buildNodes creates both MessageNode and UserPromptNode/ClearMarkerNode)
  - Client-side filtering approach (no server changes needed)
metrics:
  duration: 2min
  completed: 2026-02-12
---

# Quick Task 25: Fix Duplicate User Commands in Tree View

**One-liner:** Filter out redundant user-role MessageNodes to eliminate duplicate user message entries in tree view

## Context

The `buildNodes` function in `session-discovery.ts` creates BOTH a `MessageNode` (type: 'message', role: 'user') AND a `UserPromptNode` (type: 'user-prompt') or `ClearMarkerNode` (type: 'clear-marker') for each user message. The tree view was rendering all of them, causing every user message to appear twice with different icons.

## What Was Done

### Task 1: Filter out user-role MessageNodes from tree view session children

**Files Modified:** `client/src/components/TreeView.tsx`

Added filtering logic to skip MessageNodes with `role === 'user'` when processing session children. The filter is placed at the top of the `node.nodes.forEach` callback (line 241-249) before any other processing.

**Key Change:**
```typescript
// Filter out user-role messages (they're represented by UserPromptNode or ClearMarkerNode)
if (messageNode.role === 'user') {
  return;
}
```

**Rationale:**
- Every user message with content already has a UserPromptNode or ClearMarkerNode created by buildNodes
- User MessageNodes with empty content are already filtered by the `isEmptyContent` check
- Assistant-role MessageNodes are still rendered (they show response text)
- Tool/skill/subagent nodes are not MessageNodes, so they pass through unchanged
- UserPromptNode and ClearMarkerNode are not MessageNodes, so they pass through unchanged

## Verification

- Build completed successfully with no TypeScript errors
- User messages now appear exactly once in the tree view (via UserPromptNode or ClearMarkerNode)
- User prompts display with speech bubble icon (UserPromptNode)
- Clear commands display with scissors icon (ClearMarkerNode)
- Assistant messages, tool calls, subagents, and skills render correctly
- Subagent session children (synthetic request/response nodes created at lines 320-349) are unaffected

## Deviations from Plan

None - plan executed exactly as written.

## Impact

**Before:** Each user message appeared twice in the tree view:
1. Once as a person-icon MessageNode (role: 'user')
2. Once as a UserPromptNode (speech bubble) or ClearMarkerNode (scissors)

**After:** Each user message appears exactly once with the appropriate specialized node type and icon.

## Success Criteria

- [x] No duplicate entries in tree view for any user message
- [x] Build passes cleanly
- [x] All other tree view functionality preserved
- [x] User prompts show with UserPromptNode formatting (speech bubble icon)
- [x] Clear markers show with ClearMarkerNode formatting (scissors icon)
- [x] Assistant messages still appear normally

## Self-Check: PASSED

**Files Modified:**
- FOUND: /home/botond/claude-session-dashboard/client/src/components/TreeView.tsx

**Build Status:**
- PASSED: TypeScript compilation successful
- PASSED: Vite production build successful

All verification criteria met.
