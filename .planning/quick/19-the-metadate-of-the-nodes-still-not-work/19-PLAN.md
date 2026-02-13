---
phase: quick-19-node-metadata
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /home/botond/claude-session-dashboard/client/src/components/GraphView.tsx
autonomous: true
must_haves:
  truths:
    - "Clicking any node in GraphView shows metadata panel"
    - "Tool nodes display their tool name, input, and output"
    - "Subagent nodes show agent info and summary"
    - "Skill nodes display skill details"
  artifacts:
    - path: "/home/botond/claude-session-dashboard/client/src/components/GraphView.tsx"
      provides: "Fixed node click handlers for all node types"
      min_lines: 230
---

<objective>
Fix GraphView node metadata display - make it work exactly like TreeView
</objective>

<execution_context>
The issue: Tool nodes in graphLayout.ts are rendered as type 'tool-group' but GraphView click handler only checks for type 'tool'. This mismatch prevents tool metadata from showing.

Current behavior:
- TreeView: Clicking nodes shows metadata ✓
- GraphView: Clicking nodes does NOT show metadata ✗

Expected behavior:
- GraphView: Clicking nodes shows metadata EXACTLY like TreeView ✓
</execution_context>

<tasks>

<task type="auto">
  <name>Fix GraphView node click handlers for all node types</name>
  <files>/home/botond/claude-session-dashboard/client/src/components/GraphView.tsx</files>
  <action>
    Update the onNodeClick handler to handle all React Flow node types correctly:

    1. Tool nodes (lines 223-227): Currently only checks node.type === 'tool'. ADD handling for node.type === 'tool-group' (single tool nodes are rendered as this type in graphLayout.ts line 336). Both should call setSelectedNodeData with the found tool node.

    2. Verify subagent handling (lines 170-217): Ensure it correctly extracts node data. Currently uses complex subagentSessionId extraction which may fail.

    3. Verify skill handling (lines 218-222): Currently calls findAnyNodeInSessions which should work if node IDs match.

    4. Verify session handling (lines 162-169): Currently calls setSelectedNodeData with the session which should work.

    Key insight from graphLayout.ts:
    - Line 275: Skill nodes use createNodeId(session.id, node.id)
    - Line 304: Tool-group nodes use createNodeId(session.id, toolGroup.id)
    - Line 336: Single tool nodes use createNodeId(session.id, toolNode.id) but have type 'tool-group'
    - Lines 406, 464: Subagent nodes use createNodeId(session.id, subagent.id-start)

    The lookup helpers findAnyNodeInSessions and findToolNodeInSessions already use createNodeId, so they should work. The issue is the type check mismatch for tool nodes.
  </action>
  <verify>Manual verification: Click various node types in GraphView (tool, skill, subagent, session) and confirm metadata panel opens showing the same information as TreeView</verify>
  <done>All GraphView node types show metadata panel when clicked, matching TreeView behavior</done>
</task>

</tasks>

<verification>
1. Open GraphView
2. Click a tool node → metadata panel should open showing tool name, input, output
3. Click a skill node → metadata panel should open showing skill details
4. Click a subagent node → metadata panel should open showing agent info
5. Click a session node → metadata panel should open showing session details
6. Verify metadata matches what TreeView shows for the same nodes
</verification>

<success_criteria>
GraphView node clicks show metadata panel EXACTLY like TreeView - "EXACTLY THE SAME" as user requested
</success_criteria>

<output>
After completion, create `.planning/quick/19-the-metadate-of-the-nodes-still-not-work/19-SUMMARY.md`
</output>
