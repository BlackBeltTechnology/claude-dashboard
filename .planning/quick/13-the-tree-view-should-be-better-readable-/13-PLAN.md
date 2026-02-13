---
phase: 13-the-tree-view-should-be-better-readable
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: ["/home/botond/claude-session-dashboard/client/src/components/TreeView.tsx", "/home/botond/claude-session-dashboard/client/src/components/TreeNode.tsx"]
autonomous: true

must_haves:
  truths:
    - "User messages display with clear user icon and role"
    - "Assistant message tool calls are visually distinct from standalone tools"
    - "Tool calls show clear prefix to indicate they're part of the assistant message"
  artifacts:
    - path: "/home/botond/claude-session-dashboard/client/src/components/TreeNode.tsx"
      provides: "Message node rendering with role-based icons and improved labels"
    - path: "/home/botond/claude-session-dashboard/client/src/components/TreeView.tsx"
      provides: "Assistant message tool call rendering with clear visual distinction"
---

<objective>
Improve tree view readability by ensuring user messages display correctly and assistant message tool calls are visually distinct from standalone tools.

Purpose: Users need to clearly distinguish between user messages, assistant messages, and tool calls to understand the conversation flow better.

Output: Updated TreeView and TreeNode components with improved visual hierarchy and labeling.
</objective>

<execution_context>
@/home/botond/claude-session-dashboard/client/src/components/TreeView.tsx
@/home/botond/claude-session-dashboard/client/src/components/TreeNode.tsx

# Data structure context:
# MessageNode has: role ('user' | 'assistant'), content, toolUses?
# Assistant messages can have toolUses array showing tool calls
# These toolUses are currently rendered as separate tool children but without clear indication they're part of the assistant message
</execution_context>

<context>
@/home/botond/claude-session-dashboard/.planning/STATE.md

Current implementation issues:
1. User messages may not display role clearly - need to ensure role-based icon (👤) and proper labeling
2. Assistant message tool calls render as standalone tool nodes (🔧) without indication they're nested under the assistant message
3. No visual distinction between standalone tool nodes and tool calls that are part of assistant messages
</context>

<tasks>

<task type="auto">
  <name>Improve message node display and assistant tool call distinction</name>
  <files>/home/botond/claude-session-dashboard/client/src/components/TreeNode.tsx</files>
  <action>
    Update getNodeLabel function to:
    1. For message nodes, add clear role prefix: "User: " for user messages, "Assistant: " for assistant messages
    2. Ensure user messages display their content clearly after the role prefix
    3. Keep role-based icons (👤 for user, 🤖 for assistant)

    This ensures users can immediately identify message roles without relying only on icons.
  </action>
  <verify>
    Verify in TreeNode.tsx that message nodes show clear role prefixes in getNodeLabel function.
  </verify>
  <done>
    User messages show "User: " prefix and user icon, assistant messages show "Assistant: " prefix and assistant icon.
  </done>
</task>

<task type="auto">
  <name>Distinguish assistant message tool calls from standalone tools</name>
  <files>/home/botond/claude-session-dashboard/client/src/components/TreeView.tsx</files>
  <action>
    In TreeView.tsx renderNode function (lines 238-251), when rendering toolUses from assistant messages:
    1. Create a synthetic tool node with modified label that includes "Tool: " prefix (e.g., "Tool: Bash", "Tool: Read")
    2. Keep the same tool icon (🔧) to maintain consistency
    3. Ensure the parentId is set to the message ID so they remain nested under the assistant message

    This creates clear visual distinction: standalone tools show as "Tool: X" at root level, while assistant message tool calls show as nested children with "Tool: " prefix, making their association with the assistant message clear.
  </action>
  <verify>
    Verify in TreeView.tsx that assistant message toolUses are rendered with "Tool: " prefix in their labels.
  </verify>
  <done>
    Assistant message tool calls are visually distinct with "Tool: " prefix and clear nesting under the assistant message.
  </done>
</task>

</tasks>

<verification>
After changes:
1. User messages show with 👤 icon and "User: " prefix
2. Assistant messages show with 🤖 icon and "Assistant: " prefix
3. Assistant message tool calls show as nested children with 🔧 icon and "Tool: " prefix
4. Standalone tool nodes show as "Tool: X" at appropriate hierarchy levels
5. Visual hierarchy clearly shows the relationship between messages and their tool calls
</verification>

<success_criteria>
Users can easily distinguish:
- User messages (👤 + "User: " prefix)
- Assistant messages (🤖 + "Assistant: " prefix)
- Tool calls by assistant (🔧 + "Tool: " prefix, nested under assistant)
- Standalone tools (🔧 + "Tool: " prefix, at root level)
</success_criteria>

<output>
After completion, create `.planning/quick/13-the-tree-view-should-be-better-readable-/13-SUMMARY.md`
</output>
