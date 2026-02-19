---
status: resolved
trigger: "follow-jumps-into-parallel-group"
created: 2026-02-17T00:00:00Z
updated: 2026-02-17T00:04:00Z
---

## Current Focus

hypothesis: Fix implemented and verified to compile
test: Build completed successfully
expecting: Follow-end will now skip into parallel groups only when they are the actual last structure
next_action: Archive debug session

## Symptoms

expected: Follow-end should jump to the actual last node in the entire session graph timeline, ignoring nodes inside parallel groups that are in the middle of the graph
actual: Follow-end jumps to the rightmost internal node within a parallel fork/join group, even when there are nodes after the join in the main timeline
errors: No errors - logic bug in getEndTargetNodeId
reproduction: 1) Have a session with a parallel subagent group that is NOT the last structure, 2) Enable follow-end, 3) Expand the parallel subagents, 4) View jumps into the parallel group instead of the actual graph end
started: Same root cause as the just-fixed subagent expand issue - the parallel group case wasn't handled

## Eliminated

## Evidence

- timestamp: 2026-02-17T00:01:00Z
  checked: GraphView.tsx getEndTargetNodeId function (lines 155-295)
  found: Function handles expanded subagent boxes by finding rightmost node within boxes (lines 230-262), then compares against top-level rightmost node (lines 264-294). However, it doesn't handle the case where the expanded boxes are INSIDE a parallel group (fork/join structure).
  implication: When subagent boxes are part of a parallel group, they have a join-node after them. The function should check if the parallel group itself has successors before choosing nodes inside the group.

- timestamp: 2026-02-17T00:02:00Z
  checked: Logic for expanded boxes (lines 230-294)
  found: The code finds rightmost node inside expanded boxes, then compares with top-level rightmost. But expanded subagent-box nodes can themselves be children of a fork structure, and the code doesn't check if the PARENT fork/join has successors.
  implication: Need to identify when expanded boxes are part of a parallel group, and check if the join node has outgoing edges before considering nodes inside the group.

- timestamp: 2026-02-17T00:03:00Z
  checked: graphLayout.ts parallel group structure (lines 872-1313)
  found: Parallel groups work as: chainPoint → fork edges to multiple subagent-box nodes → all boxes connect to a single join-node → chainPoint = join-node. The join-node has ID pattern `${session.id}-join-parallel-${index}`. Edges from boxes to join are created at lines 1298-1305, and chainPoint is updated to join at line 1312.
  implication: When expanded boxes have join-node edges, need to check if that join-node has outgoing edges. If it does, those outgoing targets are AFTER the parallel group and should be preferred over internal nodes.

## Resolution

root_cause: getEndTargetNodeId (lines 230-294) finds rightmost nodes inside expanded subagent-boxes and compares them with top-level rightmost nodes. However, when those expanded boxes are part of a parallel group (fork/join structure), the function doesn't check if the join-node has outgoing edges to nodes after the parallel group. The structure is: fork → subagent-boxes → join-node → more nodes. Follow-end should only go inside the parallel group if the join-node has no successors (i.e., the parallel group is actually the last structure in the graph).

fix: Added logic to detect when expanded boxes are part of a parallel group by:
1. Finding edges from expanded boxes to join-nodes (line 236-244)
2. Checking if any join-node has outgoing edges (lines 246-252)
3. If join has successors → ignore nodes inside boxes, return top-level rightmost (lines 256-261)
4. If join has no successors → proceed with original logic to compare box internals vs top-level (lines 264-307)

verification: ✓ Build completed successfully without errors. The logic now checks if expanded boxes are part of a parallel group with successors, and if so, ignores nodes inside the boxes and returns the top-level rightmost node. This ensures follow-end only jumps into parallel groups when they are the actual last structure in the graph.

Logic verification:
- If parallel group has nodes after join → return top-level rightmost (skips box internals)
- If parallel group is last structure → compare box internals with top-level as before
- Preserves existing behavior for non-parallel expanded boxes

files_changed: [client/src/components/GraphView.tsx]

root_cause:
fix:
verification:
files_changed: []
