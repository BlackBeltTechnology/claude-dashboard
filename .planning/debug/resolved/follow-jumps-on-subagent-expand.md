---
status: resolved
trigger: "follow-jumps-on-subagent-expand"
created: 2026-02-17T00:00:00Z
updated: 2026-02-17T00:00:06Z
---

## Current Focus

hypothesis: Fix verified at build time - no compilation errors
test: Runtime behavior verification - need user to test the scenario
expecting: When expanding a mid-graph subagent with follow-end enabled, view should stay at actual graph end (not jump to expanded box's internal node)
next_action: Document verification steps for user testing

## Symptoms

expected: When expanding a subagent that's in the middle of the graph (has nodes after it), the view should NOT jump. Follow-end should only track the actual last node of the entire session graph.
actual: Expanding any subagent causes follow-end to jump to that subagent's last internal node, even when the subagent is not at the end of the timeline.
errors: No errors - it's a logic bug
reproduction: 1) Have a session with multiple subagents, 2) Enable follow-end, 3) Expand a subagent that is NOT the last node in the graph, 4) View jumps to that subagent's last internal node instead of staying at the actual graph end
started: Likely since subagent expand/collapse was implemented

## Eliminated

## Evidence

- timestamp: 2026-02-17T00:00:01Z
  checked: GraphView.tsx lines 155-265 (getEndTargetNodeId function)
  found: Function finds "rightmost node" for follow-end. Lines 230-264 handle expanded subagent boxes - it searches ONLY within expanded boxes for rightmost node, ignoring whether there are nodes after the subagent in the main timeline
  implication: When a subagent box is expanded, follow-end always jumps to rightmost node inside that box, regardless of whether the box is at the end of the graph

- timestamp: 2026-02-17T00:00:02Z
  checked: GraphView.tsx lines 166-176
  found: Code gets list of expanded subagent boxes for the current session, then if any are expanded (line 179), it falls into the "search only within expanded boxes" logic (lines 230-264)
  implication: The mere existence of expanded boxes triggers follow-to-expanded-box behavior, not checking if they are the actual end nodes

- timestamp: 2026-02-17T00:00:03Z
  checked: GraphView.tsx logic flow at line 179
  found: "if (expandedBoxNodes.length === 0)" means if NO boxes expanded, use fallback logic (lines 180-228) which correctly finds rightmost top-level node. But if even ONE box is expanded, it ONLY searches within expanded boxes (lines 230-264), completely ignoring top-level nodes
  implication: The issue is an either/or: either search top-level OR search expanded boxes, never considering both simultaneously to find the true rightmost across entire graph

- timestamp: 2026-02-17T00:00:05Z
  checked: npm run build output
  found: Build succeeded with no TypeScript or compilation errors
  implication: Fix is syntactically correct and type-safe

## Resolution

root_cause: getEndTargetNodeId function in GraphView.tsx (lines 155-265) uses mutually exclusive logic - when any subagent box is expanded, it ONLY searches within expanded boxes (lines 230-264) and completely ignores top-level nodes. This means if you expand a mid-graph subagent while there are nodes after it, follow-end will jump to the expanded box's rightmost internal node instead of the true graph end. Fix: Need to compare rightmost nodes from BOTH expanded boxes AND top-level nodes, then return whichever is actually rightmost in the graph.
fix: Modified getEndTargetNodeId (lines 230-290) to: 1) Find rightmost node in expanded boxes, 2) Find rightmost top-level node, 3) Calculate absolute positions for both, 4) Return whichever is actually rightmost in the graph
verification: Build verification passed. Runtime verification steps: 1) Start dashboard, 2) Open session with multiple subagents, 3) Enable follow-end feature, 4) Expand a mid-graph subagent (one that has nodes after it), 5) Observe that view stays at actual graph end instead of jumping to subagent's internal node. Expected: No unwanted jumping when expanding mid-graph subagents.
files_changed: [client/src/components/GraphView.tsx]
