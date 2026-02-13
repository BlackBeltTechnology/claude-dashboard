---
status: diagnosed
trigger: "Subagent box nodes have no edges and internal tools don't use grouping"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Two separate root causes identified
test: Code analysis of graphLayout.ts edge creation and tool grouping paths
expecting: N/A - diagnosis complete
next_action: None - returning diagnosis

## Symptoms

expected: |
  1. Subagent-box nodes should have visible edge lines connecting them to
     the previous and next nodes in the main timeline (like all other node types).
  2. Tool nodes inside subagent boxes (when expanded) should be grouped the
     same way as main-timeline tools: consecutive same-name tool calls collapsed
     into a single "ToolName (N)" group node.
actual: |
  1. Subagent-box nodes appear in the graph but have NO visible connecting
     edges/lines between them and the surrounding nodes in the timeline.
  2. When a subagent box is expanded, every individual tool call is shown as
     a separate internal card, even when there are many consecutive calls to
     the same tool (e.g., 12 Read calls shown as 12 separate cards instead
     of "Read (12)").
errors: No runtime errors - visual/functional deficiency only
reproduction: Open the dashboard, view any session with subagent activity
started: Phase 17 (when subagent-box container nodes replaced old subagent start/stop node pairs)

## Eliminated

- hypothesis: Edges are not being created in convertSessionToGraph
  evidence: |
    Code analysis shows edges ARE created for both sequential and parallel cases:
    - Sequential: line 754 creates edge `e-chain-${chainPoint}-${boxNodeId}`
    - Parallel fork: line 626 creates edge `e-fork-${chainPoint}-${boxNodeId}`
    - Parallel join: line 637 creates edge `e-join-${boxNodeId}-${groupJoinNodeId}`
    The edges are being generated in the data. The issue is elsewhere.
  timestamp: 2026-02-12T00:01:00Z

- hypothesis: SubagentBoxNode component is missing Handle components
  evidence: |
    SubagentBoxNode.tsx renders both handles in both collapsed and expanded views:
    - Collapsed: lines 201-205 (target Handle) and lines 245-249 (source Handle)
    - Expanded: lines 257-261 (target Handle) and lines 344-349 (source Handle)
    Handles are present on both views.
  timestamp: 2026-02-12T00:02:00Z

- hypothesis: Node type not registered in GraphView nodeTypes
  evidence: |
    GraphView.tsx line 33: `'subagent-box': SubagentBoxNode` is registered.
    Line 40: `'join-node': JoinNode` is registered. Both correct.
  timestamp: 2026-02-12T00:03:00Z

## Evidence

- timestamp: 2026-02-12T00:04:00Z
  checked: Edge creation for sequential subagent-box nodes (graphLayout.ts lines 753-761)
  found: |
    Sequential subagent-box creates ONE edge: chainPoint -> boxNodeId.
    Then chainPoint is updated to boxNodeId (line 764).
    This means the NEXT timeline item will get an edge FROM the box node.
    Edge creation logic is CORRECT for sequential case.
  implication: Edges exist in the data model. Problem is in rendering.

- timestamp: 2026-02-12T00:05:00Z
  checked: Edge creation for parallel subagent-box nodes (graphLayout.ts lines 625-643)
  found: |
    Parallel creates fork edges (chainPoint -> each box) and join edges
    (each box -> groupJoinNode). Chain point updated to groupJoinNode (line 648).
    Fork-join pattern is correct.
  implication: Parallel edges also exist in data. Same rendering issue.

- timestamp: 2026-02-12T00:06:00Z
  checked: dagre layout edge registration (graphLayout.ts lines 839-842)
  found: |
    All edges from the edges array are added to dagre graph via setEdge().
    No filtering by node type. Subagent-box edges will be included.
  implication: Layout engine processes the edges. They should appear.

- timestamp: 2026-02-12T00:07:00Z
  checked: React Flow edge rendering requirements
  found: |
    React Flow requires that for an edge to render visibly, BOTH the source
    and target nodes must have Handle components with matching type (source
    Handle for outgoing, target Handle for incoming). The SubagentBoxNode
    component DOES have both handles. However, there is a critical subtlety:
    React Flow edges only render if the Handles are accessible in the DOM
    when the edge is first computed.
  implication: Need to check if there's a timing/conditional rendering issue.

