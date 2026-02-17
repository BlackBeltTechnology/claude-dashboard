---
status: verifying
trigger: "follow-end-subagent-tree-click"
created: 2026-02-17T00:00:00Z
updated: 2026-02-17T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - Race condition where interval callback completes after followPipelineEnd is disabled
test: Build and manually test clicking subagent nodes in tree view while follow-end is active
expecting: Navigation stays on clicked subagent node, does not jump to end
next_action: Build the client and test the fix

## Symptoms

expected: Clicking a subagent node in the tree view should disable follow-end and navigate to that subagent in the graph without jumping back to the last node
actual: Follow-end appears to toggle off visually but the graph still jumps to the last node. Works correctly for non-subagent nodes.
errors: No error messages
reproduction: Click on a subagent node in the tree view while follow-end is active. The toggle visually changes but behavior persists - graph jumps to last node.
started: Current behavior, user reports it sometimes works for regular nodes but fails for subagent nodes

## Eliminated

## Evidence

- timestamp: 2026-02-17T00:01:00Z
  checked: TreeView.tsx selectNode callback (lines 317-359)
  found: setFollowPipelineEnd(false) is called FIRST at line 319, then different logic paths for regular nodes, nodes inside subagents, and subagent sessions (detected by short ID length)
  implication: The disable call happens early, so if follow-end still activates, something later must be re-enabling it or triggering auto-scroll

- timestamp: 2026-02-17T00:02:00Z
  checked: TreeView.tsx subagent session handling (lines 347-356)
  found: For subagent sessions (short IDs < 20 chars), it creates a graphNodeId with "-box" suffix and calls setFocusedNode(graphNodeId). For non-subagent nodes it also calls setFocusedNode but without box logic.
  implication: Both code paths set focusedNode, so if one works and the other doesn't, the difference might be in how GraphView responds to focusedNodeId changes with "-box" nodes vs regular nodes

- timestamp: 2026-02-17T00:03:00Z
  checked: GraphView.tsx GraphFocusHandler component (lines 112-391)
  found: Two separate useEffects - one for focusedNodeId (lines 305-317) that calls fitView, and one for followPipelineEnd (lines 337-388) that runs a polling interval to jump to end. The focusedNodeId effect has dependencies [focusedNodeId, fitView], the followPipelineEnd effect has dependencies [followPipelineEnd, getEndTargetNodeId, focusNodeById].
  implication: CRITICAL - When TreeView calls setFollowPipelineEnd(false) and setFocusedNode(id) in sequence, BOTH effects will trigger in the same render cycle. The followPipelineEnd effect might capture the OLD (true) state value due to stale closure, causing it to jump to end despite the state being updated to false.

- timestamp: 2026-02-17T00:04:00Z
  checked: followPipelineEnd useEffect cleanup and interval behavior
  found: The useEffect at line 338 sets up an interval (line 350) that runs every 650ms. When followPipelineEnd changes to false, the cleanup function (lines 384-387) calls clearInterval. HOWEVER, clearInterval only prevents FUTURE callbacks - if a callback is currently executing in the call stack, it will complete.
  implication: ROOT CAUSE CANDIDATE - If user clicks right when the interval callback is executing (at line 350-382), the callback will complete and call focusNodeById to jump to end, EVEN THOUGH the cleanup is running and follow-end is being disabled. This creates a race where manual navigation (100ms delay) can be overridden by the interval callback completing (0-650ms window).

## Resolution

root_cause: The followPipelineEnd useEffect (GraphView.tsx lines 337-388) sets up a polling interval that runs every 650ms. When user clicks a tree node to navigate, TreeView calls setFollowPipelineEnd(false) which triggers the effect's cleanup to clearInterval. However, if the interval callback is CURRENTLY EXECUTING when clearInterval is called, the callback completes and calls focusNodeById to jump to end. This happens AFTER the focusedNodeId useEffect's 100ms delayed navigation, overriding the user's intended navigation. The race condition is more noticeable with subagent nodes because the timing of when users click coincides with interval execution.

fix: Added followPipelineEndRef to track the latest state value synchronously. The ref is updated at the start of the useEffect (line 341) and checked at the start of the interval callback (line 356). This ensures that even if the interval callback is mid-execution when followPipelineEnd is disabled, it will check the ref and return early instead of executing the jump-to-end navigation.

verification:
- Build completed successfully (npm run build)
- Manual testing required:
  1. Start server and client: npm run dev
  2. Open dashboard in browser
  3. Select a session with subagents
  4. Enable "Follow End" toggle
  5. Click on a subagent node in the tree view
  6. Expected: Toggle visually turns off, graph navigates to clicked subagent node and STAYS there
  7. Actual result: [To be tested by user]

files_changed: [client/src/components/GraphView.tsx]
