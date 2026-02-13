---
status: complete
phase: 17-subagent-workflow-visualization
source: 17-01-SUMMARY.md, 17-02-SUMMARY.md
started: 2026-02-12T10:00:00Z
updated: 2026-02-12T10:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Subagent Box Nodes on Timeline
expected: Open a session that has subagents. Instead of separate start/stop node pairs, you see colored container boxes on the timeline for each subagent invocation.
result: issue
reported: "No line between each node. Tool nodes are not using the main tool group noding that is collapsing repeated tool calls into one node."
severity: major

### 2. Collapsed Box Shows Progress Info
expected: Each collapsed subagent box (default state) shows the agent type label, tool count, and a last-node progress indicator (icon + label of the most recent tool/response).
result: pass

### 3. Click Box to Expand
expected: Clicking a collapsed subagent box expands it to reveal the internal workflow. The box grows larger to accommodate the content.
result: issue
reported: "Too long subagent expanded boxes are expanding under the main graph nodes."
severity: major

### 4. Expanded Workflow Cards
expected: An expanded subagent box displays internal workflow as horizontal cards flowing left-to-right: green card for request, amber cards for tool calls, blue card for response.
result: issue
reported: "Should add a new node that represents the model's outputs in between tool calls. The tree view has this. Also tree view should work with the new subagents as well, when a node clicked in a Task Agent expanded node it should expand the subagent box the node belongs to and jump to the node inside in the graph."
severity: major

### 5. Internal Node Click Opens Detail Panel
expected: Clicking an internal tool card inside an expanded box opens that tool's metadata in the detail panel. The box does NOT collapse when clicking an internal card.
result: issue
reported: "Works, but when clicking to expand the box it also shows the metadata which it shouldn't. Delete subagent metadata. The subagent paths and other subagent related metadata details should be in either request (the path for example) or response. Color is for only the indicators."
severity: major

### 6. Click to Collapse
expected: Clicking the box background (not an internal card) of an expanded box collapses it back to the compact view.
result: pass

### 7. Toolbar Expand/Collapse All
expected: When viewing a session timeline that has subagents, the toolbar shows "+ All" and "- All" buttons. Clicking "+ All" expands all subagent boxes. Clicking "- All" collapses them all.
result: issue
reported: "pass for functionality, add better label"
severity: cosmetic

### 8. Minimap Agent Colors
expected: In the minimap (bottom-right corner of graph), subagent-box nodes appear with their respective agent color instead of a generic color.
result: pass

## Summary

total: 8
passed: 3
issues: 5
pending: 0
skipped: 0

## Gaps

- truth: "Subagent box nodes appear on timeline as colored containers with edges connecting them to surrounding nodes, and tool calls inside use the same grouping as main timeline"
  status: failed
  reason: "User reported: No line between each node. Tool nodes are not using the main tool group noding that is collapsing repeated tool calls into one node."
  severity: major
  test: 1
  root_cause: "Edge creation code appears present and correct for both sequential/parallel. Tool grouping CONFIRMED BUG: groupConsecutiveToolCalls() is never applied to subagent internal tool nodes. extractToolCallSummaries() returns raw ungrouped tools."
  artifacts:
    - path: "client/src/utils/graphLayout.ts"
      issue: "extractToolCallSummaries (lines 109-169) returns ungrouped tools; internal node building (lines 560-571, 688-698) iterates raw tool calls"
    - path: "client/src/utils/groupingUtils.ts"
      issue: "groupConsecutiveToolCalls() never called for subagent internals"
  missing:
    - "Apply groupConsecutiveToolCalls() to subagent tool nodes before building internalNodes"
  debug_session: ".planning/debug/gap1-missing-edges.md"
- truth: "Expanded subagent box grows to accommodate content without overlapping main graph nodes"
  status: failed
  reason: "User reported: Too long subagent expanded boxes are expanding under the main graph nodes."
  severity: major
  test: 3
  root_cause: "Expanded SubagentBoxNode has NO explicit width/height in CSS (styles.boxExpanded). Dagre height hardcoded to 120px but actual render is ~130-140px. Collapsed box correctly constrains to width:220px but expanded box auto-sizes, creating dagre-vs-DOM mismatch."
  artifacts:
    - path: "client/src/utils/graphLayout.ts"
      issue: "Lines 822-828: expanded box dagre height hardcoded to 120, too small"
    - path: "client/src/components/nodes/SubagentBoxNode.tsx"
      issue: "Lines 89-95: styles.boxExpanded has no width or height property"
  missing:
    - "Set explicit width/height on expanded box matching dagre formula"
    - "Increase dagre height estimate from 120 to ~150-160px"
  debug_session: ".planning/debug/gap2-box-overlap.md"
