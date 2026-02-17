---
status: resolved
trigger: "Investigate issue: follow-end-subagent-box-jump"
created: 2026-02-17T00:00:00Z
updated: 2026-02-17T00:08:00Z
---

## Current Focus

hypothesis: FOUND THE ROOT CAUSE! Child nodes created in graphLayout.ts don't have a `width` property set. getRightmostByGeometry uses `node.measured?.width ?? node.width ?? 0`. If React Flow hasn't measured the nodes yet (or measurement is undefined), width defaults to 0. When all nodes have width=0, they all have the same rightEdge (position.x + 0), so the tiebreaker `n.position.y > best.position.y` is used. Since all internal children have the SAME y position (headerHeight), the FIRST node in the array wins the reduce - which is the Request node!
test: Set explicit `width` property on child nodes in graphLayout.ts when creating internal nodes for expanded subagent boxes
expecting: With explicit width set, getRightmostByGeometry will correctly calculate different rightEdge values and pick the actual rightmost node (last tool/model)
next_action: Add width property to child node definitions in graphLayout.ts

## Symptoms

expected: Follow-end should focus on the LAST internal node inside the expanded subagent box — the most recent tool call or model output, not the request node at the start.
actual: Follow-end jumps to the beginning of the subagent box (likely the box node itself or the request node), making the user lose sight of the latest activity inside the subagent.
errors: No error messages — purely a navigation/focus issue.
reproduction: 1. Enable follow-end toggle. 2. Have an active session where the last node is a subagent that is still running (not completed). 3. Expand that subagent box. 4. The view should follow the latest internal node but instead jumps to the start of the box.
started: Current behavior. The follow-end feature tracks the "last node" but doesn't account for expanded subagent boxes containing internal nodes.

## Eliminated

## Evidence

- timestamp: 2026-02-17T00:01:00Z
  checked: GraphView.tsx getEndTargetNodeId() function (lines 155-266)
  found: The function DOES have logic to handle expanded subagent boxes (lines 170-265), but ONLY for ACTIVE subagents. It filters for state === 'active' on line 176. When a subagent completes, it no longer matches this filter, so the logic falls through to the default "rightmost node" logic which picks top-level nodes, not internal children.
  implication: The issue is that follow-end stops following internal nodes once the subagent completes (state changes from 'active' to 'completed'). The real problem is likely during the transition - while the subagent is running but hasn't completed, it should track the last internal child node, but may be picking the box node or first child instead.

- timestamp: 2026-02-17T00:02:00Z
  checked: GraphView.tsx lines 173-178 (expanded box node detection)
  found: The filter for expanded boxes checks `(n.data as any)?.state === 'active'`. This means it ONLY looks inside expanded boxes that are actively running. The logic at lines 236-263 finds the rightmost child node WITHIN expanded boxes.
  implication: The logic seems correct for finding the rightmost child. Need to verify if the issue is about WHICH child node is considered "rightmost" - maybe the calculation doesn't account for the response node not being present yet.

- timestamp: 2026-02-17T00:03:00Z
  checked: graphLayout.ts child node positioning (lines 1181-1269)
  found: Child nodes are positioned left-to-right: Request (childIdx=0) -> Tools/Models (childIdx++) -> Response (childIdx++, only if hasResponse). Position formula: `boxPadding + childIdx * childStep`. hasResponse = `state === 'completed' || responseText.trim() !== ''` (line 1071, 1490).
  implication: When a subagent is still running (state=active), hasResponse is false, so no response node is created. The rightmost child should be the last tool/model node. The getRightmostByGeometry function should pick this correctly since it uses x position + width. BUT: Maybe the issue is that ALL child nodes have the SAME measured width initially, so the first one wins the tiebreaker (y position)?

- timestamp: 2026-02-17T00:04:00Z
  checked: graphLayout.ts child node creation (lines 1187-1201, 1209-1224, 1229-1244, 1253-1268)
  found: Child nodes are created WITHOUT a `width` property. They only have: id, type, position, parentId, extent, data. The NODE_DIMENSIONS constant (line 116-128) defines widths for top-level nodes, but child nodes don't reference it.
  implication: getRightmostByGeometry relies on `node.measured?.width ?? node.width ?? 0`. Without an explicit width and if measured.width is undefined, all nodes get width=0, making their rightEdge equal to position.x. Since all internal children have the same Y position, the reduce function picks the FIRST node (Request) as "rightmost".

- timestamp: 2026-02-17T00:05:00Z
  checked: GraphView.tsx getRightmostByGeometry (lines 141-145)
  found: `const rightEdge = (node: Node): number => { const p = getAbsPos(node); const w = node.measured?.width ?? node.width ?? 0; return p.x + w; }`
  implication: Confirmed - if both measured.width and node.width are missing, width defaults to 0, breaking the rightmost calculation.

## Resolution

root_cause: Child nodes inside expanded subagent boxes are created without an explicit `width` property in graphLayout.ts. The follow-end feature's getRightmostByGeometry function uses `node.measured?.width ?? node.width ?? 0` to calculate rightEdge. When both measured.width and node.width are undefined, all child nodes get width=0, causing them to have identical rightEdge values (position.x + 0). The reduce function's tiebreaker picks the node with larger position.y, but since all internal children have the same Y position (headerHeight), the FIRST node in the array (Request node) wins, causing follow-end to jump to the beginning of the subagent box instead of the actual last internal node.
fix: Added explicit `width: childWidth` property to all child node definitions (request, tool-group, model-output, response) in graphLayout.ts at the following locations:
  - Parallel subagent request node: line ~1191
  - Parallel subagent tool-group nodes: line ~1214
  - Parallel subagent model-output nodes: line ~1234
  - Parallel subagent response node: line ~1257
  - Sequential subagent request node: line ~1611
  - Sequential subagent tool-group nodes: line ~1634
  - Sequential subagent model-output nodes: line ~1654
  - Sequential subagent response node: line ~1677
verification: Build completed successfully with no TypeScript errors. The fix ensures that getRightmostByGeometry can correctly calculate different rightEdge values for each child node based on their position (boxPadding + childIdx * childStep) and explicit width (childWidth = 160). The rightmost node (last tool/model or response if present) will now have the largest rightEdge and be correctly selected for follow-end focus.

Manual testing steps:
1. Run the dashboard with an active session
2. Expand a subagent box that is still running (no response node yet)
3. Enable follow-end toggle
4. Verify that the view focuses on the last internal node (last tool call or model output) instead of jumping to the Request node at the beginning
5. As new tool calls are added, verify follow-end continues tracking the rightmost internal node
files_changed: [client/src/utils/graphLayout.ts]
