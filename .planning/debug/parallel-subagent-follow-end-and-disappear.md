---
status: verifying
trigger: "parallel-subagent-follow-end-and-disappear"
created: 2026-02-17T00:00:00Z
updated: 2026-02-17T00:20:00Z
---

## Current Focus

hypothesis: Both bugs fixed
test: Need to verify fixes work correctly with actual parallel subagent session
expecting: Completed parallel subagents remain visible, follow-end respects expanded boxes
next_action: Update resolution and prepare verification steps

## Symptoms

expected:
Bug 1 - Completed parallel subagents should remain visible in graph view (just show as completed/stopped state)
Bug 2 - Follow-end behavior for parallel subagents:
  a) If follow-end is ON and ONE subagent is expanded/open: only jump to nodes inside that open subagent, never jump to other subagents
  b) If follow-end is ON and MULTIPLE subagents are expanded/open: jump to the last node in whichever open subagent most recently had a node added
  c) If follow-end is ON and NO subagents are expanded/open: jump to the middle/center of the parallel subagent area so most subagent content is visible (like centering the viewport on the fork-join area)
  d) When CLOSING a subagent: if no subagents remain open, revert to "none open" behavior (center on fork-join area); if at least one stays open, use the "multiple open" logic (jump to last added node in remaining open subagent)

actual:
Bug 1 - Completed subagents disappear from graph view entirely
Bug 2 - Follow-end jumps to any subagent regardless of which ones are open/expanded, causing disorienting viewport jumps

errors: No console errors reported

reproduction:
- Run a session that spawns parallel subagents (e.g., GSD with parallel executors)
- Wait for one subagent to complete → it disappears from graph
- With follow-end enabled, open one subagent → viewport jumps to other subagents' nodes too

started: Recent behavior, may have regressed with recent quick tasks 43/44

## Eliminated

- hypothesis: Filtering logic in GraphView or sessionStore removes completed subagents
  evidence: sessionStore.getFilteredSessions only filters top-level sessions by state (lines 468-469), not subagents. hiddenNodeTypes only affects when user explicitly hides categories. No automatic state-based subagent filtering found.
  timestamp: 2026-02-17T00:04:00Z

## Evidence

- timestamp: 2026-02-17T00:01:00Z
  checked: graphLayout.ts (lines 816-1674) - parallel subagent box generation logic
  found: Parallel subagents are created as subagent-box nodes with fork-join pattern. No explicit filtering based on session state that would remove completed subagents. The box nodes are created for all subagents in the parallelSiblings array regardless of state.
  implication: Bug 1 (disappearing subagents) is likely NOT in graphLayout.ts node generation - nodes are being created

- timestamp: 2026-02-17T00:01:30Z
  checked: GraphView.tsx (lines 258-309) - follow-end logic in useEffect
  found: Follow-end logic uses getEndTargetNodeId() which finds rightmost node. If tailTop is an expanded subagent-box, it jumps to last internal node. But there's no awareness of WHICH subagents are expanded - it just checks if THE tail node is an expanded box.
  implication: Bug 2 (follow-end) is confirmed - follow logic doesn't check which specific subagents are expanded, only if the discovered tail happens to be an expanded box

- timestamp: 2026-02-17T00:03:00Z
  checked: graphLayout.ts lines 361-367 and 415-424 - subagent timeline collection and filtering
  found: All subagents are added to timeline regardless of state. The filtering at line 420 checks `if (hiddenNodeTypes.has('subagents') && item.type === 'subagent')` - this would remove subagent timeline items when the "subagents" node type is hidden in the toolbar
  implication: If hiddenNodeTypes contains 'subagents', ALL subagents (including parallel ones) would be filtered out. But user says they disappear even without filtering. Need to check if there's automatic state-based filtering or if the issue is elsewhere.

- timestamp: 2026-02-17T00:05:00Z
  checked: detectParallelSubagentGroups (lines 211-250) and parallel processing (lines 822-1265)
  found: CRITICAL BUG FOUND! The `processedSubagents` Set is used to prevent double-processing (line 822, 1259, 1672). But if a subagent's messageId association changes or is missing, it gets removed from `parallelGroups`. Then: (1) it's not in `parallelSubagentIds`, so `isParallel = false`, (2) but it's ALREADY in `processedSubagents` from a previous iteration, (3) so line 822 skips it entirely. Result: node never gets created!
  implication: This is likely Bug 1. When parallel subagents' data updates (especially on completion), if messageId detection fails, they vanish. The fix: don't rely on processedSubagents across state changes, or ensure messageId is stable.

