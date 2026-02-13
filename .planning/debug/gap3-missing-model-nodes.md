---
status: diagnosed
trigger: "Expanded subagent boxes are missing model output nodes between tool calls; tree click on subagent child doesn't navigate to graph"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Current Focus

hypothesis: Two distinct root causes confirmed with evidence
test: Code reading and tracing
expecting: N/A - diagnosis complete
next_action: Hand off for fix implementation

## Symptoms

expected:
  1. Expanded subagent box shows: Request -> Model Output -> Tool -> Model Output -> Tool -> ... -> Response (matching tree view)
  2. Clicking a node in tree view under a subagent should expand the corresponding subagent box on the graph and navigate/focus to that node

actual:
  1. Expanded subagent box only shows: Request -> Tool -> Tool -> ... -> Response (no model/assistant output nodes between tools)
  2. Tree view click on subagent children calls setFocusedNode with a graph node ID that doesn't exist (subagent children are inside SubagentBoxNode, not separate React Flow nodes)

errors: No runtime errors, just missing UI content and broken navigation
reproduction: Open any session with subagent that has multiple tool calls; compare expanded box vs tree view
started: Since Phase 17 implementation of subagent box internal nodes

## Eliminated

(none needed - root causes found on first investigation)

## Evidence

- timestamp: 2026-02-12T00:01:00Z
  checked: SubagentBoxNodeData.internalNodes type definition in graphLayout.ts (line 31)
  found: "type: 'request' | 'tool' | 'response'" -- NO 'model' or 'assistant' type defined
  implication: The type system itself excludes model output nodes

- timestamp: 2026-02-12T00:02:00Z
  checked: graphLayout.ts internal node building for SEQUENTIAL subagents (lines 675-708)
  found: Build logic is exactly: (1) push request node, (2) loop over toolCalls only, (3) push response node. No code to find/insert assistant message nodes between tool calls.
  implication: Root cause 1 confirmed - model output nodes are never created

- timestamp: 2026-02-12T00:02:30Z
  checked: graphLayout.ts internal node building for PARALLEL subagents (lines 548-581)
  found: Same pattern - request, toolCalls loop, response. Identical gap.
  implication: Both parallel and sequential code paths have the same omission

- timestamp: 2026-02-12T00:03:00Z
  checked: extractToolCallSummaries() function (lines 109-169)
  found: Only iterates nodes where node.type === 'tool', completely skipping 'message' type nodes
  implication: The data source for internal nodes already filters out messages

- timestamp: 2026-02-12T00:04:00Z
  checked: TreeView.tsx subagent session rendering (lines 238-365)
  found: TreeView processes ALL session.nodes including messages. Lines 241-285 show it iterates node.nodes, and for message nodes with role==='assistant' and non-empty content, it keeps them AND extracts their toolUses as separate tool nodes. This is why TreeView shows model outputs between tools.
  implication: TreeView has richer processing that includes assistant message content; graphLayout.ts does not

- timestamp: 2026-02-12T00:05:00Z
  checked: TreeView.tsx selectNode callback (lines 172-195)
  found: On click, it calls createNodeId(selectedSessionId, node.id) and setFocusedNode(graphNodeId). For subagent children, selectedSessionId is the PARENT session ID, and node.id is the child's UUID. The resulting graph ID would be e.g. "parentSession-childUuid".
  implication: This graph node ID does NOT exist in the React Flow graph because subagent children are not separate React Flow nodes -- they're internal data inside a SubagentBoxNode

- timestamp: 2026-02-12T00:06:00Z
  checked: SubagentBoxNode.tsx rendering (lines 292-341)
  found: Renders data.internalNodes.map() with cards for request/tool/response. Only handles node.type === 'request', 'tool', 'response'. No rendering for a 'model' or 'assistant' type.
  implication: Even if model nodes were added to internalNodes, the renderer would need updating too

- timestamp: 2026-02-12T00:07:00Z
  checked: GraphView.tsx GraphFocusHandler (lines 73-92)
  found: Uses fitView({ nodes: [{ id: focusedNodeId }] }) to navigate. This only works for top-level React Flow nodes. SubagentBox internal nodes are NOT React Flow nodes -- they're div elements inside the SubagentBoxNode component.
  implication: Tree-to-graph navigation for subagent children is fundamentally broken because the target isn't a React Flow node

- timestamp: 2026-02-12T00:08:00Z
  checked: Session data model in shared/src/index.ts (line 122)
  found: Session.nodes is AnyNode[] which includes MessageNode (type: 'message'). Subagent sessions DO contain message nodes with role='assistant' and content.
  implication: The data is available in subagent.nodes; it's just not being extracted into internalNodes

