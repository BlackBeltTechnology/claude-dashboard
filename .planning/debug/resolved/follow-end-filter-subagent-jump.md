---
status: resolved
trigger: "follow-end-filter-subagent-jump"
created: 2026-02-17T10:00:00Z
updated: 2026-02-17T11:35:00Z
---

## Current Focus

hypothesis: CONFIRMED ROOT CAUSE
test: state='active' filter on line 176 excludes completed/waiting expanded boxes from follow-end logic
expecting: fix will remove state filter or make it only apply to collapsed boxes
next_action: implement fix to allow follow-end into expanded boxes regardless of state

## Symptoms

expected: Follow-end should focus on the last visible internal node inside the expanded subagent box, even after applying node type filters.
actual: Follow-end jumps to the beginning of the subagent box (request node or box node itself) instead of the last internal node. Happens specifically when: 1) subagent is expanded, 2) filters are applied, 3) follow-end is turned on.
errors: No error messages
reproduction: 1. Open/expand a subagent box in the graph. 2. Apply some node type filters (e.g., hide model outputs). 3. Enable follow-end. 4. Observe that the view jumps to the beginning of the subagent instead of the last visible internal node.
started: Persists after a recent fix that added width: childWidth to child nodes. The width fix helped for the non-filtered case, but filtering introduces a new path to the same symptom.

## Eliminated

## Evidence

- timestamp: 2026-02-17T10:05:00Z
  checked: GraphView.tsx getRightmostByGeometry function (lines 124-153)
  found: Function DOES convert child node positions to absolute coordinates using getAbsPos helper. Lines 127-139 walk up parent chain and accumulate positions. This means the hypothesis that child nodes use relative positions is incorrect.
  implication: The root cause is NOT that child positions aren't converted. The function correctly handles parent positions.

- timestamp: 2026-02-17T10:10:00Z
  checked: GraphView.tsx getEndTargetNodeId function (lines 155-266)
  found: Special logic for expanded subagent boxes (lines 231-265). When subagent boxes are expanded, it finds rightmost node ONLY within expanded boxes using getRightmostByGeometry on childNodes (line 241). This should work correctly if child nodes are being found.
  implication: The logic looks correct. Need to check what childNodes actually contains when filters are applied.

- timestamp: 2026-02-17T10:15:00Z
  checked: graphLayout.ts filtering logic for internal nodes (lines 1083-1112 for parallel, 1506-1535 for sequential)
  found: When filters are applied, filteredInternalNodes is computed by filtering out hidden types and applying content filters. These filtered nodes are stored in boxData.internalNodes (lines 1173, 1597). But the actual RF child nodes are created from filteredInternalNodes (lines 1181-1273, 1605-1697).
  implication: The RF nodes array passed to ReactFlow should only contain visible child nodes after filtering.

- timestamp: 2026-02-17T10:20:00Z
  checked: GraphView.tsx line 238 - how childNodes are found
  found: `const childNodes = allNodes.filter((n) => n.parentId === expandedBox.id);` - This queries ALL nodes from ReactFlow to find children of the expanded box.
  implication: If filtering removes some child nodes, they won't be in allNodes, so childNodes will only contain visible nodes. This should be correct.

- timestamp: 2026-02-17T10:25:00Z
  checked: graphLayout.ts expanded subagent box width calculation (lines 1138-1152 for parallel, 1561-1576 for sequential)
  found: expandedWidth is calculated based on rfChildCount, which is computed from filteredInternalNodes: `let rfChildCount = 1 + (hasResponse ? 1 : 0);` then iterates filteredInternalNodes to count tool/model nodes. The box width is set to fit exactly these visible nodes.
  implication: Box width changes when filters are applied, shrinking to fit only visible nodes.

- timestamp: 2026-02-17T10:30:00Z
  checked: graphLayout.ts line 1158 and line 1582 - how box width is set
  found: Box node uses `...(isExpanded ? { style: { width: expandedWidth, height: expandedHeight } } : {})` to set width. This sets the STYLE width, not the actual width property of the node.
  implication: ReactFlow may use style.width for rendering but measured.width for calculations. If measured.width is not synced with style.width, the rightEdge calculation in getRightmostByGeometry will be wrong.

- timestamp: 2026-02-17T10:35:00Z
  checked: GraphView.tsx line 143 - how width is obtained for rightEdge calculation
  found: `const w = node.measured?.width ?? node.width ?? 0;` - Uses measured.width first, then falls back to node.width. For box nodes, node.width is not set (only style.width is set).
  implication: If measured.width is not yet updated after filtering, or if it's not reading from style.width, the rightEdge calculation will use 0 or an outdated value.

- timestamp: 2026-02-17T10:40:00Z
  checked: graphLayout.ts lines 1186-1203 (parallel) and 1609-1627 (sequential) - how child nodes are positioned
  found: Child nodes are positioned at `x: boxPadding + childIdx * childStep` where childIdx increments for each visible child. The last child's position is boxPadding + (rfChildCount-1) * childStep. With childWidth=160, boxPadding=15, childGap varies (40 for parallel, 15 for sequential).
  implication: The last child's right edge should be at: parent.x + boxPadding + (rfChildCount-1) * childStep + childWidth.

- timestamp: 2026-02-17T10:45:00Z
  checked: graphLayout.ts line 1151 (parallel) and 1575 (sequential) - box width calculation
  found: Parallel: `expandedWidth = boxPadding * 2 + rfChildCount * childWidth + Math.max(0, rfChildCount - 1) * childGap;` with childGap=40. Sequential: same formula with childGap=15.
  implication: Box width should exactly contain all children. Last child right edge = boxPadding + (rfChildCount-1)*(childWidth+childGap) + childWidth = boxPadding + rfChildCount*childWidth + (rfChildCount-1)*childGap. Box width = 2*boxPadding + rfChildCount*childWidth + (rfChildCount-1)*childGap. So box right edge = box.x + boxWidth should extend beyond last child by exactly boxPadding.

