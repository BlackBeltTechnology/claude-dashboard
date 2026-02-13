---
phase: 07-horizontal-timeline-graph-with-subagent-convergence
plan: 02
subsystem: client-graph-layout
tags: [graph-layout, horizontal-timeline, fork-join, subagent-expansion, dagre]
dependency_graph:
  requires: [07-01-foundation, zustand-expansion-state, react-flow-nodes]
  provides: [horizontal-timeline-graph, fork-join-convergence, inline-subagent-tools]
  affects: [graph-view, session-visualization]
tech_stack:
  added: []
  patterns: [fork-join-convergence, invisible-join-nodes, inline-expansion]
key_files:
  created: []
  modified:
    - client/src/utils/graphLayout.ts
    - client/src/components/GraphView.tsx
key_decisions:
  - decision: "LR dagre layout with adjusted spacing for horizontal timeline"
    rationale: "nodesep 80 for vertical space between branches, ranksep 120 for horizontal spacing along timeline creates natural left-to-right flow"
    alternatives: ["Keep TB layout", "Use custom layout algorithm"]
  - decision: "Fork-join pattern with invisible join nodes for subagent convergence"
    rationale: "Dagre requires nodes for layout calculations; invisible nodes (hidden: true) provide convergence points without visual clutter"
  - decision: "Inline tool expansion within subagent branches"
    rationale: "Keeps related work spatially grouped on the branch; avoids complex side panel interactions"
  - decision: "Nested subagents render linearly (no recursive fork-join)"
    rationale: "Per research: prevents visual complexity explosion; rare case not worth added layout complexity"
  - decision: "Subagent node click toggles expansion (not detail panel)"
    rationale: "Primary user need is seeing tool calls inline; detail panel can be future enhancement via double-click"
metrics:
  duration_seconds: 163
  tasks_completed: 2
  files_modified: 2
  completed_date: "2026-02-09"
---

# Phase 07 Plan 02: Horizontal Timeline Graph with Fork-Join Convergence Summary

**One-liner:** Horizontal LR timeline graph with fork-join subagent convergence using invisible join nodes and inline tool expansion on branches.

## Objective

Implement the core horizontal timeline graph with fork-join subagent convergence. Rewrite graphLayout.ts to use LR dagre layout with dummy join nodes for subagent branch convergence, conditionally render subagent tool calls inline when expanded, and wire GraphView to handle subagent click expansion.

## What Was Built

### 1. Horizontal LR Layout Engine (Task 1)

**Modified `graphLayout.ts`:**

**Added join-node dimensions:**
- `'join-node': { width: 1, height: 1 }` - minimal invisible size for layout calculations

**Changed default layout direction to LR:**
- `applyDagreLayout` default changed from `'TB'` to `'LR'`
- Adjusted spacing: `nodesep: 80` (vertical space between parallel branches), `ranksep: 120` (horizontal timeline progression)

**Updated function signatures to thread `expandedSubagents`:**
- `convertSessionToGraph(session, expandedGroups, expandedSubagents, parentNodeId?)`
- `convertSessionsToGraph(sessions, expandedGroups, expandedSubagents)`
- `createLayoutedGraph(sessions, expandedGroups, expandedSubagents)`
- Removed `isSubagent` parameter - no longer needed with fork-join pattern

**Result:** All graph layout functions now accept and propagate subagent expansion state through the layout calculation pipeline.

### 2. Fork-Join Subagent Convergence Pattern (Task 1)

**Replaced recursive subagent processing with fork-join pattern:**

**For each subagent session:**
1. **Create invisible join node** where all branches converge
2. **Fork edge** from last main timeline node to subagent node
3. **Conditionally render tools inline** when subagent is expanded:
   - Group tools same way as main session (consistency)
   - Render tool-groups and individual tools on the branch
   - Apply tool group expansion state
   - Handle nested subagents linearly (no recursive fork-join)
4. **Join edge** from branch tail to join node
5. **Continue main timeline** from join node

**Key implementation details:**
- `forkPointId = prevNodeId` - last node before subagents
- `joinNodeId = ${session.id}-join-after-subagents` - convergence point
- `hidden: true` on join node - invisible but participates in layout
- `isExpanded = expandedSubagents.has(subagent.id)` - check expansion state
- `toolCallCount` calculated and passed to SubagentNode for expansion indicator
- Subagent branch tail tracked separately for each branch

**Nested subagent handling:**
- Rendered as linear nodes on the branch (no recursive fork-join)
- Prevents visual complexity explosion
- Rare edge case per research