- timestamp: 2026-02-12T00:09:00Z
  checked: buildNodes() in session-discovery.ts (lines 545-624)
  found: For assistant entries, it creates BOTH tool nodes (SubagentNode/SkillNode/ToolNode) AND MessageNode. The MessageNode with role='assistant' contains the model's text output. Subagent sessions processed via discoverSubagents() also call buildNodes(), so subagent.nodes contains these MessageNodes.
  implication: Subagent sessions have assistant MessageNodes in their nodes array; graphLayout.ts just ignores them

## Resolution

root_cause: |
  **Issue 1: Missing model output nodes in expanded subagent boxes**

  In `client/src/utils/graphLayout.ts`, the internal nodes array for SubagentBoxNode is built with only three types: request, tool, response. The code at lines 548-581 (parallel) and 675-708 (sequential) follows this pattern:

  ```
  1. Push request node
  2. Loop over extractToolCallSummaries() results (tool nodes ONLY)
  3. Push response node
  ```

  The `extractToolCallSummaries()` function (line 109-169) explicitly filters for `node.type !== 'tool'` and skips everything else, including `MessageNode` entries with `role === 'assistant'` that contain the model's reasoning/output text between tool calls.

  Meanwhile, `TreeView.tsx` (lines 238-285) processes ALL nodes in the subagent session, including assistant messages with non-empty content. It renders them between the tool calls in chronological order, which is why the tree view shows model outputs that the graph does not.

  The `SubagentBoxNodeData.internalNodes` type (line 31) also only allows `type: 'request' | 'tool' | 'response'` -- there is no `'model'` or `'assistant'` variant.

  **Files involved:**
  - `client/src/utils/graphLayout.ts` lines 30-38 (type definition), 109-169 (extractToolCallSummaries), 548-581 and 675-708 (internal node building)
  - `client/src/components/nodes/SubagentBoxNode.tsx` lines 292-341 (rendering only handles request/tool/response)

  **Issue 2: Tree click on subagent children doesn't navigate to graph node**

  In `TreeView.tsx` lines 172-195, when a user clicks a node inside a subagent session, the code calls:
  ```ts
  const graphNodeId = createNodeId(selectedSessionId, node.id);
  setFocusedNode(graphNodeId);
  ```

  This produces an ID like `"parentSessionId-childNodeUuid"`. However, this ID does NOT correspond to any React Flow node in the graph. Subagent children (tools, messages) are NOT individual React Flow nodes -- they exist only as data inside the `SubagentBoxNode.data.internalNodes` array and are rendered as plain `<div>` elements within the SubagentBoxNode component.

  The `GraphFocusHandler` in `GraphView.tsx` (lines 73-92) calls `fitView({ nodes: [{ id: focusedNodeId }] })` which only works for top-level React Flow nodes. Since the internal nodes of a subagent box are not React Flow nodes, the focus/navigation silently fails.

  To fix this, clicking a subagent child in the tree view would need to:
  1. Identify which SubagentBoxNode contains that child
  2. Expand that SubagentBoxNode if not already expanded (via `toggleSubagentBox`)
  3. Focus the React Flow viewport on the SubagentBoxNode (not the child)
  4. Optionally trigger the `onInternalNodeClick` callback to open the detail panel for that specific child

  **Files involved:**
  - `client/src/components/TreeView.tsx` lines 172-195 (selectNode callback)
  - `client/src/components/GraphView.tsx` lines 73-92 (GraphFocusHandler)
  - `client/src/store/sessionStore.ts` (expandedSubagentBoxes state, toggleSubagentBox action)

fix: (not applied - diagnosis only)
verification: (not applied - diagnosis only)
files_changed: []

suggested_fix_direction: |
  **For Issue 1 (missing model output nodes):**
  1. Add `'model'` to the `SubagentBoxNodeData.internalNodes[].type` union
  2. After building tool nodes in the internal nodes array, iterate `subagent.nodes` to find `MessageNode` entries with `role === 'assistant'` and non-empty content
  3. Insert them in chronological order between tool nodes (same approach TreeView uses)
  4. Add rendering for `node.type === 'model'` in `SubagentBoxNode.tsx` (purple/grey tint card with text icon)
  5. Apply to both the parallel (lines 548-581) and sequential (lines 675-708) code paths

  **For Issue 2 (tree-to-graph navigation):**
  1. In `TreeView.tsx` `selectNode`, detect when the clicked node is a child of a subagent session
  2. Find the parent subagent's ID and the corresponding SubagentBoxNode graph ID
  3. Call `toggleSubagentBox` to expand it (if not already expanded)
  4. Call `setFocusedNode` with the SubagentBoxNode's graph ID (format: `createNodeId(selectedSessionId, agentId + '-box')`)
  5. Optionally call `setSelectedNodeData` with the clicked node's data to open the detail panel
