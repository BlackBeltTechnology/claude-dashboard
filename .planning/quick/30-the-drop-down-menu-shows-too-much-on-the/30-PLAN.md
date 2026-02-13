---
phase: quick-30
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/components/Toolbar.tsx
autonomous: true
must_haves:
  truths:
    - "Session switcher dropdown options are compact and readable"
    - "Each dropdown option is truncated to ~30 characters max"
    - "User can still identify and switch between sessions in same directory"
  artifacts:
    - path: "client/src/components/Toolbar.tsx"
      provides: "Truncated session titles in dropdown"
      contains: "slice.*30"
  key_links:
    - from: "client/src/components/Toolbar.tsx"
      to: "getSessionTitle"
      via: "truncation applied after getSessionTitle call"
      pattern: "getSessionTitle.*slice|truncate"
---

<objective>
Truncate session titles in the session switcher dropdown so they don't overwhelm the compact toolbar.

Purpose: The in-session toolbar dropdown currently shows full session titles (up to 60 chars from getSessionTitle). In a crowded toolbar with back button, title, tree toggle, expand/collapse, jump-to-end, and settings, these long dropdown entries make the select element too wide. Truncating to ~30 chars keeps the dropdown compact.

Output: Modified Toolbar.tsx with shorter dropdown option text.
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@client/src/components/Toolbar.tsx
@client/src/utils/sessionName.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Truncate session switcher dropdown options and add max-width constraint</name>
  <files>client/src/components/Toolbar.tsx</files>
  <action>
In the session switcher `<select>` element (around line 249-262), truncate the displayed session title to 30 characters max. Create a local helper function at the top of the session timeline view section (or inline):

```typescript
const truncateTitle = (title: string, max = 30) =>
  title.length > max ? title.slice(0, max) + '...' : title;
```

Update the `<option>` elements to use `truncateTitle(getSessionTitle(s))` instead of raw `getSessionTitle(s)`.

Also add a `maxWidth: '200px'` to the `sessionSwitcher` style object so the `<select>` element itself is constrained even if content somehow exceeds expectations. This ensures the toolbar layout stays tight.

Do NOT modify `getSessionTitle` itself in sessionName.ts -- the full 60-char title is still appropriate for the main session title display (`<h2 style={styles.sessionTitle}>`). The truncation is only for dropdown options.
  </action>
  <verify>
Run `npm run build` from root to confirm no TypeScript errors. Visually inspect that the dropdown option text generation uses truncation.
  </verify>
  <done>
Session switcher dropdown options show titles truncated to 30 chars max. The select element has a maxWidth of 200px. The main session title in the toolbar header remains unchanged at up to 60 chars.
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes with no errors
- In Toolbar.tsx, `<option>` elements use truncated titles (~30 char max)
- `sessionSwitcher` style includes `maxWidth: '200px'`
- Main `<h2>` session title still uses full `getSessionTitle()` (unchanged)
</verification>

<success_criteria>
The session switcher dropdown in the in-session toolbar view shows compact, truncated session titles (30 chars max) that don't blow out the toolbar width.
</success_criteria>

<output>
After completion, create `.planning/quick/30-the-drop-down-menu-shows-too-much-on-the/30-SUMMARY.md`
</output>
