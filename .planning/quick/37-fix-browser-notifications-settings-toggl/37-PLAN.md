---
phase: 37-fix-browser-notifications-settings-toggl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/hooks/useNotifications.ts
  - server/src/watcher.ts
  - shared/src/index.ts
autonomous: true

must_haves:
  truths:
    - Browser notifications only appear when localStorage setting is enabled
    - Notification shows session folder path (cwd) when available
    - Notification shows last command executed in the session
    - Notifications only trigger on transition to 'waiting' state
  artifacts:
    - path: "client/src/hooks/useNotifications.ts"
      provides: "Notification hook that checks localStorage and formats rich messages"
      min_lines: 80
      exports: ["useNotifications"]
    - path: "shared/src/index.ts"
      provides: "StateChangePayload with cwd and lastUserPrompt fields"
      contains: "cwd?: string"
    - path: "server/src/watcher.ts"
      provides: "Emits state-change with session cwd and lastUserPrompt"
      contains: "state-change"
  key_links:
    - from: "client/src/hooks/useNotifications.ts"
      to: "localStorage.claude-dashboard-browser-notifications"
      via: "check before showing notification"
      pattern: "localStorage\\.getItem.*browser-notifications"
    - from: "server/src/watcher.ts"
      to: "shared StateChangePayload"
      via: "emit state-change event with enriched data"
      pattern: "emit.*state-change.*cwd"
---

<objective>
Fix browser notifications to respect settings toggle and show rich session information (folder path + last command) when a session transitions to 'waiting' state.

Purpose: Users can control notification behavior via Settings panel and get meaningful context (what session, where, what command) when notified.
Output: Working browser notifications that respect user preferences and display actionable information.
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Current implementation:
- Settings.tsx has toggle that saves to localStorage (key: 'claude-dashboard-browser-notifications')
- useNotifications.ts always shows notifications when 'waiting' state is reached (ignores localStorage)
- Notification message is generic: "Session Waiting: {sessionName} is waiting for input"
- StateChangePayload only includes sessionId, agentId, previousState, newState

Required changes:
- Check localStorage setting before showing notification
- Include cwd and lastUserPrompt in StateChangePayload
- Format notification to show folder + last command
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add cwd and lastUserPrompt to StateChangePayload</name>
  <files>shared/src/index.ts</files>
  <action>
Update StateChangePayload interface to include optional cwd and lastUserPrompt fields:

```typescript
export interface StateChangePayload {
  sessionId: string;
  agentId?: string;
  previousState: SessionState;
  newState: SessionState;
  cwd?: string;                  // Working directory path
  lastUserPrompt?: string;       // Last command/prompt executed
}
```

These fields provide context for browser notifications about what session is waiting (folder location) and what command it was executing.
  </action>
  <verify>
Run: `npm run build` from project root and confirm TypeScript compiles successfully with no errors in shared/ workspace.
  </verify>
  <done>
StateChangePayload interface has cwd and lastUserPrompt optional fields, shared workspace builds successfully.
  </done>
</task>

<task type="auto">
  <name>Task 2: Emit enriched state-change events from watcher</name>
  <files>server/src/watcher.ts</files>
  <action>
Update the updateStateAndEmit method and state-change emit calls to include session cwd and lastUserPrompt from the session object:

In updateStateAndEmit method (around line 357):
- Accept session object as additional parameter
- Extract cwd and lastUserPrompt from session when emitting state-change
- Emit: `this.emit('state-change', sessionId, agentId, previousState, newState, session.cwd, session.lastUserPrompt)`

Update all calls to updateStateAndEmit (processSessionChange line 253, pollStates lines 426 and 446):
- Pass session object as final parameter: `this.updateStateAndEmit(sessionId, undefined, newState, session)`
- For subagent calls, pass parent session: `this.updateStateAndEmit(sessionId, agentId, state, parentSession)`

Update the emit call in updateStateAndEmit to match StateChangePayload interface:
```typescript
this.emit('state-change', sessionId, agentId, previousState, newState, cwd, lastUserPrompt);
```