- truth: "Expanded workflow shows model output nodes between tool calls, and tree view clicking navigates into subagent box nodes on graph"
  status: failed
  reason: "User reported: Should add a new node that represents the model's outputs in between tool calls. The tree view has this. Also tree view should work with the new subagents as well, when a node clicked in a Task Agent expanded node it should expand the subagent box the node belongs to and jump to the node inside in the graph."
  severity: major
  test: 4
  root_cause: "1) extractToolCallSummaries() only extracts tool nodes, skips MessageNodes with role=assistant. SubagentBoxNodeData.internalNodes type only allows request|tool|response, no model/assistant type. 2) Tree click produces graph node IDs that don't exist as React Flow nodes - subagent children are internal divs inside SubagentBoxNode, not RF nodes."
  artifacts:
    - path: "client/src/utils/graphLayout.ts"
      issue: "Lines 109-169: extractToolCallSummaries skips MessageNodes; lines 30-38: type excludes model; lines 548-581, 675-708: no assistant node insertion"
    - path: "client/src/components/nodes/SubagentBoxNode.tsx"
      issue: "Lines 292-341: rendering only handles request/tool/response cards"
    - path: "client/src/components/TreeView.tsx"
      issue: "Lines 172-195: selectNode produces node IDs that don't exist in React Flow graph"
    - path: "client/src/components/GraphView.tsx"
      issue: "Lines 73-92: GraphFocusHandler only works for top-level RF nodes"
  missing:
    - "Add 'model' type to internalNodes and insert assistant MessageNodes chronologically"
    - "Tree click on subagent child should expand parent box node and focus viewport on it"
  debug_session: ".planning/debug/gap3-missing-model-nodes.md"
- truth: "Clicking box to expand should NOT show subagent metadata in detail panel. Subagent details (paths, etc.) belong in request/response cards. Color is only for indicators."
  status: failed
  reason: "User reported: Works, but when clicking to expand the box it also shows the metadata which it shouldn't. Delete subagent metadata. The subagent paths and other subagent related metadata details should be in either request (the path for example) or response. Color is for only the indicators."
  severity: major
  test: 5
  root_cause: "Dual-fire: SubagentBoxNode handleBoxClick doesn't call stopPropagation, click bubbles to ReactFlow onNodeClick which has explicit subagent-box case (lines 454-471) calling setSelectedNodeData. Also renderSubagentContent shows agentColor as hex swatch, agentId, nodeId as raw internal data."
  artifacts:
    - path: "client/src/components/GraphView.tsx"
      issue: "Lines 454-471: onNodeClick subagent-box case explicitly opens detail panel; lines 149-178: request/response internal card handlers produce identical data"
    - path: "client/src/components/nodes/SubagentBoxNode.tsx"
      issue: "Lines 187-190: handleBoxClick missing e.stopPropagation()"
    - path: "client/src/components/NodeDetail.tsx"
      issue: "Lines 689-705: agentColor shown as content; agentId/nodeId as raw internal IDs"
  missing:
    - "Remove subagent-box case from onNodeClick or add stopPropagation to handleBoxClick"
    - "Remove agentColor display from renderSubagentContent"
    - "Differentiate request vs response internal card click handlers"
  debug_session: ".planning/debug/gap4-metadata-on-expand.md"
- truth: "Toolbar expand/collapse all buttons have clear, descriptive labels"
  status: failed
  reason: "User reported: pass for functionality, add better label"
  severity: cosmetic
  test: 7
  root_cause: "Button labels '+ All' and '- All' use symbolic +/- instead of descriptive text. Inconsistent with toolbar convention (other buttons use 'Tree', 'Back')."
  artifacts:
    - path: "client/src/components/Toolbar.tsx"
      issue: "Lines 222 and 233: button labels '+ All' and '- All' are cryptic"
  missing:
    - "Replace '+ All' with 'Expand All' and '- All' with 'Collapse All'"
  debug_session: ".planning/debug/gap5-toolbar-labels.md"
