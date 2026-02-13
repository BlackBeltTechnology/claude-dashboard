---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/components/SessionList.tsx
autonomous: true

must_haves:
  truths:
    - "Single-session cwd groups show the Clear button on hover, same as multi-session groups"
    - "Single-session groups render with the CollapsibleSessionGroup wrapper including chevron, group title, count badge, and Clear button"
    - "Multi-session groups continue to work exactly as before"
  artifacts:
    - path: "client/src/components/SessionList.tsx"
      provides: "Consistent CollapsibleSessionGroup rendering for all group sizes"
      contains: "CollapsibleSessionGroup"
  key_links:
    - from: "SessionList render loop"
      to: "CollapsibleSessionGroup"
      via: "Always wraps groups regardless of session count"
      pattern: "CollapsibleSessionGroup"
---

<objective>
Fix the Clear button not appearing for single-session cwd groups.

Purpose: The `groupSessions.length === 1` special case on line 301 of SessionList.tsx renders a bare `SessionItem` without the `CollapsibleSessionGroup` wrapper. Since the Clear button (which calls `hideSessionsByCwd`) only exists inside `CollapsibleSessionGroup`, single-session groups have no way to be cleared/hidden. This was an oversight when Phase 09-01 added the clear functionality on top of Phase 04-01's optimization.

Output: All cwd groups, regardless of session count, render inside `CollapsibleSessionGroup` with full Clear button functionality.
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@client/src/components/SessionList.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove single-session group bypass and always render CollapsibleSessionGroup</name>
  <files>client/src/components/SessionList.tsx</files>
  <action>
In the `SessionList` component's render method (lines 300-326), remove the `if (groupSessions.length === 1)` conditional branch entirely. Replace the entire `map` callback body so that ALL groups — regardless of session count — render via `CollapsibleSessionGroup`.

The current code (lines 300-326):
```tsx
{Array.from(sessionGroups.entries()).map(([cwd, groupSessions]) => {
  if (groupSessions.length === 1) {
    // Single session - render directly without group wrapper
    const session = groupSessions[0];
    return (
      <SessionItem ... />
    );
  } else {
    // Multiple sessions - render collapsible group
    return (
      <CollapsibleSessionGroup ... />
    );
  }
})}
```

Should become:
```tsx
{Array.from(sessionGroups.entries()).map(([cwd, groupSessions]) => (
  <CollapsibleSessionGroup
    key={cwd}
    cwd={cwd}
    sessions={groupSessions}
    displayNames={displayNames}
    selectedSessionId={selectedSessionId}
    onSessionSelect={setSelectedSession}
  />
))}
```

This removes the special case entirely. `CollapsibleSessionGroup` already handles any number of sessions correctly (it maps over the sessions array and renders `SessionItem` for each one). A group with 1 session will show "(1)" in the count badge and the Clear button on hover, which is the desired behavior.

Do NOT modify the `CollapsibleSessionGroup` component itself — it already works correctly for any session count.
  </action>
  <verify>
Run `npm run build` from the project root and confirm no TypeScript errors. Then visually inspect: open the dashboard, find a cwd group with only 1 session, hover over its group header, and confirm the Clear button appears.
  </verify>
  <done>
All cwd groups in the session list render with `CollapsibleSessionGroup`, providing the group header with chevron, directory name, count badge, and hover-activated Clear button — regardless of whether the group contains 1 session or many.
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes with no errors
- Single-session cwd groups display with group header (chevron, name, count)
- Hovering over any group header (including single-session) reveals the Clear button
- Clicking Clear on a single-session group shows confirmation dialog and hides the group
- Multi-session groups continue to work identically to before
</verification>

<success_criteria>
The `groupSessions.length === 1` bypass is removed. Every cwd group renders inside `CollapsibleSessionGroup`. The Clear button is accessible for all groups regardless of session count.
</success_criteria>

<output>
After completion, create `.planning/quick/2-fix-clear-button-not-working-for-single-/2-SUMMARY.md`
</output>
