---
phase: 11-fix-parallel-subagent-rendering-session-titles-and-left-panel-grouping
plan: 02
subsystem: graph-layout
tags: [parallel-subagents, fork-join, graph-visualization, timeline]
dependencies:
  requires:
    - "Phase 10-01: Sequential subagent chain infrastructure (sequencer nodes, chain point pattern)"
    - "Phase 07-02: Fork-join pattern with join nodes for branch convergence"
  provides:
    - "detectParallelSubagentGroups: Detection of parallel Task invocations by parentId"
    - "expandSubagentInline: Reusable helper for subagent tool expansion"
    - "Conditional fork-join vs sequential chain rendering based on parallel detection"
  affects:
    - "GraphView: Parallel subagents now render as forked branches at same rank"
    - "Timeline visualization: Mixed sessions with both parallel and sequential subagents render correctly"
tech-stack:
  added: []
  patterns:
    - "Parallel detection by SubagentNode parentId grouping (2+ nodes with same parentId = parallel)"
    - "Fork-join for parallel groups with shared join node per group"
    - "Sequential chain with sequencer nodes for non-parallel subagents"
    - "Helper function extraction (expandSubagentInline) to avoid code duplication"
key-files:
  created: []
  modified:
    - path: "client/src/utils/graphLayout.ts"
      changes: "Added detectParallelSubagentGroups, expandSubagentInline; refactored subagent processing with conditional parallel/sequential logic"
    - path: "client/src/components/DirectoryOverview.tsx"
      changes: "Fixed TypeScript error in handleNodeClick by adding SessionNodeData type assertion"
decisions:
  - title: "Detect parallel by parentId grouping"
    rationale: "Multiple SubagentNodes with same parentId were invoked in same assistant message (parallel). Simple and reliable detection without needing JSONL access."
    alternatives: "Parse JSONL toolUses arrays on client (expensive, violates separation of concerns); timestamp-based heuristics (unreliable)"
  - title: "Extract expandSubagentInline helper"
    rationale: "Both parallel and sequential branches need identical tool expansion logic. Extracting to helper avoids 200+ lines of duplication and reduces maintenance burden."
    alternatives: "Duplicate code in both paths (high maintenance cost); inline all logic (readability suffers)"
  - title: "Preserve both fork-join and sequential patterns"
    rationale: "Phase 10 changed ALL subagents to sequential, which was correct for non-parallel invocations. Must preserve sequential chains while restoring fork-join for genuinely parallel cases."
    alternatives: "Convert all to fork-join (breaks sequential sessions); keep all sequential (loses parallel visualization)"
metrics:
  duration: 2.8min
  tasks_completed: 1
  files_modified: 2
  loc_added: ~180
  loc_removed: ~170
completed: 2026-02-09T13:47:05Z
---

# Phase 11 Plan 02: Detect and Render Parallel Subagents with Fork-Join Pattern Summary

**One-liner:** Conditional parallel subagent detection by parentId grouping with fork-join rendering for parallel groups and sequential chains for non-parallel subagents.

## What Was Built

Added parallel subagent detection to graphLayout.ts that distinguishes between genuinely parallel Task invocations (multiple SubagentNodes with same parentId) and sequential ones. Parallel subagents now render as forked branches that converge at join nodes, while sequential subagents continue to use Phase 10's chain pattern.

### Key Components

**1. detectParallelSubagentGroups (lines 62-84)**
- Examines session.nodes for SubagentNodes
- Groups by parentId (same parentId = invoked in same assistant message)
- Returns Map<parentId, agentIds[]> for groups with 2+ parallel subagents
- Filters out single-subagent groups (sequential, not parallel)

**2. expandSubagentInline (lines 91-224)**
- Extracted from duplicated expansion code (was 200+ lines in 2 places)
- Handles tool group expansion, single tool/skill nodes, nested subagents
- Returns final branchTailId after expansion
- Reused by both parallel and sequential rendering paths

**3. Conditional Subagent Processing (lines 433-643)**
- Detects parallel groups via detectParallelSubagentGroups
- Builds parallelAgentIds Set and agentIdToParent Map for classification
- Iterates subagents in creation order (preserves temporal flow)
- Routes to PARALLEL GROUP or SEQUENTIAL SUBAGENT path based on detection
- Tracks processedSubagents to avoid double-processing
- Connects final chain point to main join node for timeline continuation