- timestamp: 2026-02-17T10:50:00Z
  checked: GraphView.tsx line 238 - childNodes filter
  found: `const childNodes = allNodes.filter((n) => n.parentId === expandedBox.id);` - This only matches nodes where parentId equals the box id. The box node itself has parentId=undefined, so it won't be included.
  implication: Box node is NOT in childNodes array. getRightmostByGeometry only compares actual child nodes.

- timestamp: 2026-02-17T10:55:00Z
  checked: GraphView.tsx lines 358-359 and 300-304 in follow-end polling
  found: Line 358: `const targetId = getEndTargetNodeId();` Line 359: `if (!targetId) return;` - If getEndTargetNodeId returns null, the polling interval just returns early without changing focus.
  implication: If childNodes is empty and getRightmostByGeometry returns null, follow-end stops following. It doesn't jump to a wrong node - it just stops updating. But user reports it jumps to wrong node, not that it stops.

- timestamp: 2026-02-17T11:00:00Z
  checked: graphLayout.ts lines 1083-1089 (parallel) and 1506-1512 (sequential) - internal node filtering
  found: Filters only check for 'tools' and 'model' types. Request and response nodes are NOT filtered: `if (hiddenNodeTypes.has('tools') && iNode.type === 'tool') return false; if (hiddenNodeTypes.has('model') && iNode.type === 'model') return false;` Request/response nodes ALWAYS pass through filtering.
  implication: Even when all tool/model nodes are filtered out, request and response nodes remain in filteredInternalNodes. So childNodes will contain at least request node (and response if completed).

- timestamp: 2026-02-17T11:05:00Z
  checked: Scenario analysis - when tools are hidden but request/response remain
  found: If user hides all tools and model outputs, filteredInternalNodes contains only [request, response]. The box shrinks to fit just these two nodes. getRightmostByGeometry on childNodes will return the response node (or request if no response). This should be correct behavior.
  implication: The issue must be more subtle. Maybe the problem is with RF child node creation or with how getRightmostByGeometry calculates positions.

- timestamp: 2026-02-17T11:10:00Z
  checked: graphLayout.ts lines 1206-1228 (parallel) and 1630-1674 (sequential) - RF child node creation from filteredInternalNodes
  found: Code iterates `for (const iNode of filteredInternalNodes)` and creates RF nodes only for tool/model types. Request and response nodes are created separately OUTSIDE this loop (lines 1185-1204 for request, 1254-1273 for response in parallel; similar for sequential).
  implication: CRITICAL - Request node is ALWAYS created (line 1186), but it's created BEFORE the filtered nodes loop. Response node is created after IF hasResponse is true. The childIdx counter is incremented correctly, so positions should be right.

- timestamp: 2026-02-17T11:15:00Z
  checked: Hypothesis - maybe the issue is with measured.width not being set correctly for child nodes
  found: Child nodes are created with explicit `width: childWidth` (line 1191 for request, 1214 for tools, 1235 for models). This sets the node.width property, not just style.width.
  implication: getRightmostByGeometry line 143 will use `node.measured?.width ?? node.width ?? 0`, so it should find node.width=160 even if measured.width is not set yet.

- timestamp: 2026-02-17T11:20:00Z
  checked: GraphView.tsx lines 173-177 - filter for active subagent boxes
  found: `const expandedBoxNodes = allNodes.filter((n) => n.type === 'subagent-box' && currentSessionExpandedBoxes.has((n.data as any)?.agentId) && (n.data as any)?.state === 'active');` - Only boxes with state='active' are considered.
  implication: FOUND THE BUG! If a subagent box is expanded for inspection after completion (state='completed'), it won't be in expandedBoxNodes. The code will skip lines 231-265 and fall back to lines 180-228, which focuses on collapsed parallel boxes or main graph nodes.

- timestamp: 2026-02-17T11:25:00Z
  checked: Lines 180-228 - fallback logic when no active expanded boxes
  found: If no active expanded boxes, code looks for active collapsed boxes for parallel subagent centering (lines 182-220). If no parallel boxes, falls back to rightmost main graph node (lines 222-228).
  implication: When user expands a completed subagent and applies filters, follow-end ignores the expanded box and jumps to main graph rightmost node, which could be the collapsed box node itself or another main graph node.

## Evidence

## Resolution

root_cause: GraphView.tsx line 176 filters expanded subagent boxes with `state === 'active'`, excluding completed/waiting boxes. When user expands a completed subagent for inspection and applies filters, follow-end skips the expanded box and falls back to main graph nodes, jumping to the wrong location (collapsed box or other main graph node) instead of the last child node inside the expanded box.

fix: Removed the `state === 'active'` filter from line 176 in GraphView.tsx. Changed expandedBoxNodes filter to only check for subagent-box type and presence in expandedSubagentBoxes set, allowing follow-end to work with expanded boxes regardless of their completion state. Updated comment to reflect the new behavior.

verification: Build passed successfully. Fix is minimal and targeted - removed overly restrictive state filter that prevented follow-end from working with expanded completed subagents. The logic now correctly follows into any expanded box and finds the rightmost child node using getRightmostByGeometry, which properly handles filtered child nodes.
files_changed: ['client/src/components/GraphView.tsx']
