---
phase: 17-subagent-workflow-visualization
plan: "04"
subsystem: client
tags: [subagent-box, model-output, click-behavior, tree-to-graph-navigation]
dependency_graph:
  requires:
    - "17-03"
  provides:
    - "Model output cards in expanded subagent boxes"
    - "Box click only toggles expand/collapse"
    - "Differentiated request/response detail data"
    - "Clean metadata display (no agentColor/agentId/nodeId)"
    - "Tree-to-graph navigation for subagent children"
tech_stack:
  - TypeScript
  - React Flow
  - Zustand
key_files:
  created: []
  modified:
    - client/src/utils/graphLayout.ts
    - client/src/components/nodes/SubagentBoxNode.tsx
    - client/src/components/GraphView.tsx
    - client/src/components/TreeView.tsx
    - client/src/components/NodeDetail.tsx
decisions:
  - "Added 'model' type to SubagentBoxNodeData internalNodes to show assistant messages between tool calls"
  - "Removed subagent-box case from onNodeClick so box click only toggles expand/collapse"
  - "Differentiated internal card clicks: request shows prompt, response shows summary, model shows message content"
  - "Cleaned up renderSubagentContent to remove agentColor, agentId, and nodeId display"
  - "Added parentSubagentId parameter to TreeView selectNode to enable tree-to-graph navigation"
metrics:
  duration: "3.5min"
  completed: "2026-02-12T10:11:46Z"
  tasks: 2
  files_modified: 5
---

# Phase 17 Plan 04: Subagent Box Model Output and Click Behavior Fixes

## Summary

Added model output nodes to expanded subagent boxes, fixed click behavior so box click only toggles expand/collapse, differentiated request/response detail data, cleaned up metadata display, and wired tree-to-graph navigation for subagent children.

## Completed Tasks

### Task 1: Add model output nodes to subagent internal nodes and fix click/metadata behavior

**Part A: Added 'model' type to SubagentBoxNodeData internalNodes**
- Extended the `type` union in internalNodes to include `'model'`
- Added optional `content?: string` field for model text
- Modified parallel and sequential subagent box building to extract assistant MessageNodes and interleave them chronologically between tool calls
- Model output nodes now appear between tool calls in expanded subagent boxes

**Part B: Fixed box click opening detail panel**
- Removed the `else if (node.type === 'subagent-box')` case from onNodeClick in GraphView.tsx
- Box click now only toggles expand/collapse via the SubagentBoxNode's own handleBoxClick callback

**Part C: Differentiated request vs response internal card clicks**
- For request cards: detail panel now shows prompt text as primary content (rendered as user message)
- For response cards: detail panel now shows summary text as primary content (rendered as assistant message)
- For model cards: passes the original message node data or creates a synthetic message

**Part D: Cleaned up renderSubagentContent**
- Removed agentColor display (hex swatch)
- Removed agentId display
- Removed nodeId display
- Kept: Agent Type, Agent Name, Model, Timestamp, Description, Source File Path, Request, Response

### Task 2: Wire tree view subagent child clicks to expand parent box and navigate graph

- Added `expandAllSubagentBoxes` import from session store
- Modified `selectNode` callback to accept optional `parentSubagentId` parameter
- When clicking a node inside a subagent session:
  - Calls `expandAllSubagentBoxes` to expand the parent box
  - Computes box node graph ID using pattern `createNodeId(selectedSessionId, parentSubagentId + '-box')`
  - Calls `setFocusedNode` to navigate viewport to the subagent box
- Modified `renderNode` to track parent subagent context and pass it to `selectNode`
- Regular session nodes continue to work unchanged

## Verification

1. `npm run build` passes with zero TypeScript errors
2. Model type added to internalNodes type in graphLayout.ts
3. SubagentBoxNode.tsx renders model-type cards with purple tint (#8b5cf6)
4. No subagent-box case in onNodeClick (box click only toggles expand/collapse)
5. Request/response/model clicks pass differentiated detail data
6. renderSubagentContent does not display agentColor, agentId, or nodeId
7. TreeView.tsx uses expandAllSubagentBoxes and navigates to box node ID when clicking subagent children

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

All checks passed:
- [x] Model type in internalNodes type definition
- [x] No subagent-box case in onNodeClick
- [x] agentColor display removed from renderSubagentContent
- [x] expandAllSubagentBoxes imported and used in TreeView.tsx
- [x] Box node ID pattern used for navigation
