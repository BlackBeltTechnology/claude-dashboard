---
status: resolved
trigger: "Subagent fork-join convergence not working - branches fork but never rejoin"
created: 2026-02-09T00:00:00Z
updated: 2026-02-09T00:10:00Z
---

## Current Focus

hypothesis: CONFIRMED and FIXED
test: Build compiles successfully
expecting: Subagent branches now converge to join node and main timeline continues
next_action: Manual visual verification needed (automated build passes)

## Symptoms

expected: After subagent branches fork, invisible join nodes collect all branches and the main timeline continues to the right from the convergence point
actual: Subagent branches fork but dangle - they don't connect back to a join node, and the main timeline doesn't continue from a convergence point
errors: None reported (visual bug)
reproduction: View any session with subagents in graph view
started: Unknown - may have never worked correctly

## Eliminated

## Evidence

- timestamp: 2026-02-09T00:01:00Z
  checked: convertSessionToGraph in graphLayout.ts (lines 257-452)
  found: Join node IS being created (line 261-268), edges from branch tails to join node ARE being created (lines 441-447), prevNodeId IS updated to joinNodeId (line 451)
  implication: The graph data generation logic appears structurally correct

- timestamp: 2026-02-09T00:02:00Z
  checked: Join node creation details (line 262-268)
  found: Join node has `hidden: true` property and `type: 'join-node' as any`
  implication: The `hidden: true` flag on the join node is the prime suspect

- timestamp: 2026-02-09T00:03:00Z
  checked: GraphView.tsx nodeTypes registration (line 26-33)
  found: 'join-node' type IS registered and maps to JoinNode component
  implication: Node type registration is correct

- timestamp: 2026-02-09T00:04:00Z
  checked: JoinNode component in nodes/index.ts (lines 10-11)
  found: Component renders `null` -- no Handle components rendered
  implication: React Flow requires Handle components to compute edge positions

- timestamp: 2026-02-09T00:05:00Z
  checked: NODE_DIMENSIONS for join-node (line 28)
  found: `'join-node': { width: 1, height: 1 }` -- dagre allocates space for it
  implication: Dagre positions the node correctly, but React Flow cannot connect edges to it

- timestamp: 2026-02-09T00:06:00Z
  checked: React Flow source code -- node rendering (node_modules/@xyflow/react/dist/esm/index.mjs:2130)
  found: When `node.hidden === true`, the node wrapper returns null early, preventing ANY child rendering including Handle components
  implication: CRITICAL -- hidden:true prevents Handle initialization entirely

- timestamp: 2026-02-09T00:07:00Z
  checked: React Flow source code -- edge position calculation (@xyflow/system/dist/esm/index.mjs:1366-1399)
  found: `getEdgePosition()` calls `isNodeInitialized()` which checks for `handleBounds` or `handles`. Returns null if source/target node not initialized.
  implication: Since JoinNode has no handles AND is hidden, getEdgePosition returns null for ALL edges connecting to it

- timestamp: 2026-02-09T00:08:00Z
  checked: React Flow source code -- edge rendering (node_modules/@xyflow/react/dist/esm/index.mjs:2846)
  found: `if (edge.hidden || sourceX === null || sourceY === null || targetX === null || targetY === null) { return null; }`
  implication: CONFIRMED -- When getEdgePosition returns null, edge coordinates are all null, so ALL edges to/from join node are silently dropped

- timestamp: 2026-02-09T00:09:00Z
  checked: Build verification after fix
  found: `npm run build` succeeds -- shared, server, and client all compile without errors
  implication: Fix is syntactically correct and type-safe

## Resolution

root_cause: |
  Two-part failure preventing join node edges from rendering:

  1. JoinNode component (nodes/index.ts:10) renders `null` -- no <Handle> components.
     React Flow requires Handle components on a node to compute edge connection points (handleBounds).
     Without handles, `isNodeInitialized()` returns false, and `getEdgePosition()` returns null.

  2. Join node created with `hidden: true` (graphLayout.ts:267).
     When hidden is true, React Flow's node wrapper returns null early (index.mjs:2130-2131),
     preventing ANY child rendering -- even if JoinNode rendered Handles, they'd never mount.

  Combined effect: ALL edges to/from the join node get null coordinates, causing React Flow
  to silently skip rendering them (index.mjs:2846). The join edges, the join node, and any
  continuation edges from the join node are all invisible.

fix: |
  1. Removed `hidden: true` from join node creation in graphLayout.ts (line 267)
     - The JoinNode component handles its own visual invisibility via 1x1px div
  2. Updated JoinNode component in nodes/index.ts to render:
     - A 1x1px wrapper div (visually invisible)
     - Handle components (target on Left, source on Right) with opacity:0
     - This gives React Flow the handle bounds it needs for edge position calculation

verification: |
  - Build compiles successfully (shared + server + client)
  - No TypeScript errors
  - Visual verification needed: view a session with subagents in graph view

files_changed:
  - client/src/components/nodes/index.ts
  - client/src/utils/graphLayout.ts
