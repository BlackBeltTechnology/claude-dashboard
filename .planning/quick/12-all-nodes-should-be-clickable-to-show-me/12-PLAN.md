---
phase: 12-all-nodes-should-be-clickable-to-show-me
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: [client/src/components/GraphView.tsx, client/src/components/DirectoryOverview.tsx]
autonomous: true
must_haves:
  truths:
    - "All node types in GraphView are clickable and show metadata"
    - "All node types in DirectoryOverview are clickable and show metadata"
  artifacts:
    - path: "client/src/components/GraphView.tsx"
      contains: "onNodeClick handler for tool nodes"
      min_lines: 220
    - path: "client/src/components/DirectoryOverview.tsx"
      contains: "onNodeClick handler for directory nodes"
      min_lines: 96
  key_links:
    - from: "GraphView onNodeClick"
      to: "setSelectedNodeData"
      via: "findToolNodeInSessions"
      pattern: "tool.*setSelectedNodeData"
    - from: "DirectoryOverview handleNodeClick"
      to: "setSelectedNodeData"
      via: "directory node data"
      pattern: "directory.*setSelectedNodeData"
---

<objective>
Make all node types clickable to show metadata in both GraphView and DirectoryOverview

Purpose: Currently only session, subagent, and skill nodes are clickable. Tool nodes and directory nodes don't respond to clicks. Users should be able to click any node to inspect its metadata in the detail panel.
Output: Updated GraphView.tsx and DirectoryOverview.tsx with complete click handlers for all node types
</objective>

<execution_context>
@/home/botond/claude-session-dashboard/client/src/components/GraphView.tsx
@/home/botond/claude-session-dashboard/client/src/components/DirectoryOverview.tsx
@/home/botond/claude-session-dashboard/client/src/components/NodeDetail.tsx
</execution_context>

<context>
# Current Implementation Status

## GraphView.tsx (client/src/components/GraphView.tsx)
- Line 160-227: onNodeClick handler
- Handled node types: session (line 162), subagent (line 170), skill (line 218)
- Missing: tool nodes, tool-group nodes, directory nodes

## DirectoryOverview.tsx (client/src/components/DirectoryOverview.tsx)
- Line 88-96: handleNodeClick
- Handled node types: session (line 89)
- Missing: directory nodes

## NodeDetail Component
- Already supports rendering metadata for all node types (session, subagent, skill, tool)
- Tool nodes: renders tool name, input JSON, and output (line 521-552)
- Directory nodes: not yet implemented in NodeDetail

## Helper Functions Available
- findToolNodeInSessions (line 110-132 in GraphView.tsx): finds tool nodes by React Flow node ID
- findAnyNodeInSessions (line 135-157 in GraphView.tsx): finds any node type by React Flow node ID
</context>

<tasks>

<task type="auto">
  <name>Add tool node click handler to GraphView</name>
  <files>client/src/components/GraphView.tsx</files>
  <action>
    In the onNodeClick handler (around line 223), add a new condition for 'tool' node type:
    - Use findToolNodeInSessions(node.id) to get the tool node data
    - Call setSelectedNodeData with the found tool node
    - Pattern: Follow the existing pattern from skill nodes (line 218-222)

    Add this code after the skill node handler (before the closing bracket around line 223):
    ```typescript
    } else if (node.type === 'tool') {
      const foundNode = findToolNodeInSessions(node.id);
      if (foundNode) {
        setSelectedNodeData(foundNode.toolNode);
      }
    }
    ```

    Note: Tool-group nodes are intentionally not handled per existing comment on line 224 ("tool-group nodes are for visualization only").
  </action>
  <verify>Verify GraphView.tsx compiles without errors and tool nodes are now clickable</verify>
  <done>Tool nodes show metadata panel when clicked in GraphView</done>
</task>

<task type="auto">
  <name>Add directory node click handler to DirectoryOverview</name>
  <files>client/src/components/DirectoryOverview.tsx</files>
  <action>
    In the handleNodeClick function (around line 96), add a new condition for 'directory' node type:
    - Extract directory data from node.data (contains label, sessionCount, cwd)
    - Call setSelectedNodeData with a simple directory info object
    - Pattern: Follow the existing pattern from session nodes (line 89-94)

    Add this code after the session node handler (before the closing bracket around line 96):
    ```typescript
    } else if (node.type === 'directory') {
      // Directory nodes show directory metadata
      const data = node.data;
      const directoryInfo = {
        id: data.cwd || data.label,
        type: 'directory',
        label: data.label,
        sessionCount: data.sessionCount,
        cwd: data.cwd,
      };
      setSelectedNodeData(directoryInfo);
    }
    ```

    Note: The NodeDetail component doesn't currently handle directory nodes, so we pass a simple info object that the detail panel can display.
  </action>
  <verify>Verify DirectoryOverview.tsx compiles without errors and directory nodes are now clickable</verify>
  <done>Directory nodes show metadata when clicked in DirectoryOverview</done>
</task>

<task type="auto">
  <name>Add directory node rendering support to NodeDetail</name>
  <files>client/src/components/NodeDetail.tsx</files>
  <action>
    Add a new case in the renderNodeContent function (around line 284) to handle directory nodes:

    Add this code before the default case:
    ```typescript
    case 'directory':
      return renderDirectoryContent(node);
    ```

    Then add a new renderDirectoryContent function (after renderToolContent around line 553):
    ```typescript
    function renderDirectoryContent(node: any): React.ReactNode {
      return (
        <>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Directory Info</div>
            <div style={styles.infoGrid}>
              <span style={styles.infoLabel}>Directory:</span>
              <span style={styles.infoValue}>{node.label}</span>

              <span style={styles.infoLabel}>Working Directory:</span>
              <span style={styles.infoValue}>{node.cwd}</span>

              <span style={styles.infoLabel}>Session Count:</span>
              <span style={styles.infoValue}>{node.sessionCount}</span>
            </div>
          </div>
        </>
      );
    }
    ```

    Also add directory icon to NODE_ICONS map (around line 139):
    ```typescript
    directory: '📁',
    ```
  </action>
  <verify>Verify NodeDetail.tsx compiles without errors</verify>
  <done>Directory nodes display properly formatted metadata in the detail panel</done>
</task>

</tasks>

<verification>
Test all node types are clickable:
1. GraphView: Click session, subagent, skill, and tool nodes - all should open metadata panel
2. DirectoryOverview: Click directory and session nodes - all should open metadata panel
3. Verify metadata panel displays appropriate information for each node type
</verification>

<success_criteria>
- All node types respond to clicks in both GraphView and DirectoryOverview
- Clicking any node opens the metadata detail panel
- Each node type displays its specific metadata correctly
</success_criteria>

<output>
After completion, create `.planning/quick/12-all-nodes-should-be-clickable-to-show-me/12-SUMMARY.md`
</output>
