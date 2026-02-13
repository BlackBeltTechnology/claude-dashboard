---
phase: 07-horizontal-timeline-graph-with-subagent-convergence
plan: 01
subsystem: client-graph-layout
tags: [graph-layout, horizontal-timeline, node-handles, state-management]
dependency_graph:
  requires: [zustand-store, react-flow-nodes]
  provides: [horizontal-handles, subagent-expansion-state, join-node]
  affects: [graph-layout-engine]
tech_stack:
  added: []
  patterns: [expansion-state-pattern, invisible-node-pattern]
key_files:
  created:
    - client/src/components/nodes/index.ts (JoinNode component)
  modified:
    - client/src/store/sessionStore.ts
    - client/src/components/nodes/SessionNode.tsx
    - client/src/components/nodes/SubagentNode.tsx
    - client/src/components/nodes/ToolNode.tsx
    - client/src/components/nodes/ToolGroupNode.tsx
    - client/src/components/nodes/SkillNode.tsx
key_decisions:
  - decision: "All node handles use Left/Right positions for horizontal timeline"
    rationale: "LR layout creates natural left-to-right timeline flow matching user mental model of time progression"
    alternatives: ["Keep TB layout", "Mix TB and LR"]
  - decision: "expandedSubagents follows same pattern as expandedGroups"
    rationale: "Consistency with existing expansion state management, proven pattern"
  - decision: "JoinNode renders null for invisible convergence points"
    rationale: "React Flow requires node for layout but shouldn't be visible - follows fork-join pattern"
  - decision: "SubagentNode shows expansion indicator with tool count"
    rationale: "Users need to see how many tools are inside before expanding, consistent with ToolGroup pattern"
metrics:
  duration_seconds: 150
  tasks_completed: 2
  files_modified: 7
  completed_date: "2026-02-09"
---

# Phase 07 Plan 01: Horizontal Timeline Foundation Summary

**One-liner:** All graph nodes switched to Left/Right handles for horizontal timeline layout, with Zustand expansion state for subagents and invisible JoinNode for convergence points.

## Objective

Set up the foundation for horizontal timeline graph by switching all node handle positions from Top/Bottom to Left/Right for LR layout, adding expandedSubagents state to Zustand store, creating invisible join-node type, and extending SubagentNode data interface for expansion tracking.

## What Was Built

### 1. Zustand Store Expansion State (Task 1)

**Added to `sessionStore.ts`:**
- `expandedSubagents: Set<string>` state field
- `toggleSubagentExpansion(subagentId: string)` action following exact same pattern as `toggleGroupExpansion`
- `useIsSubagentExpanded(subagentId: string)` convenience selector hook

**Pattern consistency:** Mirrors the existing `expandedGroups` implementation for familiar, predictable behavior.

### 2. JoinNode Component (Task 1)

**Created in `nodes/index.ts`:**
- `JoinNode` component that renders `null` (invisible)
- Memoized with `React.memo` for performance
- Exported alongside other node types

**Purpose:** Invisible convergence point for fork-join subagent pattern - React Flow needs a node for layout calculations but nothing should be visible to users.

### 3. Horizontal Handle Positions (Task 2)

**Modified all 5 node components:**
- `SessionNode.tsx`: Position.Top → Position.Left, Position.Bottom → Position.Right
- `SubagentNode.tsx`: Position.Top → Position.Left, Position.Bottom → Position.Right
- `ToolNode.tsx`: Position.Top → Position.Left, Position.Bottom → Position.Right
- `ToolGroupNode.tsx`: Position.Top → Position.Left, Position.Bottom → Position.Right
- `SkillNode.tsx`: Position.Top → Position.Left, Position.Bottom → Position.Right

**Result:** All graph edges now connect horizontally (left-to-right) instead of vertically (top-to-bottom), ready for LR timeline layout.

### 4. SubagentNode Expansion Interface (Task 2)

**Extended `SubagentNodeData` interface:**
```typescript
isExpanded?: boolean;      // whether subagent tools are shown
toolCallCount?: number;    // number of tool calls inside this subagent
```

**Added expansion indicator UI:**
- Shows chevron (▶/▼) based on `isExpanded` state
- Displays tool count: "▶ 5 tools" or "▼ 1 tool"
- Only renders when `toolCallCount > 0`
- Cursor changes to pointer when expandable
- Positioned after agentType, centered

**Visual consistency:** Follows the same pattern as ToolGroupNode expansion indicator.

## Technical Implementation

### Zustand State Management

The `expandedSubagents` state uses the same Set-based toggle pattern as `expandedGroups`:

```typescript
toggleSubagentExpansion: (subagentId: string) => {
  set((state) => {
    const newSet = new Set(state.expandedSubagents);
    if (newSet.has(subagentId)) {
      newSet.delete(subagentId);
    } else {
      newSet.add(subagentId);
    }
    return { expandedSubagents: newSet };
  });
}
```

### Handle Position Changes

Every node component's handles changed from:
- **Target (input):** `position={Position.Top}` → `position={Position.Left}`
- **Source (output):** `position={Position.Bottom}` → `position={Position.Right}`

This enables horizontal timeline layout where time flows left-to-right.

### SubagentNode Expansion Indicator

The expansion indicator is conditionally rendered based on `toolCallCount`:

```typescript
{(data.toolCallCount ?? 0) > 0 && (
  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px', textAlign: 'center', cursor: 'pointer' }}>
    {data.isExpanded ? '▼' : '▶'} {data.toolCallCount} tool{(data.toolCallCount ?? 0) > 1 ? 's' : ''}
  </div>
)}
```

## Verification

**Build verification:**
```bash
npm run build  # All workspaces compiled successfully
```

**Handle position verification:**
- ✅ All node components use `Position.Left` for target handles
- ✅ All node components use `Position.Right` for source handles
- ✅ No `Position.Top` or `Position.Bottom` references remain

**State management verification:**
- ✅ `expandedSubagents` state exists in Zustand store
- ✅ `toggleSubagentExpansion` action implemented
- ✅ `useIsSubagentExpanded` selector hook exported

**Component verification:**
- ✅ JoinNode component exists and renders null
- ✅ SubagentNode has `isExpanded` and `toolCallCount` in data interface
- ✅ SubagentNode renders expansion indicator when tools present

## Deviations from Plan

None - plan executed exactly as written.

## Impact

### Immediate
- All graph nodes ready for horizontal (LR) layout rendering
- Subagent expansion state infrastructure in place
- Visual feedback for expandable subagents with tool counts

### Next Phase Enablers
- **07-02:** Layout engine can switch to LR direction and use Left/Right handles
- **07-02:** Graph layout can conditionally show/hide subagent tools based on `expandedSubagents`
- **07-02:** JoinNode can be used for subagent convergence points in fork-join pattern

### User Experience
- (No user-visible changes yet - foundation only)
- Future: Horizontal timeline will show temporal flow naturally
- Future: Users can click subagents to expand/collapse internal tool calls

## Dependencies

**Builds upon:**
- Phase 01-04: Existing node component architecture
- Phase 01-04: Zustand store with expansion state patterns

**Required by:**
- 07-02: Graph layout engine needs horizontal handles for LR rendering
- 07-02: Subagent fork-join logic needs JoinNode and expansion state

## Files Changed

### Modified (7 files)

1. **client/src/store/sessionStore.ts** (50 lines, +15)
   - Added `expandedSubagents: Set<string>` state
   - Added `toggleSubagentExpansion` action
   - Added `useIsSubagentExpanded` selector hook

2. **client/src/components/nodes/index.ts** (11 lines, +6)
   - Created and exported `JoinNode` component

3. **client/src/components/nodes/SessionNode.tsx** (159 lines, 2 changed)
   - Changed target handle: Position.Top → Position.Left
   - Changed source handle: Position.Bottom → Position.Right

4. **client/src/components/nodes/SubagentNode.tsx** (147 lines, +11)
   - Extended `SubagentNodeData` with `isExpanded` and `toolCallCount`
   - Changed target handle: Position.Top → Position.Left
   - Changed source handle: Position.Bottom → Position.Right
   - Added expansion indicator UI with tool count
   - Added pointer cursor when expandable

5. **client/src/components/nodes/ToolNode.tsx** (176 lines, 2 changed)
   - Changed target handle: Position.Top → Position.Left
   - Changed source handle: Position.Bottom → Position.Right

6. **client/src/components/nodes/ToolGroupNode.tsx** (79 lines, 2 changed)
   - Changed target handle: Position.Top → Position.Left
   - Changed source handle: Position.Bottom → Position.Right

7. **client/src/components/nodes/SkillNode.tsx** (136 lines, 2 changed)
   - Changed target handle: Position.Top → Position.Left
   - Changed source handle: Position.Bottom → Position.Right

## Key Learnings

1. **Consistency pays off:** Using the same expansion state pattern as `expandedGroups` means zero cognitive overhead and predictable behavior.

2. **Handle position changes are simple but critical:** All nodes must have matching handle positions before layout engine switches direction.

3. **Invisible nodes are valid:** JoinNode demonstrates that React Flow can use nodes for layout calculations without rendering anything.

4. **Progressive disclosure:** SubagentNode expansion indicator provides information scent (tool count) before user commits to expanding.

## Next Steps

See 07-02-PLAN.md:
1. Switch GraphView layout engine from 'TB' to 'LR' direction
2. Implement subagent fork-join layout with JoinNode convergence points
3. Wire up SubagentNode click handler to toggle expansion
4. Update graph layout to conditionally show/hide subagent tools based on `expandedSubagents`

## Self-Check: PASSED

**Verification of created/modified files:**
```bash
[ -f "client/src/store/sessionStore.ts" ] && echo "FOUND: sessionStore.ts"
[ -f "client/src/components/nodes/index.ts" ] && echo "FOUND: nodes/index.ts"
[ -f "client/src/components/nodes/SessionNode.tsx" ] && echo "FOUND: SessionNode.tsx"
[ -f "client/src/components/nodes/SubagentNode.tsx" ] && echo "FOUND: SubagentNode.tsx"
[ -f "client/src/components/nodes/ToolNode.tsx" ] && echo "FOUND: ToolNode.tsx"
[ -f "client/src/components/nodes/ToolGroupNode.tsx" ] && echo "FOUND: ToolGroupNode.tsx"
[ -f "client/src/components/nodes/SkillNode.tsx" ] && echo "FOUND: SkillNode.tsx"
```

All files exist and contain expected changes verified through build success and grep verification.