- timestamp: 2026-02-17T00:10:00Z
  checked: GraphView.tsx getEndTargetNodeId function logic walkthrough
  found: Function flow: (1) gets all nodes, (2) filters to non-structural, (3) finds sink nodes, (4) gets topLevel nodes (no parentId), (5) finds rightmost via geometry, (6) IF that node is expanded subagent-box THEN jump to its internal rightmost. The critical flaw: step 4 filters to topLevel, which INCLUDES collapsed parallel subagent boxes. So if rightmost is a collapsed box, it becomes the target, ignoring any expanded boxes that might exist elsewhere in the graph.
  implication: Confirms Bug 2 root cause. The function doesn't check "which boxes are expanded" - it just finds global rightmost and then checks if that one happens to be expanded.

- timestamp: 2026-02-17T00:12:00Z
  checked: Applied fixes to both files
  found: Bug 1 fix adds timestamp-based fallback clustering (100ms window). Bug 2 fix completely rewrites getEndTargetNodeId to: (a) get expanded boxes from store, (b) if none, center on fork-join, (c) if some, search only within those boxes.
  implication: Fixes address root causes directly. Timestamp clustering prevents parallel subagents from vanishing if messageId is lost. Expansion-aware targeting prevents disorienting jumps.

## Resolution

root_cause:
Bug 1: detectParallelSubagentGroups() in graphLayout.ts relied solely on messageId field from SubagentNode to detect parallel groups. If messageId was missing or lost (line 234: `if (!messageId) continue;`), subagents would be excluded from parallel group detection and not rendered as part of the fork-join pattern. This could cause completed parallel subagents to disappear if their messageId was not preserved.

Bug 2: getEndTargetNodeId() in GraphView.tsx (lines 152-186) found the globally rightmost node and then checked if THAT specific node was an expanded box. It had no awareness of WHICH subagent boxes were expanded. This caused follow-end to jump to any subagent's nodes regardless of expansion state, violating the expected behavior where it should only jump to nodes within expanded boxes.

fix:
Bug 1 (graphLayout.ts lines 201-303): Added fallback timestamp clustering mechanism. If messageId is missing for subagents, the function now groups subagents created within 100ms of each other as a parallel cluster. This ensures parallel subagents remain grouped even if messageId data is lost, preventing them from disappearing.

Bug 2 (GraphView.tsx lines 152-264): Rewrote getEndTargetNodeId() to be aware of expanded subagent boxes:
- Gets expandedSubagentBoxes from store for current session
- If NO boxes expanded: Finds center of all subagent-box nodes (fork-join area) and targets closest box to center
- If ONE or MORE boxes expanded: Finds rightmost node ONLY within expanded boxes' child nodes, ignoring collapsed boxes and nodes outside expanded boxes
- Respects the expansion state to prevent disorienting jumps

verification:
- ✅ Compiled successfully (npm run build)
- ✅ TypeScript type checking passed
- ⏳ Manual testing needed:

**Test Case 1 (Bug 1 - Disappearing subagents):**
1. Start a session that spawns 2-3 parallel subagents (e.g., GSD with parallel executors)
2. Wait for one subagent to complete
3. Verify: Completed subagent remains visible in graph view (shows with completed/blue state)
4. Check: All parallel subagents appear in fork-join pattern
5. Test edge case: Reload the page, verify subagents still visible

**Test Case 2 (Bug 2 - Follow-end behavior):**
Setup: Session with 2-3 parallel subagents
a) NO boxes expanded:
   - Enable follow-end
   - Verify: Viewport centers on the fork-join area (middle of parallel subagent boxes)
   - Should NOT jump to individual nodes

b) ONE box expanded:
   - Expand one subagent box
   - Enable follow-end
   - Add new nodes to that subagent (or trigger activity)
   - Verify: Viewport jumps to nodes ONLY within the expanded box
   - Verify: Does NOT jump when nodes added to other (collapsed) subagents

c) MULTIPLE boxes expanded:
   - Expand 2+ subagent boxes
   - Enable follow-end
   - Add nodes to different expanded boxes
   - Verify: Viewport jumps to the most recently added node across all expanded boxes
   - The rightmost node within any expanded box should be the target

d) CLOSING boxes:
   - Have 2 boxes expanded
   - Close one box
   - Verify: Viewport still follows the remaining expanded box
   - Close the last box
   - Verify: Viewport reverts to centering on fork-join area

**Pass criteria:**
- All parallel subagents remain visible regardless of completion state
- Follow-end respects expansion state and never jumps to collapsed boxes
- Centering logic works when no boxes expanded

files_changed:
- client/src/utils/graphLayout.ts (detectParallelSubagentGroups function)
- client/src/components/GraphView.tsx (GraphFocusHandler component, getEndTargetNodeId function)