### 3. GraphView Integration (Task 2)

**Modified `GraphView.tsx`:**

**Registered join-node type:**
```typescript
import { JoinNode } from './nodes/index';

const nodeTypes: NodeTypes = {
  // ...existing types...
  'join-node': JoinNode,
};
```

**Added expansion state selectors:**
- `expandedSubagents` from store
- `toggleSubagentExpansion` action

**Passed expandedSubagents to layout:**
```typescript
const { nodes, edges } = useMemo(
  () => createLayoutedGraph(displaySessions, expandedGroups, expandedSubagents),
  [displaySessions, expandedGroups, expandedSubagents]
);
```

**Wired subagent click handler:**
- Clicking subagent node toggles expansion (shows/hides tools inline)
- Helper function `findSubagentSessionId` extracts subagent session ID from React Flow node ID
- Searches recursively through session hierarchy to find matching subagent
- Calls `toggleSubagentExpansion(subagentSessionId)`
- Layout recalculates automatically via useMemo dependency

**Separated subagent and skill click handling:**
- Subagent clicks → toggle expansion
- Skill clicks → open detail panel (existing behavior preserved)

## Technical Implementation

### Fork-Join Pattern

The fork-join pattern creates parallel branches that reconverge:

```
Session → Tool → [Fork Point]
                      ├→ Subagent A → [tools if expanded] → Join
                      ├→ Subagent B → [tools if expanded] → Join
                      └→ Subagent C → [tools if expanded] → Join
                                                            ↓
                                                    [Continue Timeline]
```

**Join node characteristics:**
- `type: 'join-node'`
- `hidden: true` - invisible in React Flow
- `width: 1, height: 1` - minimal dimensions for dagre
- React component renders `null`
- Participates in dagre layout calculations but produces no visual output

### Inline Tool Expansion Logic

When subagent is expanded (`expandedSubagents.has(subagent.id)`):

1. Filter message nodes (same as main session)
2. Group consecutive tool calls with `groupConsecutiveToolCalls`
3. Process grouped items (tool-group, tool, skill, nested subagent):
   - Create nodes with `createNodeId(subagent.id, item.id)`
   - Chain edges from `branchTailId` to current node
   - Update `branchTailId` to current node for next item
   - Apply tool group expansion if group is expanded
4. Final join edge connects `branchTailId` → `joinNodeId`

**Result:** Tools appear inline on the subagent branch, spatial grouping preserved.

### Layout Recalculation

The useMemo dependency array includes `expandedSubagents`, so:
1. User clicks subagent node
2. `toggleSubagentExpansion` updates store
3. `expandedSubagents` Set changes
4. useMemo detects change → recalculates layout
5. React Flow re-renders with new node/edge positions

**Performance:** Dagre recalculates entire layout on expansion, but this is acceptable for typical session sizes (<100 nodes).

## Verification

**Build verification:**
```bash
npm run build  # ✓ All workspaces compiled successfully
```

**LR layout verification:**
- ✅ `applyDagreLayout` default direction is `'LR'`
- ✅ `rankdir: direction` set to 'LR' by default
- ✅ `nodesep: 80` and `ranksep: 120` for LR layout

**Fork-join pattern verification:**
- ✅ `join-node` dimensions added to NODE_DIMENSIONS
- ✅ Join node created with `hidden: true`
- ✅ Fork edges from fork point to each subagent
- ✅ Join edges from branch tails to join node
- ✅ `prevNodeId` updated to continue from join node

**Expansion state verification:**
- ✅ `expandedSubagents` threaded through all layout functions
- ✅ `isExpanded` checked before rendering subagent tools
- ✅ `toolCallCount` calculated and passed to SubagentNode

**GraphView integration verification:**
- ✅ JoinNode imported and registered in nodeTypes
- ✅ `expandedSubagents` and `toggleSubagentExpansion` selected from store
- ✅ `expandedSubagents` passed to `createLayoutedGraph`
- ✅ `expandedSubagents` in useMemo dependency array
- ✅ Subagent click handler toggles expansion
- ✅ `findSubagentSessionId` extracts subagent ID from React Flow node ID
- ✅ `toggleSubagentExpansion` in useCallback dependency array

## Deviations from Plan

None - plan executed exactly as written.

## Impact

### Immediate

