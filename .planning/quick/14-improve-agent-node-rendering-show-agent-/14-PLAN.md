---
phase: quick-14-improve-agent-node-rendering-show-agent-
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - "/home/botond/claude-session-dashboard/client/src/components/nodes/SubagentNode.tsx"
  - "/home/botond/claude-session-dashboard/client/src/utils/graphLayout.ts"
autonomous: true
must_haves:
  truths:
    - "Agent nodes display agent name with color circle (not 'task' text)"
    - "Actual task nodes display in grey fallback"
    - "Agent names are clearly visible and readable"
  artifacts:
    - path: "client/src/components/nodes/SubagentNode.tsx"
      provides: "Updated node rendering with agent name and color circle"
    - path: "client/src/utils/graphLayout.ts"
      provides: "Agent data setup with color assignment"
  key_links:
    - from: "graphLayout.ts (createSubagentNode)"
      to: "SubagentNode.tsx (rendering)"
      via: "data prop with agentId, agentType, agentColor"
    - from: "SubagentNode.tsx (display logic)"
      to: "UI rendering"
      via: "conditional rendering based on agentType"
---

<objective>
Improve agent node rendering to show agent name with color circle instead of generic 'task' text, while keeping grey fallback for actual task nodes.

Purpose: Make agent nodes more identifiable and visually distinct by showing their actual names with associated colors
Output: Updated SubagentNode component and graph layout utilities
</objective>

<context>
@/home/botond/claude-session-dashboard/client/src/components/nodes/SubagentNode.tsx
@/home/botond/claude-session-dashboard/client/src/utils/graphLayout.ts
@/home/botond/claude-session-dashboard/shared/src/index.ts

Current implementation shows:
- Line 228 in SubagentNode.tsx: `{data.agentId ? `${data.agentId}: ` : ''}{data.label}` with label = 'Task Agent' fallback
- Lines 385, 437 in graphLayout.ts: `label: subagent.summary || 'Task Agent'`
- agentColor field exists but not populated
</context>

<tasks>

<task type="auto">
  <name>Update SubagentNode rendering logic</name>
  <files>/home/botond/claude-session-dashboard/client/src/components/nodes/SubagentNode.tsx</files>
  <action>
    Modify the node header rendering (lines 219-248) to:
    1. Display agent name prominently: Use data.agentId if available, otherwise use data.agentType (not data.label)
    2. Show color circle: Render data.agentColor as a prominent circular indicator (12px diameter, not 8px)
    3. Add grey fallback for task agents: If agentType === 'Task' or similar, use grey color (#6b7280) and show "Task" text
    4. Keep status dot separate from agent color dot (status on right, agent color on left of title)

    Specifically change:
    - Line 228: Replace `{data.agentId ? `${data.agentId}: ` : ''}{data.label}` with display name logic
    - Lines 230-240: Make agent color more prominent (12px instead of 8px, better positioning)
    - Add conditional logic: if agentType === 'Task' → grey styling, else → use agentColor
  </action>
  <verify>
    Review updated SubagentNode.tsx to confirm:
    1. Agent name displays correctly (agentId or agentType)
    2. Color circle shows for named agents, grey for tasks
    3. Status dot remains separate
  </verify>
  <done>
    SubagentNode renders agent name with appropriate color circle, task nodes show grey fallback
  </done>
</task>

<task type="auto">
  <name>Update graph layout to provide agent data</name>
  <files>/home/botond/claude-session-dashboard/client/src/utils/graphLayout.ts</files>
  <action>
    Update subagent node creation (lines 380-448) to:
    1. Set proper label: Use subagent.agentId if available, otherwise subagent.agentType (remove 'Task Agent' fallback)
    2. Add agentColor: Generate consistent color from agentId or agentType using a hash function (e.g., simple string-to-color algorithm)
    3. Ensure agentId is passed: Add `agentId: parallelSubagent.id` or `agentId: subagent.id` to data object

    Color generation approach:
    - Create a simple hash function that converts string to HSL color
    - Named agents get distinct colors, tasks get grey (#6b7280)
    - Colors should be consistent across renders (same agent = same color)

    Change lines 385, 437 from:
    `label: parallelSubagent.summary || 'Task Agent'`
    to:
    `label: parallelSubagent.agentId || parallelSubagent.agentType`

    Add after line 392 (and line 444 for sequential):
    `agentId: parallelSubagent.agentId,`
    `agentColor: generateAgentColor(parallelSubagent.agentId || parallelSubagent.agentType, parallelSubagent.agentType),`
  </action>
  <verify>
    Review graphLayout.ts to confirm:
    1. Labels use agentId/agentType instead of 'Task Agent'
    2. agentColor is generated and passed to node data
    3. Agent data is properly structured
  </verify>
  <done>
    Graph layout creates nodes with proper agent names and colors for rendering
  </done>
</task>

</tasks>

<verification>
After implementation:
1. Open graph view and verify agent nodes show actual agent names with color circles
2. Check that task-type nodes display in grey fallback
3. Confirm color consistency across sessions (same agent = same color)
4. Verify status dots remain separate from agent color indicators
</verification>

<success_criteria>
- Agent nodes display names (e.g., "researcher", "planner") with colored circle
- Actual task nodes show grey styling and "Task" label
- Visual distinction between named agents and generic tasks
- Consistent color assignment per agent across the application
</success_criteria>

<output>
After completion, create `.planning/quick/14-improve-agent-node-rendering-show-agent-/14-SUMMARY.md`
</output>
