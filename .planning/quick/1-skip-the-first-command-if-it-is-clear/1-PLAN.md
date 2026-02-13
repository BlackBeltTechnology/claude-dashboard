---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - server/src/session-discovery.ts
autonomous: true
must_haves:
  truths:
    - "Sessions whose first user message is /clear show the second meaningful prompt as their title"
    - "Sessions whose first user message is not /clear continue to work as before"
    - "Both raw /clear text and XML-wrapped clear commands are skipped"
  artifacts:
    - path: "server/src/session-discovery.ts"
      provides: "firstUserPrompt extraction logic that skips /clear in all formats"
      contains: "isSkippableCommand"
  key_links:
    - from: "server/src/session-discovery.ts"
      to: "shared/src/index.ts"
      via: "Session.firstUserPrompt field"
      pattern: "firstUserPrompt"
---

<objective>
Fix session title derivation to skip /clear commands in all formats.

Purpose: When a user starts a session with /clear, the session title currently shows "clear" instead of the first meaningful prompt. The raw content check (`content.startsWith('/clear')`) only catches direct text, but /clear commands can also arrive as XML-wrapped `<command-name>clear</command-name>`, which `extractReadablePrompt` returns as `"clear"`.

Output: Updated firstUserPrompt extraction that skips /clear regardless of encoding format.
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@server/src/session-discovery.ts
@shared/src/index.ts
@client/src/utils/sessionName.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Skip /clear commands in all formats during firstUserPrompt extraction</name>
  <files>server/src/session-discovery.ts</files>
  <action>
Refactor the firstUserPrompt extraction loop (lines ~438-451 in session-discovery.ts) to check the **extracted** prompt for skippable slash commands, not just the raw content.

Current approach checks `content.startsWith('/clear')` on raw content, which misses XML-wrapped `/clear` commands (e.g., `<command-name>clear</command-name>` returns `"clear"` from `extractReadablePrompt`).

Fix strategy -- move the skip check AFTER extraction:

1. Add a helper function `isSkippableCommand(prompt: string): boolean` that returns true if the extracted prompt is a clear command. Check for:
   - Exact match `"clear"` (from XML `<command-name>clear</command-name>`)
   - Exact match `"/clear"` (from raw text or `<command-message>clear</command-message>`)
   - Starts with `"/clear "` (e.g., `/clear some-arg`)
   - Starts with `"clear "` (edge case)
   Use case-insensitive comparison.

2. Update the firstUserPrompt loop to:
   - Remove the `content.startsWith('/clear')` raw check
   - Call `extractReadablePrompt(content)` first
   - If result is truthy, check `isSkippableCommand(extracted)` -- if true, `continue`
   - Otherwise, set `firstUserPrompt = extracted` and `break`

This ensures /clear is skipped regardless of whether it arrives as raw text or XML-encoded.
  </action>
  <verify>
Run `npm run build` from the project root to confirm TypeScript compilation succeeds with no errors.

Manually verify the logic by reading the updated code: the loop should extract the prompt first, then check if it's a skippable command before accepting it.
  </verify>
  <done>
The firstUserPrompt extraction skips /clear commands in both raw text format (`/clear...`) and XML-wrapped format (`<command-name>clear</command-name>`), falling through to the next user message to find a meaningful session title.
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes with no errors
- The `isSkippableCommand` helper correctly identifies "clear", "/clear", and variations
- The loop processes extraction before skip-checking, ensuring XML-wrapped commands are caught
</verification>

<success_criteria>
Sessions that start with a /clear command (in any encoding) derive their title from the next meaningful user prompt instead of showing "clear".
</success_criteria>

<output>
After completion, create `.planning/quick/1-skip-the-first-command-if-it-is-clear/1-SUMMARY.md`
</output>
