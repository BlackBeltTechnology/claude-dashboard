---
phase: 44-ux-fixes
plan: 04
subsystem: graph-visualization
tags: [subagents, real-time-updates, tool-grouping, internal-nodes]
dependency_graph:
  requires: [graphLayout.ts, groupingUtils.ts]
  provides: [conditional-response-nodes, merged-tool-groups]
  affects: [SubagentBoxNode, expanded-subagent-workflow]
tech_stack:
  added: []
  patterns: [post-processing-merge, conditional-node-generation]
key_files:
  created: []
  modified:
    - client/src/utils/graphLayout.ts
decisions:
  - Conditional response node generation based on completion state and response text presence
  - Post-processing merge pass for consecutive same-type internal nodes
  - Response node visibility tied to hasResponse flag (completed state OR non-empty response text)
  - Tool and model output merging happens after grouping but before filtering
metrics:
  duration: 141s
  completed: 2026-02-17T13:43:07Z
  task_count: 2
  file_count: 1
---

# Phase 44 Plan 04: Fix Subagent Internal Node Response and Grouping Summary

**One-liner:** Conditional response node display based on completion state and real-time tool/model grouping via post-processing merge

## What Was Done

### Task 1: Fix subagent response node — only show when response exists

**Problem:** Response nodes were unconditionally added to subagent boxes, showing as placeholders even when subagents were still active without a response.

**Solution:** Added conditional response node generation:
- Compute `hasResponse = subagent.state === 'completed' || responseText.trim() !== ''`
- Only push response node to `internalNodes` if `hasResponse` is true
- Updated `lastNodeLabel` logic to show last tool when response is absent
- Updated `rfChildCount` calculation: `1 + (hasResponse ? 1 : 0)` instead of hardcoded `2`
- Applied conditional wrapping to expanded RF response node generation

**Applied to:**
- Parallel subagents (lines ~989-1000, ~1030-1047, ~1065-1068, ~1168-1186)
- Sequential subagents (lines ~1407-1419, ~1447-1460, ~1447-1450, ~1548-1566)

**Result:** Active subagents no longer show premature "Response" nodes. Completed subagents only show response nodes when they have actual response content.

### Task 2: Fix subagent tool grouping — merge into last group when matching

**Problem:** When new tool calls arrived in real-time, or when model outputs appeared between same-type tool calls, consecutive matching tools/models were not being merged into single groups within subagent boxes.

**Solution:** Added post-processing merge pass after building internal nodes from grouped timeline:
- Iterate through `internalNodes` array
- For consecutive tool nodes with matching `toolName`, merge into previous node:
  - Combine `nodeData` arrays
  - Update count: `(prev.count || 1) + (iNode.count || 1)`
  - Update label: `${prev.toolName} (${newCount})`
  - Merge hooks arrays
- For consecutive model nodes, merge similarly:
  - Combine `nodeData` arrays
  - Update count to total model nodes
  - Update label: `Model Output (${newCount})`
  - Concatenate content for filtering
- Replace `internalNodes` with merged result

**Applied to:**
- Parallel subagents (after line ~987, before response node)
- Sequential subagents (after line ~1404, before response node)

**Result:** Real-time tool call updates merge into existing last group if tool name matches. Consecutive model outputs within subagents are grouped. Subagent internal nodes accurately reflect grouped workflow state.

## Files Modified

### client/src/utils/graphLayout.ts

**Parallel subagents section:**
- Added post-processing merge pass (lines ~988-1025)
- Added conditional response node generation with `hasResponse` flag (lines ~1027-1037)
- Updated `lastNodeLabel` logic to use `hasResponse` (lines ~1067-1078)
- Updated `rfChildCount` calculation (line ~1102)
- Wrapped expanded RF response node in `hasResponse` conditional (lines ~1205-1222)

**Sequential subagents section:**
- Added post-processing merge pass (lines ~1406-1443)
- Added conditional response node generation with `hasResponse` flag (lines ~1445-1457)
- Updated `lastNodeLabel` logic to use `hasResponse` (lines ~1486-1497)
- Updated `rfChildCount` calculation (line ~1484)
- Wrapped expanded RF response node in `hasResponse` conditional (lines ~1585-1602)

**Total changes:**
- ~90 lines added (merge pass logic + conditional response node wrapping)
- 4 sections modified per subagent type (internal node push, lastNodeLabel, rfChildCount, RF node generation)
- No breaking changes — all modifications are additive safeguards

## Verification Results

- `npm run build` passes with no TypeScript errors ✓
- Build output: 572.93 kB (gzip: 172.14 kB) ✓
- All type signatures preserved ✓

## Deviations from Plan

None — plan executed exactly as written.

## Testing Notes

To verify the fix works:

1. **Conditional response node:** Start a subagent task and monitor it in real-time. The subagent box should NOT show a "Response" node while active, only showing "Request" and tool nodes. Once completed, the "Response" node should appear.

2. **Tool grouping:** Use a Task agent that calls the same tool multiple times (e.g., Read). All consecutive Read calls should be merged into a single "Read (N)" group within the subagent box, even if they arrive one at a time via WebSocket updates.

3. **Model output grouping:** If a subagent produces multiple consecutive model outputs (assistant messages), they should be merged into "Model Output (N)" instead of appearing as separate nodes.

## Impact

**User-facing:**
- Cleaner subagent visualization during active execution (no premature response node)
- More accurate real-time tool grouping within subagent workflows
- Consistent collapsed/expanded state representation

**Technical:**
- Post-processing merge ensures consistency regardless of WebSocket update timing
- Conditional node generation reduces UI noise
- Better alignment between internal nodes array and RF child nodes

## Next Steps

None — this was a bug fix with no follow-up required.

## Self-Check: PASSED

- FOUND: 44-04-SUMMARY.md
- FOUND: client/src/utils/graphLayout.ts
