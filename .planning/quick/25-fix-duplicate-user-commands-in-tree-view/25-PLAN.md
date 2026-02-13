---
phase: quick-25
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/components/TreeView.tsx
autonomous: true

must_haves:
  truths:
    - "Each user message appears exactly once in the tree view (no duplicates)"
    - "User prompts display with speech bubble icon (user-prompt node) not person icon (message node)"
    - "Clear markers display with scissors icon (clear-marker node) not person icon (message node)"
    - "Assistant messages still appear normally in the tree view"
    - "Tool calls and subagents still render correctly in the tree view"
  artifacts:
    - path: "client/src/components/TreeView.tsx"
      provides: "Deduplicated tree view rendering"
      contains: "filter.*user-prompt\\|clear-marker\\|message.*role.*user"
  key_links:
    - from: "client/src/components/TreeView.tsx"
      to: "session.nodes"
      via: "processedNodes filtering"
      pattern: "type.*user-prompt|clear-marker"
---

<objective>
Fix duplicate user messages in tree view by filtering out redundant MessageNode entries for user messages.

Purpose: The `buildNodes` function in `session-discovery.ts` creates BOTH a `MessageNode` (type: 'message', role: 'user') AND a `UserPromptNode` (type: 'user-prompt') or `ClearMarkerNode` (type: 'clear-marker') for each user message. The tree view renders all of them, causing every user message to appear twice. The fix filters out user-role MessageNodes in the tree view since UserPromptNode and ClearMarkerNode already represent those messages with better formatting.

Output: TreeView.tsx with deduplication logic
</objective>

<execution_context>
@.planning/quick/25-fix-duplicate-user-commands-in-tree-view/25-PLAN.md
</execution_context>

<context>
@client/src/components/TreeView.tsx
@server/src/session-discovery.ts (buildNodes function, lines 465-629 - creates both MessageNode AND UserPromptNode/ClearMarkerNode for each user entry)
@shared/src/index.ts (type definitions: MessageNode has role field, UserPromptNode and ClearMarkerNode are separate types)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Filter out user-role MessageNodes from tree view session children</name>
  <files>client/src/components/TreeView.tsx</files>
  <action>
In the `renderNode` function, inside the session children processing block (the `else` branch starting around line 234 that handles Session nodes), modify the `node.nodes.forEach` loop (lines 241-279) to skip MessageNodes that have a corresponding UserPromptNode or ClearMarkerNode.

The simplest and most correct approach: filter out ALL MessageNode entries with `role === 'user'` from session children processing. The rationale:
- Every user message with extractable content already has a UserPromptNode or ClearMarkerNode created for it in buildNodes
- User MessageNodes with empty content are already filtered out by the `isEmptyContent` check at line 247
- The only user MessageNodes that would remain are ones with content but no corresponding user-prompt/clear-marker -- but buildNodes creates one for every user entry that has content and extractReadablePrompt returns a value
- Even if a user MessageNode has no corresponding user-prompt node (edge case where extractReadablePrompt returns undefined), it would display as a raw XML-heavy message which is not useful anyway

Specific change in the `node.nodes.forEach` callback (line 241):
1. At the top of the callback, before the existing `if ('type' in childNode && childNode.type === 'message')` check, add a filter:
   - If `childNode` has `type === 'message'` AND `role === 'user'`, skip it (`return` early from the forEach callback)
   - This effectively removes ALL user-role messages from tree rendering, letting UserPromptNode and ClearMarkerNode be the sole representation

This is safe because:
- Assistant-role MessageNodes are still rendered (they show the assistant's response text)
- Tool/skill/subagent nodes are not MessageNodes, so they pass through
- UserPromptNode and ClearMarkerNode are not MessageNodes, so they pass through
- The existing empty-content filter at line 247 becomes redundant for user messages but can stay for clarity

Do NOT modify session-discovery.ts or any server code. The fix is purely client-side tree view filtering.
  </action>
  <verify>
Run `npm run build` from the project root. Verify no TypeScript errors.
Then manually inspect the tree view in the browser: expand a session and confirm each user message appears exactly once (with speech bubble icon for prompts, scissors icon for /clear), not twice.
  </verify>
  <done>
Each user message in the tree view appears exactly once. User prompts show with the user-prompt node formatting (speech bubble icon). Clear commands show with clear-marker formatting (scissors icon). No duplicate person-icon entries for user messages. Assistant messages, tool calls, and subagents are unaffected.
  </done>
</task>

</tasks>

<verification>
- `npm run build` succeeds with no errors
- Tree view shows each user message once (via UserPromptNode or ClearMarkerNode)
- Tree view shows assistant messages once (via MessageNode with role 'assistant')
- Tool groups, subagents, and skills still render correctly
- Subagent session children (the special code path for `node.id.length < 20`) still work correctly -- the synthetic request/response MessageNodes created at lines 320-349 have `id` values like `${node.id}-request` and `${node.id}-response`, which are NOT from `session.nodes`, so they are unaffected
</verification>

<success_criteria>
- No duplicate entries in the tree view for any user message
- Build passes cleanly
- All other tree view functionality preserved
</success_criteria>

<output>
After completion, verify the fix works by expanding a session in the tree view and confirming single entries per user message.
</output>
