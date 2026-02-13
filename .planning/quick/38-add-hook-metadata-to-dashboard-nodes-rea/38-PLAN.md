---
phase: 38-add-hook-metadata-to-dashboard-nodes-rea
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - shared/src/index.ts
  - server/src/jsonl-parser.ts
  - server/src/session-discovery.ts
  - client/src/components/NodeDetail.tsx
  - client/src/components/nodes/ToolNode.tsx
  - client/src/components/nodes/SubagentNode.tsx
  - client/src/components/nodes/SkillNode.tsx
  - client/src/components/nodes/UserPromptNode.tsx
autonomous: true

must_haves:
  truths:
    - "Hook progress entries are parsed from JSONL files"
    - "Hook metadata appears as badges on node components"
    - "Hook details are visible in NodeDetail panel"
  artifacts:
    - path: "shared/src/index.ts"
      provides: "HookInfo interface and hooks field on node types"
      exports: ["HookInfo"]
    - path: "server/src/jsonl-parser.ts"
      provides: "Hook progress parsing in parseLine function"
      contains: "hookEvent"
    - path: "server/src/session-discovery.ts"
      provides: "Hook-to-node correlation via toolUseID"
      contains: "Map<string, HookInfo[]>"
    - path: "client/src/components/NodeDetail.tsx"
      provides: "Hooks section in detail panel"
      contains: "Hooks ("
  key_links:
    - from: "server/src/jsonl-parser.ts"
      to: "progress entries with hookEvent"
      via: "parseLine filters progress entries"
      pattern: "data\\.type === ['\"]hook_progress['\"]"
    - from: "server/src/session-discovery.ts"
      to: "toolUseID matching"
      via: "correlate hook_progress.toolUseID to tool_use.id"
      pattern: "toolUseID.*hook"
    - from: "client/src/components/nodes/ToolNode.tsx"
      to: "hook badge display"
      via: "hooks count badge with icon"
      pattern: "hooks.*length"
---

<objective>
Add hook execution metadata to dashboard nodes by parsing hook_progress entries from JSONL, correlating them to tool calls via toolUseID, and displaying hook count badges on nodes with detailed hook information in the metadata panel.

Purpose: Enable users to see which hooks fired during tool execution for debugging and understanding Claude Code's automation workflow.

Output:
- Hook badges on tool/subagent/skill nodes showing hook count
- Hooks section in NodeDetail panel showing event, name, command, timestamp per hook
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@shared/src/index.ts
@server/src/jsonl-parser.ts
@server/src/session-discovery.ts
@client/src/components/NodeDetail.tsx
@client/src/components/nodes/ToolNode.tsx
@client/src/components/nodes/SubagentNode.tsx
@client/src/components/nodes/SkillNode.tsx
@client/src/components/nodes/UserPromptNode.tsx

Research findings show:
- Hook progress entries exist in JSONL with data.type === "hook_progress"
- RawProgressData interface ALREADY has hookEvent, hookName, command fields
- Hook entries link to tools via toolUseID field (matches tool_use block id)
- Real examples: PostToolUse:Glob, PreToolUse:Task, SessionStart:startup
</context>

<tasks>

<task type="auto">
  <name>Parse hook progress entries and correlate to nodes</name>
  <files>
    shared/src/index.ts
    server/src/jsonl-parser.ts
    server/src/session-discovery.ts
  </files>
  <action>
    **In shared/src/index.ts:**
    - Add HookInfo interface with fields: event (string), hookName (string), command (string), timestamp (number)
    - Add `hooks?: HookInfo[]` field to: ToolNode, SubagentNode, SkillNode, UserPromptNode interfaces

    **In server/src/jsonl-parser.ts:**
    - In parseLine(), add handling for progress entries where data.type === "hook_progress"
    - Parse RawProgressData fields (hookEvent, hookName, command are already in interface)
    - Extract toolUseID from progress entry (links hook to tool)
    - Return new parsed type: HookProgressEntry with { toolUseId, event, hookName, command, timestamp }
    - Update ParsedEntry type to include hooks: HookInfo[] field
    - Note: RawProgressData already has hookEvent, hookName, command - use them directly

    **In server/src/session-discovery.ts:**
    - In buildNodes(), build Map<string, HookInfo[]> from hook progress entries
    - Key by toolUseID, value is array of hooks that fired for that tool
    - When creating ToolNode/SubagentNode/SkillNode/UserPromptNode, check map for matching toolUseID
    - Attach hooks array to node if hooks exist for that tool
    - Hook progress entries have toolUseID field matching tool_use block id field

    Edge cases:
    - Skip progress entries without hookEvent/hookName (malformed data)
    - Handle multiple hooks per tool (array accumulation)
    - Session-level hooks (SessionStart, SessionEnd) have parentToolUseID as session UUID - attach to session node, NOT individual tools
  </action>
  <verify>
    Run `npm run build` from root - no TypeScript errors
    Check server logs when dashboard loads - hook progress entries should be parsed
    Inspect session data in browser console - nodes should have hooks arrays
  </verify>
  <done>
    - HookInfo interface exists in shared/src/index.ts
    - Hook progress entries are parsed in jsonl-parser.ts
    - Hooks are attached to tool/subagent/skill nodes in session-discovery.ts
    - TypeScript compilation succeeds
  </done>
