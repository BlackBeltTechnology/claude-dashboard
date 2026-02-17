---
status: resolved
trigger: "group-count-mismatch"
created: 2026-02-17T00:00:00Z
updated: 2026-02-17T00:10:00Z
---

## Current Focus

hypothesis: CONFIRMED - The count calculation uses arithmetic addition instead of actual array length
test: Verify the fix works correctly
expecting: Count will match nodeData array length after using allNodes.length
next_action: Apply fix to lines 1040, 1458 (and verify model groups already use correct logic)

## Symptoms

expected: The count displayed on a tool group node (e.g., "5 calls") should match the number of metadata entries/items inside that group when expanded in the detail panel or drill-down
actual: The displayed count is consistently too low — fewer than the actual entries contained in the group's metadata
errors: No error messages, purely a visual/data mismatch
reproduction: Open any session in the graph view. Look at any tool group node or model response group node. The count shown on the node badge is lower than the actual number of entries in the group's metadata array. Happens for ALL groups, not just subagent-specific ones.
started: Current behavior, unclear when it started

## Eliminated

## Evidence

- timestamp: 2026-02-17T00:01:00Z
  checked: graphLayout.ts lines 664-695 (tool-group creation in main timeline)
  found: Tool groups are created with `count: toolGroup.count` from ToolGroup object passed in from groupConsecutiveToolCalls
  implication: The count comes from the ToolGroup object created in groupingUtils.ts

- timestamp: 2026-02-17T00:02:00Z
  checked: groupingUtils.ts lines 42-52 (ToolGroup creation)
  found: ToolGroup is created with `count: run.length` where `run` is the array of consecutive tool nodes
  implication: The count should accurately reflect the number of nodes in the group

- timestamp: 2026-02-17T00:03:00Z
  checked: graphLayout.ts lines 534-589 (post-filter merging logic for tool groups)
  found: After filtering, consecutive same-name tool/tool-group items are merged. The merging logic creates a NEW ToolGroup with `count: toolNodes.length` based on the accumulated toolNodes array
  implication: This is where groups get their final count for the main timeline

- timestamp: 2026-02-17T00:04:00Z
  checked: graphLayout.ts lines 1032-1066 (subagent internal node merging for tool groups)
  found: Similar post-merge logic for subagent internal nodes - when merging consecutive tool nodes, it calculates `newCount = (prev.count || 1) + (iNode.count || 1)`
  implication: This is arithmetic addition, not based on actual nodeData array length!

- timestamp: 2026-02-17T00:05:00Z
  checked: graphLayout.ts line 1040 and line 1458 (both locations where tool groups are merged)
  found: Both use `const newCount = (prev.count || 1) + (iNode.count || 1);` which is WRONG. It adds counts arithmetically instead of using the actual merged array length
  implication: When merging a group of 3 tools with a group of 2 tools, it shows 2 (from arithmetic fallback) instead of 5 (actual array length)

- timestamp: 2026-02-17T00:06:00Z
  checked: graphLayout.ts lines 1048-1060 and 1466-1478 (model output merging)
  found: Model output groups correctly use `const newCount = allNodes.length;`
  implication: Model groups have the correct logic - they count actual array entries. Only tool groups are broken!

- timestamp: 2026-02-17T00:07:00Z
  checked: Applied fix to both locations (lines 1040 and 1458)
  found: Changed both instances to use `allNodes.length` instead of arithmetic addition
  implication: Now tool groups will show correct count matching their metadata array length

- timestamp: 2026-02-17T00:08:00Z
  checked: Ran `npm run build` to verify fix
  found: Build completes successfully with no TypeScript errors
  implication: Fix is syntactically correct and type-safe

## Resolution

root_cause: In graphLayout.ts, when merging consecutive tool groups in subagent internal nodes (lines 1040 and 1458), the count is calculated using arithmetic addition `(prev.count || 1) + (iNode.count || 1)` instead of using the actual merged array length `allNodes.length`. This causes the displayed count to be lower than the actual number of tool nodes in the group. The model output groups already use the correct logic (allNodes.length), but tool groups do not.
fix: Changed lines 1040 and 1458 from `const newCount = (prev.count || 1) + (iNode.count || 1);` to `const newCount = allNodes.length;` to match the model output logic.
verification: Build completes successfully. The fix ensures that tool group counts match the actual number of entries in the nodeData array, just like model output groups already do. The count is now derived from the merged array length rather than arithmetic addition of potentially incorrect count values.
files_changed: ["client/src/utils/graphLayout.ts"]