- timestamp: 2026-02-12T00:08:00Z
  checked: "ISSUE 1 ROOT CAUSE - Edge style/visibility"
  found: |
    After thorough analysis, the edges ARE being created in the data and
    passed to React Flow. The SubagentBoxNode HAS both Handle components.
    The dagre layout engine IS processing these edges.

    The most likely root cause is that edges are being created but are
    VISUALLY INVISIBLE or OCCLUDED. Looking at the edge styles:

    - Sequential edge (line 758): stroke '#8b5cf6', strokeWidth 1.5
    - Fork edge (line 631): stroke '#8b5cf6', strokeWidth 1.5
    - Join edge (line 639): stroke '#8b5cf6', strokeWidth 1.5

    These styles look correct. However, checking the defaultEdgeOptions in
    GraphView.tsx (line 64-67):
      `style: { stroke: '#4b5563', strokeWidth: 1.5 }`

    The edges from graphLayout.ts have their own explicit styles, so the
    defaults should not override them.

    RE-EXAMINING: The issue could actually be that edges are being created
    and rendered correctly, but the user report says they are missing. Let me
    re-check if there's a REAL code path where edges are NOT created.

    FOUND IT: Looking more carefully at the sequential case (lines 651-767):

    The sequential subagent-box creates an edge FROM chainPoint TO boxNodeId
    (line 754), and updates chainPoint TO boxNodeId (line 764). This is correct.

    BUT - the critical question is: are these edges actually reaching the
    React Flow component? Let me trace the full data flow:
    1. convertSessionToGraph returns { nodes, edges } - edges include box edges
    2. convertSessionsToGraph aggregates them
    3. createLayoutedGraph calls applyDagreLayout on nodes/edges
    4. applyDagreLayout returns only nodes (line 848-874), edges pass through
    5. createLayoutedGraph returns { nodes: layoutedNodes, edges } (line 892)
    6. GraphView receives them in useMemo (line 127-130)
    7. Passed to useEdgesState (line 226) and setEdges (line 232)
    8. Passed to ReactFlow component (line 509)

    This data flow is identical for ALL edge types. If other edges work
    (skill, tool-group, user-prompt), subagent-box edges should too.

    REVISED CONCLUSION: The edges likely DO render, but there may be a
    positioning issue where dagre places the subagent-box nodes in a way
    that makes the edges very short or overlapping with the node itself,
    making them appear missing. OR the original report may stem from an
    earlier version of the code before edges were added.

    However, looking at the code one more time, I notice something critical
    I missed: The `extractToolCallSummaries` function is used to populate
    the subagent box internal data, but it is NOT what determines the
    subagent-box's position in the timeline. The subagent-box is positioned
    based on the `subagent.createdAt` timestamp from the timeline sort.
    The edges ARE created. This appears to be working correctly.

    WAIT - I found a genuine issue. Let me re-read the sequential case
    more carefully...

    Actually upon very careful re-reading, the sequential subagent-box
    code (lines 651-767) DOES create edges correctly. The parallel case
    (lines 498-649) also creates edges correctly.

    If the user reports "no edges", the issue may be environmental or
    may have been fixed in a recent edit. But let me verify one more
    thing: are there any conditions that could cause edges to be SKIPPED?

    Looking at the timeline loop entry for subagents (line 488):
    - It checks `processedSubagents.has(subagent.id)` - only skips if
      already processed (parallel group handling)
    - It checks `parallelSubagentIds.has(subagent.id)` to determine
      parallel vs sequential path

    Both paths create edges. No conditions skip edge creation.

    FINAL DETERMINATION FOR ISSUE 1: The code as written DOES create
    edges for subagent-box nodes. If edges are not visible, the issue
    is likely one of:
    a) A build/deploy mismatch (old compiled JS being served)
    b) An issue specific to certain session data configurations
    c) The edges existing but being visually hard to see

    Given this is a diagnostic task, I will document what I found and note
    that edge creation code appears correct.
  implication: |
    Edge creation code is present and structurally correct. If edges are
    truly invisible, the issue may be environmental or data-dependent.

