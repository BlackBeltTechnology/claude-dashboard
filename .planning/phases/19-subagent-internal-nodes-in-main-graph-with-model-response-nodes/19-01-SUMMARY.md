---
phase: 19-subagent-internal-nodes-in-main-graph-with-model-response-nodes
plan: 01
subsystem: frontend-graph-rendering
tags: [react-flow, node-components, subagent-visualization, graph-layout]
completed: 2026-02-12T11:14:51Z
duration: 226s

dependency_graph:
  requires:
    - client/src/components/nodes/SubagentBoxNode.tsx
    - client/src/components/nodes/UserPromptNode.tsx
    - client/src/components/nodes/ToolGroupNode.tsx
    - client/src/utils/graphLayout.ts
  provides:
    - client/src/components/nodes/RequestNode.tsx
    - client/src/components/nodes/ResponseNode.tsx
    - client/src/components/nodes/ModelOutputNode.tsx
    - Conditional expanded/collapsed rendering in graphLayout.ts
  affects:
    - client/src/components/nodes/index.ts (barrel exports)
    - Graph visualization when subagent boxes are expanded

tech_stack:
  added:
    - Three new React Flow node types (request, response, model-output)
  patterns:
    - Conditional node generation (isExpanded flag determines node structure)
    - Consistent visual styling (status colors, handle styling, agent color borders)
    - Memo-wrapped components for performance

key_files:
  created:
    - client/src/components/nodes/RequestNode.tsx: Green-tinted node for subagent request
    - client/src/components/nodes/ResponseNode.tsx: Blue-tinted node for subagent response
    - client/src/components/nodes/ModelOutputNode.tsx: Purple-tinted node for model outputs
  modified:
    - client/src/utils/graphLayout.ts: Added conditional expanded/collapsed rendering logic
    - client/src/components/nodes/index.ts: Added barrel exports for new components

decisions:
  - decision: Reuse ToolGroupNode component for tool nodes in expanded view
    rationale: Avoids duplication and these nodes already have proper styling
  - decision: Pass agentColor to all internal nodes for consistent left border
    rationale: Visual continuity - all nodes in a subagent share the agent's color
  - decision: Generate individual RF nodes only when isExpanded=true
    rationale: Preserves existing collapsed behavior, enables progressive disclosure
  - decision: Use same handle styling (6px circles with 2px border) across all nodes
    rationale: Visual consistency with existing SubagentBoxNode pattern
  - decision: Apply animation to edges when state is 'active' or 'waiting'
    rationale: Consistent with phase 18 decision to animate waiting state

metrics:
  tasks_completed: 3
  files_created: 3
  files_modified: 2
  build_status: passing
---

# Phase 19 Plan 01: Subagent Internal Nodes as First-Class React Flow Nodes

**One-liner:** Created RequestNode, ResponseNode, and ModelOutputNode components with conditional graphLayout rendering to promote subagent internal workflow steps to first-class React Flow nodes when expanded

## Overview

Refactored subagent visualization to generate individual React Flow nodes (request → tool-groups → model-outputs → response) when a subagent box is expanded, instead of rendering internal workflow steps as component-internal div cards. Collapsed subagents still render as single SubagentBoxNode components.

## Tasks Completed

### Task 1: Create RequestNode, ResponseNode, and ModelOutputNode components

**Status:** ✅ Complete

Created three new memo-wrapped React Flow node components following existing codebase patterns:

- **RequestNode.tsx:** Green-tinted background (rgba(16, 185, 129, 0.15)), displays prompt text, message icon
- **ResponseNode.tsx:** Blue-tinted background (rgba(59, 130, 246, 0.15)), displays summary text, checkmark icon
- **ModelOutputNode.tsx:** Purple-tinted background (rgba(139, 92, 246, 0.15)), displays content preview, robot icon

All components:
- Export typed data interfaces and node type unions
- Use consistent status colors (active/waiting/idle/completed)
- Render Handles on left (target) and right (source) with 6px circles
- Include status dot in top-right corner
- Display agent color as left border (3px solid)
- Truncate text preview to 60 characters with ellipsis
- Width: 160px, height: ~60px

**Files created:**
- `/home/botond/claude-session-dashboard/client/src/components/nodes/RequestNode.tsx`
- `/home/botond/claude-session-dashboard/client/src/components/nodes/ResponseNode.tsx`
- `/home/botond/claude-session-dashboard/client/src/components/nodes/ModelOutputNode.tsx`

### Task 2: Refactor graphLayout.ts for conditional expanded node generation