</task>

<task type="auto">
  <name>Add hook count badges to node components</name>
  <files>
    client/src/components/nodes/ToolNode.tsx
    client/src/components/nodes/SubagentNode.tsx
    client/src/components/nodes/SkillNode.tsx
    client/src/components/nodes/UserPromptNode.tsx
  </files>
  <action>
    For each node component (ToolNode, SubagentNode, SkillNode, UserPromptNode):
    - Add hooks count badge ONLY if data.hooks exists and data.hooks.length > 0
    - Badge design: small icon (⚙️ gear or 🪝 hook) + count number, positioned near tool name/label
    - Badge styling: subtle background (#374151), small font (9px), rounded corners
    - Place badge on same line as tool name/agent type label
    - Badge should be inline, not overlapping with status dot or other UI elements

    Implementation:
    - Check `data.hooks?.length` to determine if badge should show
    - Add conditional render: `{data.hooks && data.hooks.length > 0 && <span style={hookBadgeStyle}>⚙️ {data.hooks.length}</span>}`
    - Style to match existing badge patterns (outputBadge in ToolNode.tsx is good reference)
    - Position inline with toolName or agentType label (flex gap handles spacing)

    Do NOT add badges to:
    - MessageNode (hooks don't apply to messages)
    - DirectoryNode (not a tool execution)
    - SessionNode (session-level hooks are edge case, skip for now)

    Color coding: Use neutral gray for hook badges (not state-dependent) - hooks are informational, not status indicators.
  </action>
  <verify>
    Run `npm run dev` from client directory
    Open dashboard, navigate to a session with tool calls
    Visual check: nodes with hooks show small badge with count (e.g., "⚙️ 2")
    Nodes without hooks show no badge (no empty badges)
  </verify>
  <done>
    - Hook badges appear on nodes with hooks
    - Badge shows correct count matching hooks array length
    - Badge styling is consistent and non-intrusive
    - No badges on nodes without hooks
  </done>
</task>

<task type="auto">
  <name>Add Hooks section to NodeDetail panel</name>
  <files>
    client/src/components/NodeDetail.tsx
  </files>
  <action>
    Add Hooks section to renderToolContent, renderSubagentContent, renderSkillContent, renderUserPromptContent functions:

    - Check if node has `hooks` array and `hooks.length > 0`
    - If yes, render new section titled "Hooks ({count})"
    - For each hook, display:
      - Event type (hookEvent) - e.g., "PreToolUse", "PostToolUse"
      - Hook name (hookName) - e.g., "PreToolUse:Task"
      - Command/handler (command) - e.g., "python3 ..." or "callback"
      - Timestamp (formatted as localeTimeString)
    - Use existing styles.section + styles.infoGrid pattern
    - Order hooks chronologically by timestamp
    - Place section BEFORE "Metadata" section (after tool-specific content)

    Styling:
    - Reuse existing styles.section for outer container
    - Use styles.infoGrid for label-value pairs
    - Hook event as label (bold, grey), hook name + command as value
    - Timestamp in smaller font below each hook
    - If command is "callback", show in italics (indicates internal hook)

    Edge case: Session-level hooks (SessionStart, SessionEnd) would appear on session node, but skip for this task (not in scope for tool/subagent/skill/prompt rendering).
  </action>
  <verify>
    Open dashboard, click on a node with hooks
    NodeDetail panel shows "Hooks (N)" section
    Each hook displays event, name, command, timestamp
    Hooks are sorted by timestamp (oldest first)
    Section only appears when hooks exist (conditional render)
  </verify>
  <done>
    - Hooks section appears in NodeDetail for nodes with hooks
    - Each hook shows complete information (event, name, command, timestamp)
    - Section does not appear for nodes without hooks
    - Formatting is consistent with existing detail panel sections
  </done>
</task>

</tasks>

<verification>
**Build verification:**
- `npm run build` from root succeeds with no errors
- Server starts without errors parsing JSONL files

**Functional verification:**
- Open dashboard in browser
- Navigate to a session with tool calls
- Nodes with hooks show badge with count
- Click on node with hooks
- NodeDetail panel shows Hooks section with event, name, command, timestamp per hook

**Data integrity:**
- Hook progress entries are parsed from JSONL (check server logs)
- Hooks are correlated to correct tools via toolUseID (check browser console session data)
- Hook count in badge matches hooks array length
- Hook details in panel match JSONL data (event/name/command/timestamp)
</verification>

<success_criteria>
**Observable behaviors:**
- Users can see hook count badges on nodes that executed hooks
- Users can click nodes and view detailed hook information in metadata panel
- Hook metadata includes event type, hook name, command, and timestamp
- Badge count accurately reflects number of hooks that fired

**Measurable outcomes:**
- All 4 modified node components display hook badges when hooks exist
- NodeDetail panel renders Hooks section for nodes with hooks
- TypeScript compilation succeeds with no errors
- No runtime errors in browser console
</success_criteria>

<output>
After completion, create `.planning/quick/38-add-hook-metadata-to-dashboard-nodes-rea/38-SUMMARY.md` documenting:
- Hook parsing implementation in server
- Hook correlation via toolUseID
- Badge design and placement on node components
- Hooks section structure in NodeDetail panel
- Example hook data flow from JSONL → server → client → UI
</output>
