---
phase: quick-36
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/utils/toolFormatters.tsx
autonomous: true
must_haves:
  truths:
    - "Every tool call in the graph shows formatted, readable fields instead of raw JSON"
    - "WebFetch shows URL and prompt as distinct labeled fields"
    - "WebSearch shows query with domain lists"
    - "Task* tools show their parameters with clear labels"
    - "NotebookEdit shows file path, cell info, and edit mode"
    - "No-param tools (TaskList, EnterPlanMode) show a descriptive label instead of empty JSON"
  artifacts:
    - path: "client/src/utils/toolFormatters.tsx"
      provides: "Render functions for all 11 remaining tool types"
      contains: "renderWebFetchInput|renderWebSearchInput|renderTaskCreateInput"
  key_links:
    - from: "ToolDetailFormatter switch"
      to: "render*Input functions"
      via: "case statements for each tool name"
      pattern: "case 'WebFetch'|case 'WebSearch'|case 'TaskCreate'"
---

<objective>
Add formatted field renderers for all 11 remaining tool types so that no tool call falls through to the raw JSON default renderer.

Purpose: Users clicking any tool node in the graph should see clean, labeled fields rather than a raw JSON dump.
Output: Updated toolFormatters.tsx with complete coverage of all known tool types.
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@client/src/utils/toolFormatters.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add render functions for all 11 remaining tool types</name>
  <files>client/src/utils/toolFormatters.tsx</files>
  <action>
Add 11 new render functions BEFORE renderDefaultInput(), following the exact same pattern as existing renderers (extract typed fields, render with styles.label / styles.filePath / styles.inlineCode / styles.codeBlock / styles.description / styles.metaText). Then add corresponding cases to the switch in ToolDetailFormatter.

Specific renderers to add:

1. **renderWebFetchInput(input)** - Extract `url` (string) and `prompt` (string).
   - Show url with styles.filePath (reuse the amber monospace style - URLs are path-like).
   - Show prompt below with styles.label "Prompt" + styles.description for the text.

2. **renderWebSearchInput(input)** - Extract `query` (string), `allowed_domains` (string[]), `blocked_domains` (string[]).
   - Show query with styles.inlineCode.
   - If allowed_domains array exists and non-empty, show label "Allowed Domains" + each domain as a comma-separated list in styles.metaText.
   - If blocked_domains array exists and non-empty, show label "Blocked Domains" + each domain comma-separated in styles.metaText.

3. **renderTaskCreateInput(input)** - Extract `subject` (string), `description` (string).
   - Show subject with styles.inlineCode (bold label "Subject").
   - Show description with styles.codeBlock if present (truncate to 500 chars).
   - Ignore activeForm/metadata (internal plumbing, not useful to display).

4. **renderTaskUpdateInput(input)** - Extract `taskId` (string), `status` (string), `subject` (string), `description` (string).
   - Show taskId with label "Task ID" + styles.inlineCode.
   - Show status with label "Status" + styles.inlineCode, color-code: "completed" green (#10b981), "cancelled" red (#ef4444), otherwise default purple.
   - Show subject if present with label "Subject" + styles.inlineCode.
   - Show description if present with styles.codeBlock (truncate to 500 chars).
   - Ignore addBlocks/addBlockedBy/activeForm/owner (internal plumbing).

5. **renderTaskGetInput(input)** - Extract `taskId` (string).
   - Show taskId with label "Task ID" + styles.inlineCode.
   - Single field, keep it simple.

6. **renderTaskListInput(_input)** - No meaningful params.
   - Return a div with styles.description showing "List all tasks".

7. **renderTaskOutputInput(input)** - Extract `task_id` (string), `timeout` (number).
   - Show task_id with label "Task ID" + styles.inlineCode.
   - Show timeout if present with styles.metaText showing "Timeout: {timeout}ms".

8. **renderTaskStopInput(input)** - Extract `task_id` (string).
   - Show task_id with label "Task ID" + styles.inlineCode.

9. **renderNotebookEditInput(input)** - Extract `notebook_path` (string), `cell_id` (string), `cell_type` (string), `edit_mode` (string), `new_source` (string).
   - Show notebook_path with styles.filePath.
   - Show cell_id with label "Cell" + styles.inlineCode.
   - Show cell_type if present with label "Type" + styles.inlineCode.
   - Show edit_mode with label "Mode" + styles.inlineCode.
   - Show new_source if present with styles.codeBlock (truncate to 500 chars).

10. **renderEnterPlanModeInput(_input)** - No meaningful params.
    - Return a div with styles.description showing "Entering plan mode".

11. **renderExitPlanModeInput(input)** - Extract `pushToRemote` (boolean).
    - Show styles.description "Exiting plan mode".
    - If pushToRemote is true, show styles.metaText "Push to remote: yes".

After adding all render functions, update the switch statement in ToolDetailFormatter to add cases:
- 'WebFetch' -> renderWebFetchInput
- 'WebSearch' -> renderWebSearchInput
- 'Task' -> renderTaskCreateInput (the "Task" tool name is used for TaskCreate)
- 'TaskCreate' -> renderTaskCreateInput (alias)
- 'TaskUpdate' -> renderTaskUpdateInput
- 'TaskGet' -> renderTaskGetInput
- 'TaskList' -> renderTaskListInput
- 'TaskOutput' -> renderTaskOutputInput
- 'TaskStop' -> renderTaskStopInput
- 'NotebookEdit' -> renderNotebookEditInput
- 'EnterPlanMode' -> renderEnterPlanModeInput
- 'ExitPlanMode' -> renderExitPlanModeInput

Keep the default case for any truly unknown tools.
  </action>
  <verify>
Run `npm run build` from project root. Build must succeed with no TypeScript errors.
Visually confirm: open the app, find any session with WebFetch/Task/other tool calls, click the node, and verify fields render with labels instead of raw JSON.
  </verify>
  <done>
All 11 tool types have dedicated render functions. The switch statement covers every known tool name. No tool call that matches a known name falls through to renderDefaultInput(). Build passes cleanly.
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes with zero errors
- Grep for "renderDefaultInput" in the switch: only the `default:` case should call it
- Count switch cases: should be 7 (existing) + 12 (new, including Task alias) = 19 total cases + default
</verification>

<success_criteria>
Every known Claude Code tool type has a formatted renderer showing labeled fields. Raw JSON fallback only applies to genuinely unknown tool names.
</success_criteria>

<output>
After completion, create `.planning/quick/36-format-all-tool-call-json-schemas-into-r/36-SUMMARY.md`
</output>
