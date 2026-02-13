---
phase: quick-26
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [server/src/session-discovery.ts]
autonomous: true

must_haves:
  truths:
    - "Sessions that start with /clear but have subsequent real user commands do NOT show CLR badge"
    - "Sessions that start with /clear and have NO subsequent user commands still show CLR badge"
    - "Sessions that never had /clear are unaffected"
  artifacts:
    - path: "server/src/session-discovery.ts"
      provides: "Corrected hasClearPrefix logic"
      contains: "hasClearPrefix.*false"
  key_links:
    - from: "server/src/session-discovery.ts"
      to: "client/src/components/nodes/SessionNode.tsx"
      via: "hasClearPrefix boolean on Session object"
      pattern: "hasClearPrefix"
---

<objective>
Fix the CLR badge to only appear on sessions where /clear was the only meaningful content.

Purpose: Sessions that start with /clear but then have real user commands after it incorrectly show the CLR badge and dashed border. The CLR indicator should only appear when the session has no subsequent non-/clear user commands.

Output: Updated session-discovery.ts with corrected hasClearPrefix logic.
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@server/src/session-discovery.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix hasClearPrefix to account for subsequent user commands</name>
  <files>server/src/session-discovery.ts</files>
  <action>
In the `parseSessionFile` function, after the block that determines `hasClearPrefix` (lines 690-699), add a single conditional to clear the flag when a real user command exists:

```typescript
// If there's a real user command after /clear, the session has meaningful content
// and shouldn't be marked as a clear-prefix-only session
if (hasClearPrefix && firstUserPrompt) {
  hasClearPrefix = false;
}
```

Insert this immediately after line 699 (the closing brace of the hasClearPrefix detection loop), before the `// Build nodes` comment on line 701.

The logic: `firstUserPrompt` is set (lines 664-674) only when a non-/clear user message exists. If `hasClearPrefix` is true AND `firstUserPrompt` is set, it means the session started with /clear but has real commands after it — so the CLR badge should not show.
  </action>
  <verify>
Run `npm run build` from the project root to confirm TypeScript compilation succeeds with no errors.

Manual verification: sessions that previously showed CLR despite having real commands after /clear should no longer show the badge. Sessions that are truly only /clear should still show it.
  </verify>
  <done>
hasClearPrefix is false when firstUserPrompt exists (meaning real commands follow /clear). CLR badge and dashed border only appear on sessions where /clear is the sole content. Build passes.
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes without errors
- The hasClearPrefix logic correctly distinguishes between clear-only and clear-then-commands sessions
</verification>

<success_criteria>
- Sessions starting with /clear that have subsequent real user commands: NO CLR badge, solid border
- Sessions starting with /clear with no subsequent commands: CLR badge, dashed border
- Sessions without /clear: unchanged behavior
- TypeScript build passes
</success_criteria>

<output>
After completion, create `.planning/quick/26-only-show-clr-badge-on-sessions-where-cl/26-SUMMARY.md`
</output>
