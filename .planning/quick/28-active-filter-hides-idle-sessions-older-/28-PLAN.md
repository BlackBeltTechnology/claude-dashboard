---
phase: quick-28-active-filter-hides-idle-sessions-older
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [client/src/store/sessionStore.ts]
autonomous: true

must_haves:
  truths:
    - "Active filter shows sessions in 'active' or 'waiting' state"
    - "Active filter shows 'idle' sessions only if lastActivity is within last 10 minutes"
    - "Idle sessions older than 10 minutes are hidden when Active filter is on"
  artifacts:
    - path: "client/src/store/sessionStore.ts"
      provides: "Session filtering logic with 10-minute idle cutoff"
      line_range: "372-376"
  key_links:
    - from: "sessionStore.getFilteredSessions()"
      to: "Session.lastActivity"
      via: "Timestamp comparison"
      pattern: "Date.now() - s.lastActivity > 600000"
---

<objective>
Fix the Active filter to hide idle sessions older than 10 minutes.

Purpose: Users should see only currently active/waiting sessions or recently idle ones. Stale idle sessions clutter the view.
Output: Updated filter logic in sessionStore that respects the 10-minute idle cutoff.
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/28-active-filter-hides-idle-sessions-older-
</context>

<tasks>

<task type="auto">
  <name>Fix Active filter to hide idle sessions older than 10 minutes</name>
  <files>client/src/store/sessionStore.ts</files>
  <action>
In sessionStore.ts, line 372-376, update the filter logic to check idle session age:

Current code filters all 'idle' sessions when showActive is true. Update to:
- If state is 'active' or 'waiting': return showActive (unchanged)
- If state is 'idle': return showActive AND (Date.now() - s.lastActivity <= 600000)
  - 600000 ms = 10 minutes
  - Idle sessions older than 10 min are filtered out even if showActive is true
- If state is 'completed': return showArchived (unchanged)

This ensures idle sessions without recent activity are hidden from the Active view, keeping the interface focused on truly active work.
  </action>
  <verify>
Test the filter change:
1. In browser console (or via React DevTools), call store.getFilteredSessions() on a session with lastActivity old (e.g., Date.now() - 700000)
2. With showActive=true, idle session should NOT appear in result
3. Call it on a session with recent lastActivity (Date.now() - 300000)
4. With showActive=true, idle session SHOULD appear in result
5. Sessions in 'active' or 'waiting' should always appear when showActive=true (age irrelevant)
  </verify>
  <done>
Filter correctly hides idle sessions older than 10 minutes while showing:
- All 'active' and 'waiting' sessions
- 'idle' sessions with lastActivity within last 10 minutes
- All 'completed' sessions when showArchived is true
  </done>
</task>

</tasks>

<verification>
To verify the fix works end-to-end:
1. Start the app and load a few sessions
2. Wait for some sessions to reach 'idle' state with old timestamps
3. Toggle the Active filter on
4. Confirm idle sessions older than 10 min are hidden
5. Confirm idle sessions within 10 min and active/waiting sessions remain visible
</verification>

<success_criteria>
- Idle sessions older than 10 minutes are hidden when Active filter is on
- Idle sessions within 10 minutes remain visible
- Active and waiting sessions remain visible regardless of age
- Completed sessions unaffected (still hidden unless Archived filter on)
</success_criteria>

<output>
After completion, create `.planning/quick/28-active-filter-hides-idle-sessions-older-/28-SUMMARY.md` documenting the change.
</output>
