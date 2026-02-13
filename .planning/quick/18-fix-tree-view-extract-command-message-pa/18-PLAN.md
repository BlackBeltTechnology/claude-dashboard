---
phase: 18-fix-tree-view-extract-command-message-pa
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: ["/home/botond/claude-session-dashboard/client/src/components/TreeView.tsx"]
autonomous: true
user_setup: []
must_haves:
  truths:
    - "Tool calls display with single 'Tool: ' prefix"
    - "No redundant 'Tool: Tool: ' labels in tree view"
  artifacts:
    - path: "client/src/components/TreeView.tsx"
      provides: "Tool node creation logic"
      contains: "toolName: toolUse.name"
  key_links:
    - from: "client/src/components/TreeView.tsx"
      to: "client/src/components/TreeNode.tsx"
      via: "toolName property"
      pattern: "toolName.*toolUse\\.name"
---

<objective>
Fix tree view tool call display by removing redundant "Tool: " prefix from tool node creation

Purpose: Tool calls currently display as "Tool: Tool: Bash" due to prefix being added both when creating the tool node and when displaying it. Removing the redundant prefix from the creation step will fix the display.

Output: Tool nodes display cleanly as "Tool: Bash", "Tool: Read", etc.
</objective>

<execution_context>
@/home/botond/claude-session-dashboard/client/src/components/TreeView.tsx
@/home/botond/claude-session-dashboard/client/src/components/TreeNode.tsx
</execution_context>

<context>
@/home/botond/claude-session-dashboard/.planning/quick/17-fix-tree-view-completely-skip-empty-mess/17-SUMMARY.md

# Current Implementation Issue

In TreeView.tsx (line 276), when extracting tool calls from messages, the code creates tool nodes with:
```typescript
toolName: `Tool: ${toolUse.name}`,
```

Then in TreeNode.tsx (line 142), when displaying the tool node, it adds another prefix:
```typescript
case 'tool':
  return `Tool: ${node.toolName}`;
```

This results in double "Tool: " prefixes in the display.

# Fix Required

Remove the "Tool: " prefix from TreeView.tsx when creating tool nodes, keeping just the tool name (e.g., "Bash", "Read", "Write"). The TreeNode.tsx display logic will add the "Tool: " prefix for proper labeling.
</context>

<tasks>

<task type="auto">
  <name>Fix redundant Tool: prefix in TreeView.tsx</name>
  <files>/home/botond/claude-session-dashboard/client/src/components/TreeView.tsx</files>
  <action>
    In the renderNode function where tool nodes are created from message toolUses (around line 276), change:
    ```typescript
    toolName: `Tool: ${toolUse.name}`,
    ```
    to:
    ```typescript
    toolName: toolUse.name,
    ```

    This removes the redundant "Tool: " prefix from the toolName property. The TreeNode.tsx getNodeLabel function will still add "Tool: " prefix when displaying, resulting in clean labels like "Tool: Bash", "Tool: Read", etc.
  </action>
  <verify>
    Verify the change by checking that tool nodes are created with just the tool name (e.g., "Bash") as their toolName property, while the TreeNode display will add "Tool: " prefix for the label.
  </verify>
  <done>
    Tool nodes display correctly as "Tool: Bash", "Tool: Read", etc. without redundant prefixes
  </done>
</task>

</tasks>

<verification>
✓ TreeView.tsx line ~276 creates tool nodes with toolName = toolUse.name (no "Tool: " prefix)
✓ TreeNode.tsx line 142 still adds "Tool: " prefix for display
✓ Result: Tool nodes display as "Tool: Bash", "Tool: Read", "Tool: Write" etc.
</verification>

<success_criteria>
Tool calls in the tree view display with a single "Tool: " prefix followed by the tool name, not duplicated
</success_criteria>

<output>
After completion, create `.planning/quick/18-fix-tree-view-extract-command-message-pa/18-SUMMARY.md`
</output>
