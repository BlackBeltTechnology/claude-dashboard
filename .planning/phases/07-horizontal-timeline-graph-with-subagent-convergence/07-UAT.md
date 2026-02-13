---
status: diagnosed
phase: 07-horizontal-timeline-graph-with-subagent-convergence
source: 07-01-SUMMARY.md, 07-02-SUMMARY.md
started: 2026-02-09T12:00:00Z
updated: 2026-02-09T12:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Horizontal Timeline Layout
expected: The graph view renders left-to-right (horizontal timeline) instead of top-to-bottom. Session and tool nodes flow from left to right, with edges connecting horizontally.
result: pass

### 2. Subagent Fork Branching
expected: When a session has subagents, subagent nodes appear as parallel branches forking off the main timeline. Multiple subagents fan out vertically from the fork point.
result: issue
reported: "they fork, but never join back to orchestrator, keep in mind every output of subagents pipe back to the main branch so all should join back!"
severity: major

### 3. Subagent Branch Convergence
expected: After subagent branches, the main timeline continues as a single line from a convergence point. There is no visible join node — the branches invisibly rejoin and execution continues to the right.
result: issue
reported: "same issue, doesn't work"
severity: major

### 4. Subagent Tool Count Indicator
expected: Subagent nodes that contain tool calls show a tool count indicator (e.g., "▶ 5 tools" or "▶ 1 tool") below the agent type label. Subagents with no tools show no indicator.
result: pass

### 5. Subagent Click Expands Tools Inline
expected: Clicking a subagent node with tools reveals those tool calls inline on the subagent's branch (to the right of the subagent node). The indicator changes from ▶ to ▼. Tools appear as individual nodes or groups on the branch, not in a side panel.
result: pass

### 6. Subagent Click Collapses Tools
expected: Clicking an already-expanded subagent node hides the inline tool calls. The indicator changes from ▼ back to ▶. The branch simplifies back to just the subagent node.
result: pass

## Summary

total: 6
passed: 4
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Subagent branches fork off and rejoin the main orchestrator timeline"
  status: failed
  reason: "User reported: they fork, but never join back to orchestrator, keep in mind every output of subagents pipe back to the main branch so all should join back!"
  severity: major
  test: 2
  root_cause: "React Flow hidden:true on join node prevents Handle rendering; JoinNode rendered null with no Handles — edges to/from join node silently dropped because React Flow needs Handle components to compute edge positions"
  artifacts:
    - path: "client/src/utils/graphLayout.ts"
      issue: "hidden: true on join node prevents React Flow from rendering Handles"
    - path: "client/src/components/nodes/index.ts"
      issue: "JoinNode rendered null — no Handle components for edge connection points"
  missing:
    - "Remove hidden: true from join node"
    - "JoinNode must render invisible Handle components (1x1px div with opacity:0 handles)"
  debug_session: ".planning/debug/fork-join-convergence.md"

- truth: "After subagent branches, the main timeline continues as a single connected line from the convergence point"
  status: failed
  reason: "User reported: same issue, doesn't work"
  severity: major
  test: 3
  root_cause: "Same root cause as test 2 — join node edges silently dropped by React Flow"
  artifacts:
    - path: "client/src/utils/graphLayout.ts"
      issue: "hidden: true on join node"
    - path: "client/src/components/nodes/index.ts"
      issue: "JoinNode rendered null with no Handles"
  missing:
    - "Same fix as test 2"
  debug_session: ".planning/debug/fork-join-convergence.md"