- **Horizontal timeline visualization:** Graph flows left-to-right matching temporal progression mental model
- **Subagent branching:** Parallel work visualized as parallel branches that reconverge
- **Inline tool inspection:** Users can expand subagents to see tools on the branch without disrupting layout
- **Dynamic layout:** Graph updates smoothly when subagents expand/collapse

### User Experience

- **Natural flow:** Left-to-right matches how users think about time ("what happened first?" → left, "what happened later?" → right)
- **Spatial grouping:** Related work (subagent + its tools) stays grouped on a branch
- **Progressive disclosure:** Subagent nodes show tool count before expansion (information scent)
- **Convergence clarity:** Invisible join nodes ensure timeline continues cleanly after parallel work

### Technical

- **Clean layout calculations:** Dagre handles LR positioning automatically, no custom layout math needed
- **Expansion state management:** Consistent with existing tool group expansion pattern
- **Invisible nodes work:** Join nodes demonstrate React Flow can use nodes for layout without rendering

## Dependencies

**Builds upon:**
- 07-01: Horizontal handles (Left/Right positions on all nodes)
- 07-01: `expandedSubagents` Zustand state and actions
- 07-01: JoinNode component (renders null)
- 07-01: SubagentNode expansion indicator UI

**Required by:**
- Future phases: Horizontal timeline is foundation for all subsequent graph enhancements

## Files Changed

### Modified (2 files)

1. **client/src/utils/graphLayout.ts** (545 lines, ~250 lines changed)
   - Added `'join-node'` to NODE_DIMENSIONS
   - Changed `applyDagreLayout` default direction to 'LR' with adjusted spacing
   - Updated `convertSessionToGraph` signature: added `expandedSubagents`, removed `isSubagent`
   - Removed old recursive subagent processing
   - Implemented fork-join pattern with invisible join nodes
   - Added inline tool expansion logic for expanded subagents
   - Updated `convertSessionsToGraph` signature: added `expandedSubagents`
   - Updated `createLayoutedGraph` signature: added `expandedSubagents`

2. **client/src/components/GraphView.tsx** (237 lines, ~30 lines changed)
   - Imported JoinNode from nodes/index
   - Registered 'join-node' in nodeTypes map
   - Added `expandedSubagents` and `toggleSubagentExpansion` store selectors
   - Updated `createLayoutedGraph` call to pass `expandedSubagents`
   - Added `expandedSubagents` to useMemo dependency array
   - Split `node.type === 'skill' || node.type === 'subagent'` into separate handlers
   - Implemented `findSubagentSessionId` helper function
   - Added subagent click handler to toggle expansion
   - Added `toggleSubagentExpansion` to useCallback dependency array

## Key Learnings

1. **Invisible nodes are powerful:** Join nodes show that React Flow nodes can participate in layout without rendering anything - useful pattern for convergence points.

2. **Dagre handles LR naturally:** Changing `rankdir` from 'TB' to 'LR' requires no other layout changes - dagre does all the math.

3. **Fork-join pattern prevents spaghetti:** Without join nodes, edges would go directly from subagent branches to next main node, creating visual clutter.

4. **Inline expansion preserves spatial grouping:** Rendering tools on the branch (not in a side panel) keeps related work together visually.

5. **Nested subagents are rare:** Rendering nested subagents linearly (not recursively forking) is the right pragmatic choice - prevents complexity explosion for edge cases.

6. **Expansion state threading is clean:** Passing `expandedSubagents` through all layout functions follows the same pattern as `expandedGroups` - no surprises.

## Next Steps

Phase 7 complete! Next phase:
- **Phase 8: Fix Tree View** - Display subagents in tree, highlight running nodes, show tool calls in file-tree hierarchy

Potential future enhancements:
- Double-click subagent for detail panel (distinguish from single-click expand)
- Nested subagent fork-join (if use case emerges)
- Collapse multiple parallel subagents into a single visual group

## Self-Check: PASSED

**Verification of modified files:**
```bash
[ -f "client/src/utils/graphLayout.ts" ] && echo "FOUND: graphLayout.ts"
[ -f "client/src/components/GraphView.tsx" ] && echo "FOUND: GraphView.tsx"
```

**Build verification:**
```bash
npm run build  # ✓ All workspaces compiled successfully
```

**Key patterns verified:**
- ✅ LR layout default direction
- ✅ Fork-join pattern with invisible join nodes
- ✅ Inline tool expansion when subagent expanded
- ✅ GraphView wires subagent click to toggle expansion
- ✅ Layout recalculates on expansion state change

All files exist, build succeeds, and implementation matches specification.