**4. Parallel Group Rendering (lines 490-558)**
- Finds all siblings with same parentId from parallel group
- Creates single join node per parallel group
- For each parallel sibling:
  - Creates subagent node with expansion metadata
  - Fork edge from chainPoint to subagent node
  - Expands inline tools if isExpanded (via expandSubagentInline)
  - Join edge from branch tail to group join node
- Updates chainPoint to group join node for next sequential item

**5. Sequential Subagent Rendering (lines 563-618)**
- Creates subagent node with expansion metadata
- Chain edge from chainPoint to subagent node
- Expands inline tools if isExpanded (via expandSubagentInline)
- Creates sequencer node if not last unprocessed subagent (Phase 10 pattern)
- Updates chainPoint to sequencer or branch tail

### Bug Fix: DirectoryOverview TypeScript Error

Fixed unrelated TypeScript error in DirectoryOverview.tsx (line 77) where node.data.sessionId access failed type checking:
- Added SessionNodeData import
- Used type assertion: `const data = node.data as SessionNodeData`
- Preserves existing navigation functionality without regression

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 1 - Bug] DirectoryOverview TypeScript error blocking build**
- **Found during:** Build verification after graphLayout.ts changes
- **Issue:** `node.data.sessionId` access on generic Node type caused TypeScript error "Argument of type '{}' is not assignable to parameter of type 'string'"
- **Root cause:** Node parameter in handleNodeClick has `data: unknown` by default, no type narrowing applied
- **Fix:** Imported SessionNodeData type, added type assertion after type guard check
- **Files modified:** client/src/components/DirectoryOverview.tsx (lines 16, 75-80)
- **Commit:** (No commits per user preference)
- **Why Rule 1:** Blocking issue preventing build completion and task verification

No other deviations — plan executed as written. All functionality implemented per specification.

## Verification Results

**Build verification:**
```bash
$ npm run build
> tsc && vite build
✓ 544 modules transformed
✓ built in 4.50s
```

**Code verification:**
- ✅ `detectParallelSubagentGroups` function exists (line 62)
- ✅ `expandSubagentInline` helper function exists and used in both paths (lines 91, 543, 599)
- ✅ Both PARALLEL GROUP and SEQUENTIAL SUBAGENT code paths exist (lines 490, 563)
- ✅ Word "parallelGroups" appears in subagent processing (lines 77, 80, 84, 442, 446)
- ✅ Expansion state logic preserved (expandedGroups.has, expandedSubagents.has checks at lines 133, 316, 512, 568)
- ✅ No TypeScript errors in build output

**Functional verification (visual inspection of code):**
- ✅ Parallel subagents fork from same chainPoint (fork pattern, line 536)
- ✅ Each parallel group converges at dedicated join node (line 499)
- ✅ Sequential subagents chain through sequencer nodes (Phase 10 pattern preserved, lines 602-616)
- ✅ Mixed sessions handle both patterns (conditional routing at line 488)
- ✅ Join nodes not hidden (React Flow would drop edges otherwise, per Phase 10 learnings)

## Key Decisions Made

**Decision 1: Detection by parentId grouping, not JSONL parsing**

Multiple SubagentNodes sharing the same parentId means they were created from tool_use blocks in a single assistant message, which is the definition of parallel invocation. This detection happens entirely in the graph layout layer without needing JSONL access.

**Why this matters:** Avoids expensive re-parsing of JSONL on client side, maintains clean separation of concerns (server parses once, client uses structured data).

**Alternative considered:** Pass parallel group metadata from server's session discovery. Rejected because it adds API surface area for something detectable from existing data structure.

---

**Decision 2: Extract expandSubagentInline helper to avoid duplication**

Both parallel and sequential branches need identical logic for:
- Tool group expansion with individual tool chaining
- Single tool/skill node creation
- Nested subagent handling (linear, no recursive fork-join)

Extracting to helper reduces ~200 lines of duplication and ensures both paths stay in sync.

**Why this matters:** Single source of truth for expansion logic. Bug fixes and enhancements apply to both rendering paths automatically.

**Alternative considered:** Keep duplicated code for "clarity". Rejected due to high maintenance burden and divergence risk.

---

**Decision 3: Preserve sequential chain pattern from Phase 10**

Phase 10 implemented sequential chaining via sequencer nodes to prevent dagre from placing all subagents at the same rank (parallel). That pattern is still correct for non-parallel subagents, so it's preserved in the SEQUENTIAL SUBAGENT path.

