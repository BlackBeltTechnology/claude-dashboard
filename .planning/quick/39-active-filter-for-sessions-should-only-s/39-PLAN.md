---
phase: 39-active-filter-for-sessions-should-only-s
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/store/sessionStore.ts
autonomous: true
must_haves:
  truths:
    - "When Active checkbox is checked, only sessions with state === 'active' (green/running) appear"
    - "Sessions with state 'waiting' or 'idle' are never shown regardless of Active toggle"
    - "Archived (completed) sessions still controlled by Archived toggle as before"
  artifacts:
    - path: "client/src/store/sessionStore.ts"
      provides: "Updated getFilteredSessions logic"
      contains: "s.state === 'active'"
  key_links:
    - from: "client/src/store/sessionStore.ts"
      to: "getFilteredSessions"
      via: "filter logic"
      pattern: "s\\.state === 'active'"
---

<objective>
Restrict the "Active" filter toggle to only show sessions with state === 'active' (green, currently running). Currently the Active toggle also shows 'waiting' and 'idle' (within 10min timeout) sessions. After this change, only truly running sessions appear when the Active filter is on.

Purpose: User wants the Active filter to be precise -- only green/running sessions, not waiting or idle ones.
Output: Updated filter logic in sessionStore.ts
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@client/src/store/sessionStore.ts
@client/src/components/FilterBar.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update getFilteredSessions to only show 'active' state for Active toggle</name>
  <files>client/src/store/sessionStore.ts</files>
  <action>
In `getFilteredSessions()` (around line 422-436), replace the current status filtering block:

```typescript
if (s.state === 'active' || s.state === 'waiting') return showActive;
if (s.state === 'idle') {
  if (!showActive) return false;
  return (Date.now() - s.lastActivity) < IDLE_TIMEOUT_MS;
}
if (s.state === 'completed') return showArchived;
```

With this simplified logic:

```typescript
if (s.state === 'active') return showActive;
if (s.state === 'waiting' || s.state === 'idle') return false;
if (s.state === 'completed') return showArchived;
```

Key changes:
- Only `state === 'active'` is gated by the `showActive` toggle
- `waiting` and `idle` sessions are always hidden (return false)
- `completed` remains gated by `showArchived` as before
- Remove the `IDLE_TIMEOUT_MS` constant since idle timeout logic is no longer needed in this filter

Also update the comment above the filter block to reflect the new behavior:
```typescript
// 'active' (running/green) maps to the Active toggle
// 'waiting' and 'idle' sessions are always hidden
// 'completed' maps to Archived toggle
```
  </action>
  <verify>
Run `npm run build` from project root -- should compile without errors. Visually verify: with Active checked, only green/running sessions appear in the sidebar; waiting and idle sessions should not appear regardless of toggle state.
  </verify>
  <done>
The Active filter toggle only shows sessions with state === 'active' (green/running). Waiting and idle sessions are always filtered out. Archived toggle behavior unchanged. Build passes.
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes with no TypeScript errors
- With Active checkbox ON: only green (state==='active') sessions visible
- With Active checkbox OFF: no active sessions visible
- Waiting and idle sessions never visible regardless of toggle state
- Archived checkbox still controls completed sessions as before
</verification>

<success_criteria>
The "Active" filter in FilterBar exclusively shows running/green sessions. No waiting or idle sessions leak through.
</success_criteria>

<output>
After completion, create `.planning/quick/39-active-filter-for-sessions-should-only-s/39-01-SUMMARY.md`
</output>
