---
status: resolved
trigger: "When clicking a tree node in the TreePanel, the graph pans/zooms to that node (correct), BUT it also opens the metadata detail panel for that node (incorrect). It should ONLY navigate to the node, not open the detail panel."
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - TreeView's selectNode callback directly calls detail-opening actions
test: examined all code paths in selectNode callback
expecting: root cause identified and documented
next_action: return diagnosis to user

## Symptoms

expected: Clicking a tree node should only pan/zoom the graph to that node (navigation)
actual: Clicking a tree node both pans/zooms AND opens the detail panel showing metadata
errors: None
reproduction: Click any tree node in TreePanel
started: Unknown (existing behavior)

## Eliminated

## Evidence

- timestamp: 2026-02-12T00:01:00Z
  checked: TreeView.tsx selectNode callback (lines 175-237)
  found: Multiple explicit calls to setSelectedNodeData for different node types
  implication: TreeView is directly opening the detail panel, not just navigating

- timestamp: 2026-02-12T00:02:00Z
  checked: sessionStore.ts setSelectedNodeData implementation (lines 282-286)
  found: setSelectedNodeData sets selectedNodeData AND selectedGroupId (line 284)
  implication: This is the action that opens the detail panel

- timestamp: 2026-02-12T00:03:00Z
  checked: TreeView.tsx selectNode for each node type
  found:
    - Lines 181-200: tool nodes → calls setSelectedGroupData AND setFocusedNode
    - Lines 201-209: tool-group nodes → calls setSelectedGroupId AND setFocusedNode
    - Lines 210-218: skill/subagent nodes → calls setSelectedNodeData AND setFocusedNode
    - Lines 219-227: message nodes → calls setSelectedNodeData AND setFocusedNode
    - Lines 228-234: session nodes → calls setSelectedNodeData AND setFocusedNode
  implication: EVERY node type calls both detail-opening actions AND navigation action

- timestamp: 2026-02-12T00:04:00Z
  checked: GraphView.tsx onNodeClick handler (lines 339-424)
  found: GraphView also calls setSelectedNodeData when nodes are clicked
  implication: Graph clicks should open detail panel (correct), but tree clicks should only navigate

## Resolution

root_cause: TreeView's selectNode callback calls setSelectedNodeData/setSelectedGroupData/setSelectedGroupId for all node types (lines 181-234), which opens the detail panel. Tree clicks should ONLY call setFocusedNode (navigation) and NOT call the detail-opening actions.
fix: Remove calls to setSelectedNodeData, setSelectedGroupData, and setSelectedGroupId from TreeView.tsx selectNode callback. Keep only setFocusedNode calls for navigation.
verification: Click tree nodes and verify graph pans/zooms without opening detail panel. Click graph nodes directly to verify detail panel still opens.
files_changed: ['client/src/components/TreeView.tsx']