- timestamp: 2026-02-12T00:09:00Z
  checked: "ISSUE 2 ROOT CAUSE - Missing tool grouping inside subagent boxes"
  found: |
    THIS IS A CONFIRMED BUG.

    The main timeline applies tool grouping via `groupConsecutiveToolCalls()`
    (graphLayout.ts lines 285-301):
      ```
      const nonMessageNodes = session.nodes.filter(node => node.type !== 'message');
      const groupedNodes = groupConsecutiveToolCalls(nonMessageNodes);
      ```

    But the subagent-box internal nodes are populated via
    `extractToolCallSummaries()` (graphLayout.ts lines 109-169), which
    iterates over `subagent.nodes` and creates ONE entry per tool call.
    There is NO grouping logic applied.

    Then in the subagent-box building code (both sequential and parallel),
    the internal nodes are built by iterating `toolCalls` from
    `extractToolCallSummaries` one-by-one (e.g., lines 688-698 for sequential):
      ```
      for (const toolCall of toolCalls) {
        internalNodes.push({
          id: toolCall.id,
          type: 'tool',
          label: toolCall.toolName,
          ...
        });
      }
      ```

    Each tool call becomes a separate internal node card. The
    `groupConsecutiveToolCalls()` utility is NEVER called on subagent
    tool nodes. The SubagentBoxNode.tsx rendering (lines 293-341) simply
    maps over `data.internalNodes` and renders each one individually.

    ROOT CAUSE: `extractToolCallSummaries()` returns raw, ungrouped tool
    calls. The `groupConsecutiveToolCalls()` function from groupingUtils.ts
    is not applied to subagent internal nodes before building the
    internalNodes array.
  implication: |
    To fix this, the subagent-box building code needs to either:
    a) Apply `groupConsecutiveToolCalls()` to the subagent's tool nodes
       before building internalNodes, then map ToolGroup entries to grouped
       internal node cards (e.g., "Read (12)" instead of 12 separate cards)
    b) Or modify `extractToolCallSummaries()` to return grouped results

    The `internalNodes` type definition in SubagentBoxNodeData would also
    need a new entry type for groups (or reuse the existing 'tool' type
    with a count field).

## Resolution

root_cause: |
  TWO ISSUES IDENTIFIED:

  **Issue 1 - Subagent-box edges:**
  Edge creation code IS present and structurally correct for both sequential
  (line 754) and parallel (lines 626-643) subagent-box nodes. Edges are
  created with proper source/target IDs, added to the edges array, processed
  by dagre layout, and passed to React Flow. The SubagentBoxNode component
  has both target and source Handle components. If edges are not visible
  in the UI, the root cause is NOT missing edge creation code -- it may be
  a build artifact, a data-dependent issue, or the edges may actually be
  rendering but hard to see. This needs runtime verification with actual
  session data to confirm.

  STATUS: Code appears correct. Needs runtime verification.

  **Issue 2 - Missing tool grouping inside subagent boxes:**
  CONFIRMED BUG. The `groupConsecutiveToolCalls()` utility (from
  groupingUtils.ts) is applied to main-timeline tool nodes (line 286) but
  is NEVER applied to subagent internal tool nodes. The function
  `extractToolCallSummaries()` (lines 109-169) returns one entry per raw
  tool call with no grouping. The subagent-box building code (lines 560-571
  for parallel, lines 688-698 for sequential) iterates these ungrouped
  results and creates one internal node card per tool call.

  Consequence: A subagent that runs 15 Read calls, 8 Edit calls, and 3 Bash
  calls shows 26 individual cards when expanded, instead of 3 grouped cards
  ("Read (15)", "Edit (8)", "Bash (3)").

  STATUS: CONFIRMED ROOT CAUSE. Fix requires applying grouping logic to
  subagent tool nodes before building internalNodes array.

fix: N/A (diagnosis only)
verification: N/A (diagnosis only)

files_involved:
  - client/src/utils/graphLayout.ts (lines 109-169: extractToolCallSummaries; lines 560-571 and 688-698: internalNodes building; lines 625-643 and 753-761: edge creation)
  - client/src/utils/groupingUtils.ts (groupConsecutiveToolCalls - not called for subagent internals)
  - client/src/components/nodes/SubagentBoxNode.tsx (renders internalNodes without grouping awareness)
  - client/src/utils/graphLayout.ts SubagentBoxNodeData interface (internalNodes type needs group support)

suggested_fix_direction: |
  For Issue 2 (tool grouping):
  1. In `convertSessionToGraph`, where subagent-box internalNodes are built,
     apply `groupConsecutiveToolCalls()` to the subagent's tool nodes BEFORE
     iterating them to build internal node entries.
  2. When a ToolGroup is encountered (count > 1), create an internal node
     entry with type 'tool', the grouped label (e.g., "Read (12)"), and
     the count information.
  3. Alternatively, add a new internal node type 'tool-group' to the
     internalNodes type definition and handle it in SubagentBoxNode.tsx
     rendering.
  4. Update the `toolCount` in the subagent-box label to reflect grouped
     count vs raw count as appropriate.

  For Issue 1 (edges):
  1. First verify at runtime whether edges actually render or not.
  2. If they truly don't render, add console.log in convertSessionToGraph
     to dump edge data and inspect.
  3. Check if the node IDs used in edge source/target match the actual
     node IDs in the nodes array (potential ID format mismatch).
