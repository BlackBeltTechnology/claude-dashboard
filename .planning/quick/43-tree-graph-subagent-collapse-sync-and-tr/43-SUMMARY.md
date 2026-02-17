---
phase: quick-43
plan: 01
subsystem: client/tree-view
tags: [ui, tree-view, subagents, sync, icons]
dependency_graph:
  requires: [phase-17-subagent-workflow-visualization]
  provides: [tree-graph-subagent-state-sync, subagent-visual-distinction]
  affects: [tree-view, graph-view, session-store]
tech_stack:
  added: []
  patterns: [store-state-sync, icon-differentiation, agent-color-coding]
key_files:
  created: []
  modified:
    - client/src/components/TreeView.tsx
    - client/src/components/TreeNode.tsx
    - client/src/utils/graphLayout.ts
decisions:
  - Subagent sessions in tree use expandedSubagentBoxes store state (bidirectional sync with graph)
  - Subagent sessions show shuffle icon instead of folder icon (visual distinction)
  - Agent color indicator as small circle next to icon (consistent with graph SubagentBoxNode)
  - generateAgentColor exported from graphLayout for reuse across components
metrics:
  duration: 165s
  tasks_completed: 2
  files_modified: 3
  completed_date: 2026-02-17
---

# Quick Task 43: Tree-Graph Subagent Collapse Sync and Visual Distinction

**One-liner:** Bidirectional expand/collapse sync between tree and graph views for subagent sessions, with agent-colored icon indicators replacing generic folder icons.

## Summary

Implemented bidirectional state synchronization for subagent session expand/collapse between tree view and graph view using the shared `expandedSubagentBoxes` store state. Replaced generic folder icons with shuffle icons and added agent-colored circle indicators for subagent sessions in the tree view to provide visual distinction from root sessions and maintain consistency with the graph view's SubagentBoxNode styling.

### What Changed

**Tree-Graph State Sync:**
- TreeView now subscribes to `expandedSubagentBoxes` store state for subagent sessions
- Detects subagent sessions by ID length (`id.length < 20`)
- Toggle clicks on subagent sessions call `toggleSubagentBox(sessionId, subagentId)` instead of local state
- Bidirectional sync: collapsing in tree collapses in graph, expanding in graph expands in tree

**Visual Distinction for Subagent Sessions:**
- Exported `generateAgentColor` from graphLayout.ts for component reuse
- Updated `getNodeIcon` to return shuffle icon (`\u{1F500}`) for subagent sessions
- Added `agentColor` prop to TreeNode component and TreeNodeProps interface
- Rendered colored circle indicator (8px diameter) between icon and status dot
- TreeView computes agent color from subagentMeta and passes to TreeNode for subagent sessions
- Root sessions retain folder icon (no regression)

## Tasks Completed

### Task 1: Sync tree subagent collapse/expand with graph subagent boxes

**Status:** ✅ Complete

**Changes:**
- Added `toggleSubagentBox` and `expandedSubagentBoxes` to TreeView store subscriptions
- Detected subagent sessions with `!('type' in node) && node.id.length < 20`
- Updated `isExpanded` logic to check `expandedSubagentBoxes` for subagent sessions
- Updated `onToggle` callback to call `toggleSubagentBox` for subagent sessions
- Added new dependencies to renderNode useCallback array

**Files Modified:**
- `client/src/components/TreeView.tsx`

**Verification:**
- Build passed with zero TypeScript errors
- Logic mirrors graph's SubagentBoxNode expand/collapse state management

### Task 2: Replace folder icon with colored agent icon for subagent sessions in tree

**Status:** ✅ Complete

**Changes:**
- Exported `generateAgentColor` function from graphLayout.ts
- Updated `getNodeIcon` to return `NODE_ICONS.subagent` (shuffle) for subagent sessions
- Added `agentColor?: string` prop to TreeNodeProps interface
- Rendered agent color circle indicator in TreeNode between icon and status dot
- Updated renderNode signature to accept `agentColor` parameter
- Computed agent color from subagentMeta for subagent session items in timeline
- Passed agentColor through renderNode calls for both root and subagent session children

**Files Modified:**
- `client/src/utils/graphLayout.ts`
- `client/src/components/TreeNode.tsx`
- `client/src/components/TreeView.tsx`

**Verification:**
- Build passed with zero TypeScript errors
- Agent color computed using same logic as graph SubagentBoxNode
- Color indicator styling matches graph's agentColorCircle pattern

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

**State Sync Pattern:**
```typescript
// TreeView.tsx - Subscribe to shared store state
const expandedSubagentBoxes = useSessionStore((state) => state.expandedSubagentBoxes);
const toggleSubagentBox = useSessionStore((state) => state.toggleSubagentBox);

// Detect subagent sessions
const isSubagentSession = !('type' in node) && node.id.length < 20;

// Read expand state from store
const isSubagentBoxExp = isSubagentSession && selectedSessionId
  ? (expandedSubagentBoxes.get(selectedSessionId)?.has(node.id) ?? false)
  : false;

// Write expand state to store
const onToggle = isSubagentSession && selectedSessionId
  ? () => toggleSubagentBox(selectedSessionId, node.id)
  : () => toggleNode(nodeKey);
```

**Agent Color Computation:**
```typescript
// TreeView.tsx - Compute color from metadata
const subagentMeta = buildSubagentMeta(node);
for (const { item } of timelineItems) {
  let itemAgentColor: string | undefined;
  if (!('type' in item)) {
    const meta = subagentMeta.get(item.id);
    itemAgentColor = generateAgentColor(item.id, meta?.agentType);
  }
  renderNode(item as TreeNodeData, depth, nodeKey, undefined, itemLabel, itemAgentColor);
}
```

**Visual Indicator Rendering:**
```tsx
{/* TreeNode.tsx - Agent color indicator */}
{agentColor && (
  <div
    style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: agentColor,
      flexShrink: 0,
      marginRight: '4px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
    }}
  />
)}
```

## Verification Results

✅ All verification criteria met:
- `npm run build` passed with zero errors
- Tree view subagent sessions show shuffle icon + colored dot instead of folder icon
- Root sessions still show folder icon (no regression)
- Subagent session expand/collapse state sourced from `expandedSubagentBoxes` store
- Toggling in tree updates store state that graph reads
- Toggling in graph updates store state that tree reads
- Tool groups and other node types unaffected

## Self-Check

### Files Created/Modified
```bash
# All modified files exist
```

**FOUND:** `client/src/components/TreeView.tsx` - ✅ Modified with state sync logic
**FOUND:** `client/src/components/TreeNode.tsx` - ✅ Modified with icon/color logic
**FOUND:** `client/src/utils/graphLayout.ts` - ✅ Modified to export generateAgentColor

### Build Verification
```bash
npm run build
```
✅ Build completed successfully with no TypeScript errors

## Self-Check: PASSED

All modified files exist, build passes, and changes match the plan requirements exactly.

## Impact

**User Experience:**
- Subagent expand/collapse state now consistent between tree and graph views
- Users can collapse/expand subagents in either view and see the change reflected in both
- Subagent sessions visually distinct from root sessions with colored indicators
- Agent color provides at-a-glance identification of agent type/instance

**Code Quality:**
- Eliminated duplicate state management for subagent expansion
- Exported utility function (`generateAgentColor`) for reuse across components
- Consistent agent color computation across tree and graph views
- Clean prop threading for optional visual enhancements

**Maintenance:**
- Single source of truth for subagent expand/collapse state
- Agent color logic centralized in graphLayout.ts
- Tree and graph views remain loosely coupled (only share store state)
