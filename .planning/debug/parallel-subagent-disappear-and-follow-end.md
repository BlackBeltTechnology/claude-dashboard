---
status: investigating
trigger: "Investigate and fix: parallel-subagent-disappear-and-follow-end"
created: 2026-02-17T10:00:00Z
updated: 2026-02-17T10:00:00Z
---

## Current Focus

hypothesis: Bug 1 - completed parallel subagents are filtered out in graphLayout.ts when building fork-join structure. Bug 2 - follow-end logic doesn't consider expandedSubagentBoxes state.
test: examining graphLayout.ts for subagent filtering logic and GraphFocusHandler for follow-end implementation
expecting: find condition that excludes completed subagents, and follow-end logic that needs context-awareness
next_action: read graphLayout.ts and locate parallel subagent rendering logic

## Symptoms

expected:
**Bug 1 - Disappearing subagents:** When a parallel subagent finishes work, it should remain visible in the graph view (just change to completed state). It should NOT disappear.

**Feature 2 - Smart follow-end for parallel subagents:** Follow-end viewport behavior should depend on which subagent boxes are open/closed:

- **NONE open:** Jump/scroll to the CENTER of the parallel subagent group so all subagents are visible at once
- **ONE open:** Only jump to the last node INSIDE that open subagent
- **MULTIPLE open:** Jump to the last node that was added in ANY of the open subagents
- **CLOSING logic:** When closing a subagent box, if NO subagent remains open, center on parallel group

actual:
**Bug 1:** Parallel subagents disappear from graph view when they finish work.
**Feature 2:** Follow-end currently jumps to the absolute last node in the pipeline regardless of which subagents are open.

errors: No console errors - visual/behavioral issues only.
reproduction:
Bug 1: Watch parallel subagents running. When one completes, it vanishes from the graph.
Feature 2: Open one parallel subagent box, have follow-end on. The graph jumps to nodes outside the open subagent.

started: Bug 1 is likely a regression. Feature 2 has never worked this way - it's new behavior needed.

## Eliminated

## Evidence

- timestamp: 2026-02-17T10:05:00Z
  checked: graphLayout.ts lines 826-865, parallel subagent box creation
  found: No obvious filtering condition that removes completed parallel subagents. The code iterates through `parallelSiblings` array (line 849) and creates subagent-box nodes for each. The `processedSubagents` set prevents duplicate processing but doesn't filter by state.
  implication: Bug 1 might not be in the layout generation itself. Need to check if filtering happens earlier (in `parallelGroups` detection or `sortedSubagents`).

- timestamp: 2026-02-17T10:06:00Z
  checked: graphLayout.ts lines 211-250, detectParallelSubagentGroups function
  found: Function takes `subagents: Session[]` array as input. It only groups by messageId, doesn't filter by state. Returns Map of messageId -> subagent IDs.
  implication: Parallel group detection doesn't filter out completed subagents. The bug must be in how `sortedSubagents` or `parallelSiblings` are built.

- timestamp: 2026-02-17T10:08:00Z
  checked: graphLayout.ts lines 404-836, timeline processing and parallel subagent handling
  found: Line 404 creates `sortedSubagents` from `session.subagents.sort()`. Line 831-836 filters `sortedSubagents` to get `parallelSiblings` based on `groupIds.includes(s.id)`. No state-based filtering visible.
  implication: Need to check if `session.subagents` itself is being filtered somewhere, or if the issue is in how nodes/edges are added to the graph.

- timestamp: 2026-02-17T10:10:00Z
  checked: GraphView.tsx lines 112-312, GraphFocusHandler component (follow-end logic)
  found: `getEndTargetNodeId()` function (lines 152-186) finds the rightmost node. Line 173-183: if tail is expanded subagent-box, it jumps to last internal node inside. No logic to check `expandedSubagentBoxes` state or handle parallel groups specially.
  implication: Bug 2 confirmed - follow-end doesn't consider which subagent boxes are open/closed. It always jumps to the absolute last node regardless of expansion state.

## Resolution

root_cause:
fix:
verification:
files_changed: []
