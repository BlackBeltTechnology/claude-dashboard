---
phase: 01-tool-call-grouping
plan: 02
subsystem: ui-graph-view
tags: [react-flow, component, graph-layout, interaction]
requires: [01-01]
provides:
  - ToolGroupNode React Flow component
  - Graph layout with tool call grouping
  - Group expansion/collapse interaction in graph
affects: [01-03]
tech-stack:
  added: []
  patterns: [react-flow-custom-nodes]
decisions:
  - tool-group-node-dimensions
  - group-expansion-chain-layout
key-files:
  created:
    - client/src/components/nodes/ToolGroupNode.tsx
  modified:
    - client/src/components/nodes/index.ts
    - client/src/utils/graphLayout.ts
    - client/src/components/GraphView.tsx
metrics:
  duration: 3min
  completed: 2026-02-06
---

# Phase 1 Plan 2: Graph View Integration Summary

**One-liner:** ToolGroupNode component with expand/collapse UI and dagre layout integration for visual graph grouping

## What Was Built

### ToolGroupNode Component
Created a new React Flow custom node (`client/src/components/nodes/ToolGroupNode.tsx`) that:
- Displays tool groups with "ToolName (N)" format and count badge
- Shows expand/collapse chevron indicator (▶ collapsed, ▼ expanded)
- Uses the same visual style as ToolNode with STATUS_COLORS and TOOL_ICONS
- Handles click events to toggle group expansion via Zustand store
- Slightly wider dimensions (140-180px) to accommodate count display
- Integrates with `useIsGroupExpanded` and `toggleGroupExpansion` from the store

### Graph Layout Updates
Modified `client/src/utils/graphLayout.ts` to:
- Import and use `groupConsecutiveToolCalls` from groupingUtils
- Add 'tool-group' to NODE_DIMENSIONS (160x70px)
- Update all graph conversion functions to accept `expandedGroups: Set<string>` parameter
- Process grouped items from `groupConsecutiveToolCalls` instead of raw nodes
- Create tool-group nodes for groups with 2+ items
- When a group is expanded, create both the group node AND individual tool nodes chained after it
- When collapsed, only show the group node
- Properly thread prevNodeId through the expansion logic for correct edge connections

### GraphView Integration
Updated `client/src/components/GraphView.tsx` to:
- Import and register ToolGroupNode in the nodeTypes object (at module scope)
- Subscribe to expandedGroups from the Zustand store
- Pass expandedGroups to createLayoutedGraph in the useMemo dependency array
- Add 'tool-group' case to MiniMap nodeColor function (amber #f59e0b)
- Graph now re-renders with proper layout when groups expand/collapse

## Architecture Decisions

### Decision: Tool Group Node Dimensions
**Context:** Tool groups need to display more information (count badge) than regular tool nodes.

**Decision:** Set tool-group dimensions to 160x70px (vs 140x60px for regular tools).

**Rationale:**
- Provides space for count badge below the header
- Maintains visual consistency with other node types
- Slightly wider to accommodate longer tool names with count

**Impact:**
- Graph layout automatically accounts for larger nodes via dagre
- Visual hierarchy clear: groups are slightly larger than individual nodes

### Decision: Group Expansion Chain Layout
**Context:** When a group expands, we need to decide whether to show both the group node and individual nodes, or replace the group.

**Decision:** Show both — group node connects to first individual node, which chains to the next, ending at the last individual node. The next non-grouped node connects from the last individual node.

**Rationale:**
- Preserves the group node as visual anchor even when expanded
- Makes the expansion/collapse action clear (node is still there)
- Maintains edge continuity through the chain
- Users can collapse back to the group node easily

**Impact:**
- More nodes in the graph when expanded, but clear visual hierarchy
- prevNodeId threading logic is more complex but correct
- dagre layout handles the chains naturally

## Implementation Notes

### Module-Scope nodeTypes Object
The nodeTypes object in GraphView.tsx is defined at module scope (outside the component):
```typescript
const nodeTypes: NodeTypes = {
  session: SessionNode,
  subagent: SubagentNode,
  tool: ToolNode,
  'tool-group': ToolGroupNode,
  skill: SkillNode,
};
```

**Why:** React Flow requires stable references to avoid unnecessary re-renders. Defining nodeTypes inside the component would create a new object on every render.

### Type Union Update
Added ToolGroupNodeData to the CustomNodeData union in graphLayout.ts to ensure TypeScript recognizes tool-group nodes in the layout system.

### Edge Styling
Tool group nodes use the same amber color (#f59e0b) as individual tool nodes to maintain visual consistency in the flow.

## Deviations from Plan

None - plan executed exactly as written.

## Testing Results

### TypeScript Compilation
```
npx tsc --noEmit
```
✅ No errors

### Production Build
```
npm run build
```
✅ Built successfully in 4.25s
- dist/index.html: 0.59 kB
- dist/assets/index-D3DOfrIg.css: 16.36 kB
- dist/assets/index-CceI1aai.js: 458.52 kB

## Known Limitations

1. **Graph recalculation on expansion:** The entire graph re-layouts when a group expands/collapses. This is correct behavior (dagre needs to recalculate), but might cause slight visual jumps on large graphs.

2. **No persistence of expansion state:** Expansion state is in memory only (Zustand Set). When the page refreshes, all groups collapse back. Future enhancement could persist to localStorage.

## Next Phase Readiness

### Phase Dependencies Met
✅ ToolGroupNode component ready for use
✅ Graph layout handles grouping and expansion
✅ Visual consistency with existing node types
✅ Store integration working

### Blockers
None identified.

### Future Considerations
- Consider animating the expansion/collapse transition for smoother UX
- Add keyboard shortcuts for expand/collapse all groups
- Consider showing a preview of tool names in the collapsed group (tooltip or badge)
- Performance testing with sessions that have 100+ tool calls (very deep expansion)

## Files Changed

### Created
- **client/src/components/nodes/ToolGroupNode.tsx** (85 lines)
  - Custom React Flow node component for tool groups
  - Expansion toggle on click
  - Consistent visual style with ToolNode

### Modified
- **client/src/components/nodes/index.ts**
  - Added ToolGroupNode export

- **client/src/utils/graphLayout.ts** (major changes)
  - Added tool-group to NODE_DIMENSIONS
  - Updated all conversion functions to accept expandedGroups parameter
  - Implemented grouping logic with expansion handling
  - Proper edge threading for expanded chains

- **client/src/components/GraphView.tsx**
  - Registered ToolGroupNode in nodeTypes
  - Added expandedGroups subscription
  - Updated useMemo dependencies
  - Added tool-group to MiniMap colors

## Commits

No git commits (per user request to skip git operations). All changes made locally:
- ToolGroupNode.tsx created
- nodes/index.ts updated
- graphLayout.ts updated with grouping integration
- GraphView.tsx updated with component registration

## Lessons Learned

1. **React Flow custom nodes are straightforward:** Following the existing ToolNode pattern made ToolGroupNode implementation smooth.

2. **Expansion logic requires careful prevNodeId threading:** The chain layout (group → tool1 → tool2 → ...) required careful tracking of prevNodeId to ensure edges connect correctly.

3. **Module-scope constants prevent re-renders:** Defining nodeTypes at module scope is important for React Flow performance.

4. **Type safety catches integration issues:** The CustomNodeData union update caught potential type mismatches early in development.