Update server/src/index.ts WebSocket handler (around line 70-80) to extract and include cwd/lastUserPrompt when constructing StateChangePayload:
```typescript
sessionManager.on('state-change', (sessionId, agentId, previousState, newState, cwd, lastUserPrompt) => {
  const payload: StateChangePayload = {
    sessionId,
    agentId,
    previousState,
    newState,
    cwd,
    lastUserPrompt,
  };
  broadcast({ type: 'state-change', payload, timestamp: Date.now() });
});
```
  </action>
  <verify>
Run: `npm run build` from project root. Start server with `npm run server` and watch console output for state-change events. Verify no TypeScript errors and server starts successfully.
  </verify>
  <done>
Server emits state-change events with cwd and lastUserPrompt fields, builds without errors.
  </done>
</task>

<task type="auto">
  <name>Task 3: Check localStorage and show rich notifications in useNotifications</name>
  <files>client/src/hooks/useNotifications.ts</files>
  <action>
Update useNotifications hook to:

1. Check localStorage setting before showing notification:
```typescript
const showNotification = useCallback(
  (title: string, body: string) => {
    // Check if notifications are enabled in settings
    const enabled = localStorage.getItem('claude-dashboard-browser-notifications') === 'true';
    if (!enabled) return;

    if (permissionRef.current !== 'granted') return;
    if (document.hasFocus()) return;

    // ... rest of existing notification logic
  },
  []
);
```

2. Extract cwd and lastUserPrompt from StateChangePayload and format rich notification message:
```typescript
useEffect(() => {
  if (!lastMessage) return;
  if (lastMessage.type !== 'state-change') return;

  const payload = lastMessage.payload as StateChangePayload;

  if (payload.newState === 'waiting') {
    const sessions = useSessionStore.getState().sessions;
    const session = sessions.find((s) => s.id === payload.sessionId);

    // Build notification title with folder path
    const folderPath = payload.cwd || session?.cwd || 'Unknown folder';
    const title = `Session Ready: ${folderPath}`;

    // Build notification body with last command
    const lastCommand = payload.lastUserPrompt || session?.lastUserPrompt || 'No command recorded';
    const body = `Last command: ${lastCommand.length > 60 ? lastCommand.slice(0, 60) + '...' : lastCommand}`;

    showNotification(title, body);
  }
}, [lastMessage, showNotification]);
```

This makes notifications show:
- Title: "Session Ready: /home/user/project-name"
- Body: "Last command: /gsd:execute-phase 20"

Only when localStorage setting is 'true' and browser permission is granted.
  </action>
  <verify>
1. Run: `npm run build && npm run client` to start client
2. Open Settings panel, enable Browser Notifications toggle
3. Trigger a session state change to 'waiting' (wait for active session to complete)
4. Verify notification appears with folder path in title and last command in body
5. Disable toggle in Settings, trigger another state change, verify NO notification appears
  </verify>
  <done>
Browser notifications only appear when localStorage setting is enabled, show session folder path in title and last command in body, only trigger on 'waiting' state transitions.
  </done>
</task>

</tasks>

<verification>
Manual verification checklist:
- [ ] Settings toggle enables/disables notifications (check localStorage value)
- [ ] Notification shows folder path in title (e.g., "Session Ready: /home/user/project")
- [ ] Notification shows last command in body (e.g., "Last command: npm run build")
- [ ] Notification only appears when toggle is ON
- [ ] Notification only appears on 'waiting' state transition
- [ ] Clicking notification focuses dashboard window
</verification>

<success_criteria>
Browser notification system:
1. Respects localStorage 'claude-dashboard-browser-notifications' setting
2. Shows session folder path (cwd) in notification title
3. Shows last command (lastUserPrompt) in notification body
4. Only triggers when session transitions to 'waiting' state
5. Works seamlessly with existing Settings panel toggle
</success_criteria>

<output>
After completion, create `.planning/quick/37-fix-browser-notifications-settings-toggl/37-SUMMARY.md`
</output>
