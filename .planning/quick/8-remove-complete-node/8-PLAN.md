---
phase: 8-remove-complete-node
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: ["/home/botond/claude-session-dashboard/client/src/utils/graphLayout.ts"]
autonomous: true
must_haves:
  truths:
    - "Complete nodes no longer appear in the graph view"
    - "Subagent start nodes connect directly to next items in timeline"
    - "Visual flow remains clear without redundant completion markers"
  artifacts:
    - path: "/home/botond/claude-session-dashboard/client/src/utils/graphLayout.ts"
      provides: "Updated graph layout without complete nodes"
      contains: "Removed stop node creation for subagents"
  key_links:
    - from: "SubagentNode component"
    - to: "Graph layout"
    - via: "Node rendering"
    pattern: "variant: 'stop'"
---

<objective>
Remove the "Complete" nodes from the graph view that mark subagent execution boundaries.

Purpose: Simplify the visual timeline by removing redundant completion markers
Output: Updated graph layout with direct connections between timeline items
</objective>

<execution_context>
@/home/botond/claude-session-dashboard/client/src/utils/graphLayout.ts
</execution_context>

<tasks>

<task type="auto">
  <name>Remove Complete nodes from graph layout</name>
  <files>/home/botond/claude-session-dashboard/client/src/utils/graphLayout.ts</files>
  <action>
    Modify the convertSessionToGraph function to remove the creation of "Complete" (stop) nodes for subagents:

    1. For PARALLEL subagents (lines 287-357): Remove the STOP node creation and the edge connecting start->stop. Instead, connect the start node directly to the groupJoinNode.

    2. For SEQUENTIAL subagents (lines 364-428): Remove the STOP node creation and the edge connecting start->stop. Instead, connect the start node to the next item in the chain (next timeline item or final chainPoint).

    3. Update the chainPoint to point to the start node instead of the stop node.

    Maintain all other functionality including tool call summaries embedded in start nodes.
  </action>
  <verify>
    grep for "Complete" in graphLayout.ts returns no results (0 matches)
  </verify>
  <done>
    Subagent nodes display with start markers only; complete markers removed from both parallel and sequential subagent flows
  </done>
</task>

</tasks>

<verification>
No "Complete" nodes rendered in graph view; subagent execution flow simplified with direct connections
</verification>

<success_criteria>
Complete nodes removed from both parallel and sequential subagent rendering; visual timeline cleaner and less cluttered
</success_criteria>

<output>
After completion, create `.planning/quick/8-remove-complete-node/8-SUMMARY.md`
</output>