**Why this matters:** Users need to see temporal order for sequential Task invocations. Parallel visualization for sequential execution would be misleading.

**Alternative considered:** Convert everything back to fork-join and let dagre handle it. Rejected because dagre can't distinguish parallel from sequential without graph structure hints (sequencer nodes).

## How It Works

**Parallel Detection Flow:**
1. Scan session.nodes for SubagentNodes
2. Group by parentId (same parentId = same assistant message)
3. Groups with 2+ members are parallel, others are sequential
4. Build Set of parallel agentIds for O(1) lookup

**Rendering Flow:**
1. Iterate session.subagents in creation order (temporal flow)
2. Check if subagent.id in parallelAgentIds Set
3. If parallel: Find all siblings with same parentId, create group join node, fork from chainPoint, join at group node
4. If sequential: Chain from chainPoint, create sequencer if not last
5. Track processedSubagents to avoid double-processing
6. Connect final chainPoint to main join node

**Example:**
```
Session with 3 Tasks: A and B parallel, then C sequential

Before (Phase 10 - all sequential):
[Session] -> [A] -> seq -> [B] -> seq -> [C] -> join

After (Phase 11-02 - conditional):
              ┌─> [A] ─┐
[Session] -> fork       join-group-0 -> seq -> [C] -> join
              └─> [B] ─┘
```

## Testing Notes

**Manual testing required:**
1. Load session with parallel Task calls (multiple tool_use blocks in one assistant message)
   - Expected: Subagents fork from same point, render at same horizontal rank, converge at join
2. Load session with sequential Task calls (separate assistant messages)
   - Expected: Subagents chain sequentially via sequencer nodes (Phase 10 behavior)
3. Load session with mixed parallel and sequential Tasks
   - Expected: Parallel groups fork-join, sequential subagents chain, both integrate correctly
4. Test subagent expansion (click to toggle)
   - Expected: Inline tool calls render on branch for both parallel and sequential subagents
5. Test nested subagents (subagent within subagent)
   - Expected: Linear rendering, no recursive fork-join (existing pattern preserved)

**Regression checks:**
- Ensure single-subagent sessions still render correctly (not classified as parallel)
- Ensure subagent state colors (active/waiting/idle) still work
- Ensure tool group expansion within subagents still functional

## Implementation Notes

**Why not detect parallel at JSONL parsing time?**

Could add parallel group metadata during session discovery (server side), but it's unnecessary complexity. The parentId already encodes this information perfectly — same parentId means same assistant message means parallel invocation.

**Why track processedSubagents?**

When processing parallel groups, we iterate through all siblings at once (they're at the front of the parallelSiblings array). Without tracking, the outer loop would encounter them again and try to re-process.

**Why separate join nodes per parallel group?**

Sessions can have multiple parallel groups separated by sequential subagents. Each parallel group needs its own convergence point, then the sequential chain continues from there.

Example: Parallel group (A,B), sequential C, parallel group (D,E):
```
       ┌─> [A] ─┐
fork1          join1 -> seq -> [C] -> seq -> fork2 ┌─> [D] ─┐ join2
       └─> [B] ─┘                                    └─> [E] ─┘
```

**Why not use dagre's built-in ranking?**

Dagre automatically places nodes at the same rank if they have the same shortest path from the source. But it can't distinguish "these should be parallel" from "these happen to have the same path length". We need explicit graph structure (fork edges from same source, join edges to same target) to enforce parallel visualization.

## Self-Check: PASSED

**Files claimed to be modified:**
- ✅ client/src/utils/graphLayout.ts — VERIFIED (detectParallelSubagentGroups, expandSubagentInline, conditional logic added)
- ✅ client/src/components/DirectoryOverview.tsx — VERIFIED (SessionNodeData import, type assertion fix)

**Functionality claimed:**
- ✅ Parallel detection by parentId grouping — VERIFIED (lines 62-84)
- ✅ Fork-join rendering for parallel groups — VERIFIED (lines 490-558)
- ✅ Sequential chain preservation — VERIFIED (lines 563-618)
- ✅ Helper function extraction — VERIFIED (expandSubagentInline lines 91-224)
- ✅ Build succeeds with no TypeScript errors — VERIFIED (build output clean)

All claims verified against actual implementation. No discrepancies found.
