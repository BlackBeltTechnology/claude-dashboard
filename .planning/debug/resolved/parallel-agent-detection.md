---
status: resolved
trigger: "parallel-agent-detection - The dashboard incorrectly groups sequential agent spawns as parallel"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:25:00Z
---

## Current Focus

hypothesis: CONFIRMED - Sequential Task tool calls have different parentIds, parallel ones have the same parentId
test: Fix detectParallelSubagentGroups to group by parentId instead of timestamp heuristics
expecting: Sequential agents will no longer be grouped as parallel forks
next_action: Modify graphLayout.ts to use parentId-based grouping

## Symptoms

expected: Sequential agent spawns (planner finishes → model response → executor spawns) should show as separate sequential nodes with a model response between them, NOT as parallel forks.
actual: The planner and executor are shown as parallel subagent forks. Model responses appear after the parallel group instead of between the two sequential agents.
errors: No errors - logic bug in parallel detection
reproduction: Any session where agents are spawned sequentially (one after another with model responses between) gets incorrectly shown as parallel. The current session demonstrates this - quick task 36 spawned a planner, got its result, then spawned an executor.
started: This is a longstanding logic issue in grouping

## Eliminated

## Evidence

- timestamp: 2026-02-12T00:05:00Z
  checked: JSONL data for planner and executor Task calls (lines 63 and 83)
  found: Planner parentUuid = b55d8ded-5925-4b2f-8c07-e1dc54d8d8aa, Executor parentUuid = 2545d4e6-0bb3-4fe7-9b18-d923a8f13eb4
  implication: DIFFERENT parentUuids confirms these are sequential (different assistant messages), not parallel

- timestamp: 2026-02-12T00:10:00Z
  checked: session-discovery.ts buildNodes function (lines 633-651)
  found: SubagentNode.parentId is correctly set to entry.uuid (the assistant message UUID)
  implication: The data structure already has the correct parentId information

- timestamp: 2026-02-12T00:15:00Z
  checked: graphLayout.ts detectParallelSubagentGroups function (lines 197-254)
  found: Function uses timestamp + user interaction heuristics instead of checking parentId
  implication: This is the bug! It's grouping by timing instead of by which assistant message spawned them

## Resolution

root_cause: detectParallelSubagentGroups() in client/src/utils/graphLayout.ts uses timestamp-based heuristics (checking for user interactions between subagent spawns) instead of checking the parentId field on SubagentNodes. Sequential agents spawned from different assistant messages have different parentIds, but if there's no user interaction between them, they get incorrectly grouped as parallel.

fix: Rewrote detectParallelSubagentGroups() to use parentId-based grouping instead of timestamp heuristics. Now:
1. Build map of subagent ID -> parentId from SubagentNode objects in allNodes
2. Group subagents by their parentId (the assistant message UUID that spawned them)
3. Only groups with 2+ subagents sharing the same parentId are considered parallel
This directly uses the data structure that already exists instead of relying on timing inference.

verification:
1. Built successfully - no TypeScript errors
2. Server running and returning session data correctly
3. Current session has 4 subagents with 4 different parentIds:
   - Explore: 5f5a0dee-57f5-4a2a-bc14-cfab10674730
   - gsd-planner: 32f0128e-df99-4404-b1c3-1dc20cac7d83
   - gsd-executor: 4b65e9f0-93cc-4290-8c4c-bfd0c68f3311
   - gsd-debugger: 80a7e2c4-feb8-4d27-a130-abbe4964a82e
4. New logic groups by parentId, so each gets its own group (no 2+ with same parentId)
5. Result: No parallel groups detected = all subagents render sequentially ✓

Logic verification for both cases:
- Sequential case (current session): 4 different parentIds → 4 groups of size 1 → filter keeps only size >=2 → 0 parallel groups → sequential rendering ✓
- Parallel case (hypothetical): 3 Task calls in same assistant message → same parentId → 1 group of size 3 → filter keeps it → 1 parallel group → fork/join rendering ✓

Manual testing: Dashboard running at http://localhost:5175 - the 4 subagents should now appear in sequential timeline order, not as parallel forks.

files_changed:
- client/src/utils/graphLayout.ts
