---
phase: 17-fix-tree-view-completely-skip-empty-mess
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: ["/home/botond/claude-session-dashboard/client/src/components/TreeNode.tsx", "/home/botond/claude-session-dashboard/client/src/components/TreeView.tsx"]
autonomous: true
user_setup: []
must_haves:
  truths:
    - "Message nodes show content without 'User:' or 'Assistant:' prefixes"
    - "Empty messages (null, empty, or whitespace-only) are completely skipped"
    - "Tool calls are rendered as separate sibling nodes, not nested under assistant messages"
  artifacts:
    - path: "/home/botond/claude-session-dashboard/client/src/components/TreeNode.tsx"
      provides: "Message label rendering without role prefixes"
      min_lines: 145
  key_links:
    - from: "TreeNode.getNodeLabel"
      to: "MessageNode.content"
      via: "direct display without prefix"
      pattern: "content\\.slice\\(|rolePrefix"
    - from: "TreeView.processedNodes"
      to: "MessageNode.toolUses"
      via: "extraction and separate node creation"
      pattern: "toolUses.*forEach"
---

<objective>
Fix tree view rendering issues by removing role prefixes from messages, ensuring empty messages are skipped, and verifying tool calls are separate nodes.

Purpose: Improve tree view readability and usability by removing confusing prefixes and ensuring proper node hierarchy.
Output: Clean tree view with properly structured nodes.
</objective>

<execution_context>
@/home/botond/claude-session-dashboard/client/src/components/TreeView.tsx
@/home/botond/claude-session-dashboard/client/src/components/TreeNode.tsx
@/home/botond/claude-session-dashboard/.planning/STATE.md
</execution_context>

<context>
Previous quick task 15 attempted to fix similar issues. This task ensures complete fix with proper verification.

Key decisions from project:
- Tool calls should be separate nodes, not nested (Phase 1-04, Quick-3)
- Empty messages should be filtered out (Quick-15)
- Tree view should be clean and readable
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove role prefixes from message nodes</name>
  <files>/home/botond/claude-session-dashboard/client/src/components/TreeNode.tsx</files>
  <action>Remove the role prefix from message nodes in the getNodeLabel function (lines 133-138). Change from:
```typescript
const rolePrefix = node.role === 'user' ? 'User: ' : 'Assistant: ';
const content = node.content.length > 50
  ? node.content.slice(0, 50) + '...'
  : node.content || `${node.role} message`;
return rolePrefix + content;
```
To:
```typescript
const content = node.content.length > 50
  ? node.content.slice(0, 50) + '...'
  : node.content || '(empty message)';
return content;
```
This removes the confusing "User:" and "Assistant:" prefixes while preserving the content truncation logic.</action>
  <verify>Verify message nodes display content directly without prefixes by checking TreeNode.tsx renders correctly</verify>
  <done>Message nodes show clean content without role prefixes</done>
</task>

<task type="auto">
  <name>Task 2: Verify and strengthen empty message filtering</name>
  <files>/home/botond/claude-session-dashboard/client/src/components/TreeView.tsx</files>
  <action>Ensure the isEmptyContent function (lines 73-75) properly filters out all empty messages. Verify the filter logic at lines 254-258 correctly skips messages with empty content. Ensure tool extraction still works properly for messages with both content and toolUses. The existing logic should already handle this, but verify it's working correctly:
- isEmptyContent checks for null, undefined, or whitespace-only content
- Messages with toolUses but empty content are still skipped entirely (not processed)
- Messages with both content and toolUses are processed correctly with tools extracted as separate nodes</action>
  <verify>Check that sessions with empty messages don't show those nodes in the tree view</verify>
  <done>Empty messages are completely filtered out from tree view</done>
</task>

<task type="auto">
  <name>Task 3: Verify tool calls render as separate nodes</name>
  <files>/home/botond/claude-session-dashboard/client/src/components/TreeView.tsx</files>
  <action>Verify the tool extraction logic (lines 260-281) properly creates separate tool nodes. Confirm that:
1. Message nodes have toolUses removed (set to undefined) before being added to processedNodes
2. Each toolUse is converted to a separate Tool node with type: 'tool' and toolName: 'Tool: {name}'
3. Tool nodes are added to processedNodes as siblings to the message node
4. The groupConsecutiveToolCalls function groups related tool calls appropriately

The existing code should already handle this correctly, but verify the logic ensures tools are never nested under messages in the rendered tree.</action>
  <verify>Check that tool calls appear as separate nodes at the same level as messages, not nested under them</verify>
  <done>Tool calls render as separate sibling nodes, not nested under assistant messages</done>
</task>

</tasks>

<verification>
1. Message nodes display content directly without "User:" or "Assistant:" prefixes
2. Sessions with empty messages show clean tree view without those nodes
3. Tool calls appear as separate nodes at the same level as messages
4. Tree view hierarchy is clean and readable
</verification>

<success_criteria>
- Message nodes show clean content labels without role prefixes
- Empty messages are completely filtered from tree view
- Tool calls render as separate nodes, not nested under messages
- Tree view is clean and readable
</success_criteria>

<output>
After completion, create `.planning/quick/17-fix-tree-view-completely-skip-empty-mess/17-SUMMARY.md`
</output>