**Status:** ✅ Complete

Modified `client/src/utils/graphLayout.ts` to conditionally generate node structure based on `isExpanded` flag:

**Changes:**
1. Added imports for RequestNodeData, ResponseNodeData, ModelOutputNodeData
2. Updated CustomNodeData union to include three new data types
3. Added NODE_DIMENSIONS entries for 'request', 'response', 'model-output' (160x60)
4. Refactored SEQUENTIAL subagent block (line ~1010-1047):
   - When `isExpanded=true`: Generate individual RF nodes for request, tools, model outputs, response with sequential edges
   - When `isExpanded=false`: Generate single SubagentBoxNode (existing behavior)
5. Refactored PARALLEL subagent block (line ~767-810):
   - Applied same conditional pattern with fork-join edges
   - Fork edge connects chainPoint to first internal node (request)
   - Join edge connects last internal node (response) to groupJoinNodeId

**Implementation details:**
- Computed agentColor BEFORE conditional branch for reuse
- Created RequestNode with prompt text from subagent
- Looped through internalNodes to generate ToolGroupNode or ModelOutputNode
- Created ResponseNode with summary text
- Chained all nodes with purple smoothstep edges (strokeWidth: 1.5)
- Animated edges when state is 'active' or 'waiting'
- Updated chainPoint to response node ID in expanded path

**Files modified:**
- `/home/botond/claude-session-dashboard/client/src/utils/graphLayout.ts`

### Task 3: Export new node components from nodes/index.ts

**Status:** ✅ Complete

Added barrel exports for the three new components:

```typescript
export { RequestNode, type RequestNodeData, type RequestNodeType } from './RequestNode';
export { ResponseNode, type ResponseNodeData, type ResponseNodeType } from './ResponseNode';
export { ModelOutputNode, type ModelOutputNodeData, type ModelOutputNodeType } from './ModelOutputNode';
```

**Files modified:**
- `/home/botond/claude-session-dashboard/client/src/components/nodes/index.ts`

## Verification

**Build verification:** ✅ `npm run build` passes with zero TypeScript errors

**Code verification:**
- ✅ Three new files exist: RequestNode.tsx, ResponseNode.tsx, ModelOutputNode.tsx
- ✅ Each exports: component, data type, node type
- ✅ graphLayout.ts CustomNodeData union includes all three new data types
- ✅ NODE_DIMENSIONS includes entries for 'request', 'response', 'model-output'
- ✅ Collapsed subagent boxes still generate single box nodes (type: 'subagent-box')
- ✅ Expanded subagent boxes generate multiple RF nodes (type: 'request', 'tool-group', 'model-output', 'response')
- ✅ Node IDs follow namespace pattern: `${sessionId}-${subagentId}-request`, `${sessionId}-${subagentId}-${internalNodeId}`, `${sessionId}-${subagentId}-response`

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

**File verification:**
```bash
[ -f "client/src/components/nodes/RequestNode.tsx" ] && echo "FOUND"
[ -f "client/src/components/nodes/ResponseNode.tsx" ] && echo "FOUND"
[ -f "client/src/components/nodes/ModelOutputNode.tsx" ] && echo "FOUND"
```
Result: All files found ✅

**Build verification:**
```bash
npm run build
```
Result: Build succeeded with 0 errors ✅

**Export verification:**
```bash
grep "export.*RequestNode\|export.*ResponseNode\|export.*ModelOutputNode" client/src/components/nodes/index.ts
```
Result: All three exports present ✅

## Impact

**User-facing changes:**
- Expanded subagent boxes now display individual clickable nodes instead of component-internal cards
- Each internal workflow step (request, tool calls, model outputs, response) is a standalone React Flow node
- Consistent visual treatment with other timeline nodes (user prompts, tool groups)
- Enables future features: direct click interaction, tree-to-graph navigation for model outputs, node selection

**Technical changes:**
- GraphLayout conditional rendering based on isExpanded flag
- Three new node component files (RequestNode, ResponseNode, ModelOutputNode)
- Updated CustomNodeData union and NODE_DIMENSIONS
- Preserved all existing collapsed behavior (no breaking changes)

## Next Steps

This plan provides the foundation for:
- Plan 19-02: Register new node types in GraphView nodeTypes map
- Plan 19-02: Wire up click handlers for internal nodes
- Plan 19-02: Update tree-to-graph navigation to target model output nodes
- Future: Detail panel support for request/response/model-output nodes
- Future: Search/filter support for model outputs in expanded subagents
