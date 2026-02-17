---
phase: quick-46
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/store/sessionStore.ts
  - client/src/App.tsx
autonomous: true
requirements: [Q46]
must_haves:
  truths:
    - "When viewing a session timeline and that session is removed from a snapshot, the UI navigates back to directory view"
    - "When viewing a session timeline and a snapshot arrives without that session, the UI navigates back to directory view"
    - "Normal session updates (session still exists) do NOT trigger unwanted navigation"
  artifacts:
    - path: "client/src/store/sessionStore.ts"
      provides: "Auto-navigate logic in setSessions"
    - path: "client/src/App.tsx"
      provides: "Safety effect that checks selectedSessionId against sessions list"
  key_links:
    - from: "client/src/store/sessionStore.ts"
      to: "exitToDirectory action"
      via: "setSessions checks selectedSessionId against incoming sessions"
      pattern: "selectedSessionId.*exitToDirectory"
---

<objective>
Auto-navigate back to directory view when the currently viewed session is deleted or disappears.

Purpose: When a user is viewing a session's timeline graph and that session gets removed (e.g., /clear creates a new session, session file deleted, or server restart sends a snapshot without it), the dashboard should automatically return to the directory overview instead of showing a stale/empty session view.

Output: Modified sessionStore.ts with auto-navigation in setSessions, and a safety effect in App.tsx as a secondary guard.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@client/src/store/sessionStore.ts
@client/src/App.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add auto-navigate-to-directory when selected session disappears</name>
  <files>client/src/store/sessionStore.ts, client/src/App.tsx</files>
  <action>
Two changes needed:

**1. sessionStore.ts - setSessions method (handles `snapshot` messages):**

In `setSessions`, after computing the new sessions array, check if `state.navigationView === 'session-timeline'` AND `state.selectedSessionId` is set AND the new sessions array does NOT contain a session with that ID. If so, also reset navigation state to directory view (same fields as `exitToDirectory`: navigationView='directory', selectedSessionId=null, currentDirectoryCwd=null, treePanelOpen=false, focusedNodeId=null, viewMode='directory', selectedNodeData=null, selectedGroupId=null).

This is the primary guard -- `snapshot` messages completely replace the sessions list, so if the selected session isn't in the new list, it's gone.

**2. App.tsx - Add a useEffect safety guard:**

Add a secondary guard as a React effect in the `App` component. Subscribe to `sessions`, `selectedSessionId`, and `navigationView` from the store. When `navigationView === 'session-timeline'` AND `selectedSessionId` is not null AND `sessions.find(s => s.id === selectedSessionId)` returns undefined, call `exitToDirectory()`. This catches edge cases where individual session removals (not via snapshot) might leave a stale selection.

Use `useSessionStore` with individual selectors to avoid unnecessary re-renders:
```
const sessions = useSessionStore(s => s.sessions);
const selectedSessionId = useSessionStore(s => s.selectedSessionId);
const navigationView = useSessionStore(s => s.navigationView);
const exitToDirectory = useSessionStore(s => s.exitToDirectory);
```

The effect should have `[sessions, selectedSessionId, navigationView, exitToDirectory]` as dependencies.

Do NOT add any console.log or toast notification for this auto-navigation -- it should be seamless and silent.
  </action>
  <verify>
    Run `npm run build` from project root -- should compile without errors.
    Verify the setSessions method includes the selectedSessionId check.
    Verify App.tsx has the useEffect guard.
  </verify>
  <done>
    - setSessions in sessionStore.ts checks if selected session exists in incoming sessions and auto-navigates to directory if not
    - App.tsx has a useEffect that watches for selected session disappearing from sessions list and calls exitToDirectory
    - Build passes without errors
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes
- In sessionStore.ts, `setSessions` includes logic to reset navigation when selectedSessionId is not found in new sessions
- In App.tsx, a useEffect monitors for stale selectedSessionId and calls exitToDirectory
</verification>

<success_criteria>
- When a snapshot arrives without the currently viewed session, the UI silently navigates back to directory view
- When sessions list changes and the selected session is no longer present, the UI navigates back
- Normal operation (session exists in updates) is unaffected
- Build compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/46-auto-navigate-back-to-directory-view-whe/46-SUMMARY.md`
</output>
