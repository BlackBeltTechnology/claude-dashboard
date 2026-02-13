---
phase: 20-fix-metadata-display-for-group-tool-call
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/components/GraphView.tsx
autonomous: true

must_haves:
  truths:
    - "Tool-group nodes display metadata when clicked (showing all tool calls in the group)"
    - "Subagent nodes display metadata when clicked (showing request/response/tool calls)"
  artifacts:
    - path: "client/src/components/GraphView.tsx"
      contains: "findToolGroupInSessions helper function"
      provides: "Finds ToolGroup data for metadata display"
  key_links:
    - from: "GraphView.tsx onNodeClick handler"
      to: "ToolGroup metadata display"
      via: "findToolGroupInSessions function"
---

<objective>
Fix metadata display for tool-group nodes and subagent nodes in the graph view. Currently only works for single tool calls.
</objective>

<context>
From STATE.md: Quick task 19 fixed tool node metadata display, but tool-group nodes and subagent nodes still don't show metadata when clicked.

The issue: GraphView.tsx uses findToolNodeInSessions for tool-group clicks, but this only finds individual tool nodes (type === 'tool'), not tool-group nodes (type === 'tool-group'). ToolGroup is a separate data structure containing an array of ToolNode objects.

Current state: ToolNode.tsx shows metadata when clicked ✓, ToolGroupNode.tsx doesn't show metadata ✗, SubagentNode.tsx needs verification.
</context>

<tasks>

<task type="auto">
  <name>Fix tool-group node metadata display</name>
  <files>client/src/components/GraphView.tsx</files>
  <action>
    1. Create a new helper function findToolGroupInSessions that searches for ToolGroup data by React Flow node ID
       - The function should recursively search through sessions and subagents
       - It should look for ToolGroup objects (which exist in the display data but aren't in the session.nodes array)
       - Note: ToolGroups are created in graphLayout.ts via groupConsecutiveToolCalls and aren't stored in the session data structure itself

    2. Since ToolGroups are computed dynamically and not stored in session data, we need a different approach:
       - Store ToolGroup data in the React Flow node data itself when creating nodes in graphLayout
       - Or: Pass the computed ToolGroups from graphLayout to the click handler
       - Best approach: Extract the ToolGroup data from the node.data or create a synthetic ToolGroup object with the group info

    3. Update the onNodeClick handler for tool-group nodes (line 223-227) to use findToolGroupInSessions
    4. Ensure the selectedNodeData is set with the ToolGroup object (which contains the array of tool nodes)
  </action>
  <verify>
    Test by:
    1. Start the development server: cd client && npm run dev
    2. Open the app and create a session with multiple tool calls of the same type (e.g., multiple Bash commands)
    3. In graph view, click on a tool-group node (shows "Bash (3)" with count)
    4. Verify the metadata panel opens showing all tool calls in the group
    5. Click on various tool-group nodes to confirm all work
  </verify>
  <done>
    Tool-group nodes successfully display metadata panel showing all tool calls within the group when clicked
  </done>
</task>

<task type="auto">
  <name>Verify subagent node metadata display</name>
  <files>client/src/components/GraphView.tsx</files>
  <action>
    Review and test the existing subagent node click handler logic (lines 170-217):
    1. Check if it correctly finds subagent nodes by agentId
    2. Verify it merges session summary data
    3. Ensure setSelectedNodeData is called with the merged data
    4. Fix any edge cases or bugs found during testing
  </action>
  <verify>
    Test by:
    1. Create or use an existing session with a subagent
    2. In graph view, click on a subagent node (purple node with agent info)
    3. Verify the metadata panel opens showing agent details, request prompt, response summary, and tool calls
    4. Test both start and stop variants of subagent nodes
  </verify>
  <done>
    Subagent nodes successfully display comprehensive metadata (agent info, request, response, tool calls) when clicked
  </done>
</task>

</tasks>

<verification>
1. All node types in the graph view (session, tool, tool-group, subagent, skill) can be clicked to display metadata
2. Tool-group nodes show all tool calls within the group
3. Subagent nodes show agent details, prompt, summary, and tool calls
4. Metadata panel displays the same detailed information as the tree view
</verification>

<success_criteria>
- Tool-group node clicks open metadata panel with group information
- Subagent node clicks open metadata panel with agent information
- No console errors when clicking nodes
- Metadata display matches tree view functionality
</success_criteria>

<output>
After completion, create .planning/quick/20-fix-metadata-display-for-group-tool-call/20-SUMMARY.md
</output>
