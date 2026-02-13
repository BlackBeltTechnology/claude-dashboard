---
phase: 7-the-agent-nodes-should-have-the-agent-na
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
must_haves:
  truths:
    - "Agent nodes display agent name and color"
    - "Complete/stop node variant is removed"
    - "Request and response appear in node metadata"
    - "Directory button is removed from view toggle"
    - "View toggle shows 'Sessions!' instead of 'Directory'"
  artifacts:
    - path: "client/src/components/nodes/SubagentNode.tsx"
      provides: "Agent node component with name, color, and metadata"
    - path: "client/src/components/ViewToggle.tsx"
      provides: "View toggle with Directory button removed, Sessions! label"
---

<objective>
Enhance agent nodes to display agent name and color, remove complete node, add request/response to metadata, remove Directory button, and rename to Sessions!
</objective>

<execution_context>
@/home/botond/claude-session-dashboard/.planning/STATE.md
</execution_context>

<context>
Current SubagentNode has two variants (start/stop) and displays prompt/summary. ViewToggle has a "Directory" button that needs removal and renaming.
</context>

<tasks>

<task type="auto">
  <name>Update SubagentNode with agent name and color, remove stop variant</name>
  <files>client/src/components/nodes/SubagentNode.tsx</files>
  <action>
    1. Add agentId and agentColor to SubagentNodeData interface
    2. Add color indicator dot next to agent name in node header
    3. Remove the 'stop' variant completely (lines 202-246) - only keep start variant
    4. Update node styles to be more compact without stop variant
    5. Ensure request (prompt) and response (summary) are visible in the node display
  </action>
  <verify>SubagentNode renders with agent name, color dot, and request/response visible. Stop variant removed.</verify>
  <done>Agent nodes show agent name with color indicator, single variant only, request and response displayed</done>
</task>

<task type="auto">
  <name>Remove Directory button and rename to Sessions!</name>
  <files>client/src/components/ViewToggle.tsx</files>
  <action>
    1. Remove the Directory button (lines 57-66) from ViewToggle
    2. Keep only Tree and Graph view buttons
    3. Ensure the DirectoryOverview component and functionality remain accessible via other means if needed
  </action>
  <verify>ViewToggle shows only Tree and Graph buttons. Directory button removed.</verify>
  <done>View toggle has only Tree and Graph buttons, Directory button removed</done>
</task>

</tasks>

<verification>
Agent nodes display agent name with color, stop variant removed, request/response shown, Directory button removed from ViewToggle
</verification>

<success_criteria>
- Agent nodes show agent name with color indicator
- Complete/stop node variant removed
- Request and response visible in node display
- Directory button removed from ViewToggle
- Clean, focused node display without unnecessary variants
</success_criteria>

<output>
After completion, create `.planning/quick/7-the-agent-nodes-should-have-the-agent-na/7-SUMMARY.md`
</output>
