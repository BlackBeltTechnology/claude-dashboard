---
phase: quick-34
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/components/Toolbar.tsx
autonomous: true
must_haves:
  truths:
    - "Session switcher only shows actively running sessions (active/waiting state)"
    - "No status indicator dots appear in the dropdown options"
    - "An 'Other Sessions' label appears before the dropdown"
    - "Currently selected session is excluded from the dropdown"
    - "If no other active sessions exist, the entire section is hidden"
  artifacts:
    - path: "client/src/components/Toolbar.tsx"
      provides: "Updated session switcher with active-only filtering"
      contains: "Other Sessions"
  key_links: []
---

<objective>
Filter the top-right session switcher dropdown to only show actively running sessions (active/waiting state), remove status indicator dots, and add an "Other Sessions" label.

Purpose: The switcher currently shows idle sessions with status dots, which is noise — if you're switching sessions, you want to jump to ones that are actively doing work.
Output: Updated Toolbar.tsx with cleaner, active-only session switcher.
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@client/src/components/Toolbar.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Filter session switcher to active-only with label</name>
  <files>client/src/components/Toolbar.tsx</files>
  <action>
In `client/src/components/Toolbar.tsx`, make these changes to the session timeline view section (lines ~207-328):

1. **Change `sameDirSessions` filter** (line 208-210): Replace the current filter that includes all non-completed sessions with one that ONLY includes active/waiting sessions AND excludes the currently selected session:
```tsx
const otherActiveSessions = sessions.filter(
  (s) => s.cwd === currentDirectoryCwd && s.id !== selectedSessionId && (s.state === 'active' || s.state === 'waiting')
);
```

2. **Update the visibility condition** (line 305): Change from `sameDirSessions.length > 1` to `otherActiveSessions.length > 0` — show if there's at least one OTHER active session.

3. **Add "Other Sessions" label**: Before the `<select>` element, add a `<span>` label:
```tsx
<span style={{ fontSize: '12px', color: '#888' }}>Other Sessions</span>
```

4. **Simplify the `<option>` rendering** (lines 312-325): Remove the status indicator dot logic entirely. Since we're excluding the selected session, the dropdown should NOT have the current session as the selected value. Instead, use a prompt option:
```tsx
<select
  style={styles.sessionSwitcher}
  value=""
  onChange={handleSessionSwitch}
  title="Switch to another active session"
>
  <option value="" disabled>Switch to...</option>
  {otherActiveSessions.map((s) => {
    const title = getSessionTitle(s);
    const short = title.length > 30 ? title.slice(0, 30) + '...' : title;
    return (
      <option key={s.id} value={s.id}>
        {short}
      </option>
    );
  })}
</select>
```

This removes the `prefix` dots (no more `\u25cf`/`\u25cb`), removes the green/gray coloring on options, and changes the dropdown to a "switch to" action rather than showing current selection.
  </action>
  <verify>
Run `npm run build` from project root — should compile with no errors. Visually: the session switcher should only appear when other active sessions exist in same directory, show "Other Sessions" label, have no status dots, and act as an action dropdown (not showing current session).
  </verify>
  <done>
Session switcher only lists active/waiting sessions (excluding current), no status dots, "Other Sessions" label visible, hidden when no other active sessions exist.
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes with no TypeScript or build errors
- Session switcher dropdown only shows sessions with state === 'active' or state === 'waiting'
- Currently selected session is NOT in the dropdown
- No status indicator dots (no unicode circle characters) in dropdown options
- "Other Sessions" label appears before the dropdown
- Entire section hidden when no other active sessions exist in same directory
</verification>

<success_criteria>
The session switcher is a clean, focused tool for jumping to other actively running sessions, with no visual noise from idle sessions or redundant status indicators.
</success_criteria>

<output>
After completion, create `.planning/quick/34-show-only-active-sessions-in-top-right-s/34-SUMMARY.md`
</output>
