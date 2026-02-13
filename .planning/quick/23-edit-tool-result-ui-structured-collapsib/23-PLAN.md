---
phase: 23-edit-tool-result-ui-structured-collapsib
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /home/botond/claude-session-dashboard/client/src/utils/toolFormatters.tsx
autonomous: true

must_haves:
  truths:
    - "Edit tool shows collapsible boxes for old_string and new_string"
    - "Old text and new text are visually distinguished"
    - "Content is readable without needing to parse JSON"
  artifacts:
    - path: /home/botond/claude-session-dashboard/client/src/utils/toolFormatters.tsx
      provides: "Enhanced Edit tool formatter with diff boxes"
      min_lines: 50
---

<objective>
Enhance the Edit tool result UI to show structured collapsible boxes for old/new text diffs instead of raw JSON. This makes it easy for users to see what changed in a file edit operation.

Purpose: Improve readability of Edit tool results by displaying old/new text in clear, collapsible sections.
Output: Updated `renderEditInput` function with collapsible diff boxes
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/home/botond/claude-session-dashboard/client/src/utils/toolFormatters.tsx
</context>

<tasks>

<task type="auto">
  <name>Enhance Edit tool formatter with collapsible diff boxes</name>
  <files>/home/botond/claude-session-dashboard/client/src/utils/toolFormatters.tsx</files>
  <action>
Update the `renderEditInput` function to parse Edit tool input and display old_string and new_string in collapsible boxes:

1. Extract `file_path`, `old_string`, and `new_string` from the input
2. Create a collapsible section for "Old Text" with red-tinted background (#7f1d1d bg, #fca5a5 text)
3. Create a collapsible section for "New Text" with green-tinted background (#14532d bg, #86efac text)
4. Show file path as a styled header
5. Use truncateString to limit display to 500 chars with truncation indicator
6. Keep the expandable behavior with collapse/expand toggle

Reference existing CollapsibleJson pattern in NodeDetail.tsx for toggle styling.
  </action>
  <verify>
Build passes: `cd /home/botond/claude-session-dashboard/client && npm run build` completes without errors
  </verify>
  <done>
Edit tool results display old_text in red-collapsible box and new_text in green-collapsible box with file path header. Both sections are collapsible and show truncation indicator for content > 500 chars.
  </done>
</task>

</tasks>

<verification>
- Build succeeds without TypeScript errors
- Edit tool formatter shows two collapsible sections for diff content
- Old text section uses red theme, new text section uses green theme
</verification>

<success_criteria>
- Edit tool input shows structured collapsible boxes for old/new text diffs
- Visual distinction between old (red) and new (green) content
- File path prominently displayed
- Both sections expandable/collapsible
</success_criteria>

<output>
After completion, create `.planning/quick/23-edit-tool-result-ui-structured-collapsib/23-01-SUMMARY.md`
</output>
