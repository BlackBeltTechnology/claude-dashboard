---
phase: quick
plan: 22
type: execute
wave: 1
depends_on: []
files_modified:
  - shared/src/index.ts
  - server/src/session-discovery.ts
  - client/src/store/sessionStore.ts
  - client/src/components/FilterBar.tsx
  - client/src/components/TreeNode.tsx
  - client/src/components/NodeDetail.tsx
  - client/src/components/nodes/ToolNode.tsx
  - client/src/components/nodes/ToolGroupNode.tsx
  - client/src/components/nodes/SessionNode.tsx
  - client/src/components/nodes/SubagentNode.tsx
  - client/src/components/nodes/SkillNode.tsx
autonomous: true
user_setup: []
---

<objective>
Remove idle state detection and simplify session state to only Active/Archived.

Purpose: User requested removing idle state - sessions are either actively running or completed/archived. No middle ground state needed.

Output: Updated type definitions, server logic, store state, and UI components.
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
# Understanding the current state detection

## Current SessionState type (shared/src/index.ts)
```typescript
export type SessionState = 'active' | 'waiting' | 'idle' | 'completed';
```

## Current state detection logic (server/src/session-discovery.ts)
- Active: debug log modified <5s ago
- Waiting: assistant message with no tool_use AND debug log stale >10s
- Idle: debug log not modified for >60s
- Completed: session has summary entry or confirmed closed

## Current client filtering (client/src/store/sessionStore.ts)
- showActive: boolean (filters 'active' and 'waiting' states)
- showIdle: boolean (filters 'idle' state)
- showArchived: boolean (filters 'completed' state)

## Files that reference idle state
- shared/src/index.ts: Type definition
- server/src/session-discovery.ts: IDLE_THRESHOLD_MS constant, determineSessionState function
- client/src/store/sessionStore.ts: showIdle state, getFilteredSessions filtering
- client/src/components/FilterBar.tsx: Idle checkbox
- UI component files: STATUS_COLORS objects with idle fallback colors
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove idle from SessionState type and server detection</name>
  <files>
    shared/src/index.ts
    server/src/session-discovery.ts
  </files>
  <action>
    **In shared/src/index.ts:**
    - Change line 2 from: `export type SessionState = 'active' | 'waiting' | 'idle' | 'completed';`
    - To: `export type SessionState = 'active' | 'waiting' | 'completed';`

    **In server/src/session-discovery.ts:**
    - Remove IDLE_THRESHOLD_MS constant (line 21: `const IDLE_THRESHOLD_MS = 60000;`)
    - In determineSessionState function (lines 453-456), remove the idle branch:
      ```typescript
      // REMOVE THIS:
      // 4. Idle state: no activity >60s
      if (timeSinceActivity >= IDLE_THRESHOLD_MS) {
        return 'idle';
      }
      ```
    - Update the default return (line 460) to return 'active' instead of relying on idle logic
    - Update the function comment at top to remove idle state description
  </action>
  <verify>
    grep -n "idle" shared/src/index.ts server/src/session-discovery.ts
    # Should return no matches for 'idle' in these files
  </verify>
  <done>
    SessionState type no longer includes 'idle', determineSessionState never returns 'idle'
  </done>
</task>

<task type="auto">
  <name>Task 2: Remove idle state from client store and UI</name>
  <files>
    client/src/store/sessionStore.ts
    client/src/components/FilterBar.tsx
  </files>
  <action>
    **In client/src/store/sessionStore.ts:**
    - Remove `showIdle: boolean` from interface (line 47)
    - Remove `setShowIdle: (show: boolean) => void` from interface (line 69)
    - Remove `showIdle: true` from initial state (line 206)
    - Remove `setShowIdle` function implementation (lines 260-262)
    - Update `getFilteredSessions` function (lines 278-308):
      - Remove showIdle from destructuring (line 279)
      - Remove the `if (s.state === 'idle') return showIdle;` line (line 285)
      - Keep: 'active'/'waiting' -> showActive, 'completed' -> showArchived

    **In client/src/components/FilterBar.tsx:**
    - Remove `const showIdle = useSessionStore((state) => state.showIdle);` (line 47)
    - Remove `const setShowIdle = useSessionStore((state) => state.setShowIdle);` (line 51)
    - Remove the entire Idle checkbox block (lines 74-82)
  </action>
  <verify>
    grep -n "showIdle\|setShowIdle" client/src/store/sessionStore.ts client/src/components/FilterBar.tsx
    # Should return no matches
  </verify>
  <done>
    Client store no longer tracks showIdle, FilterBar has no Idle checkbox
  </done>
</task>

<task type="auto">
  <name>Task 3: Clean up idle references in UI components</name>
  <files>
    client/src/components/TreeNode.tsx
    client/src/components/NodeDetail.tsx
    client/src/components/nodes/ToolNode.tsx
    client/src/components/nodes/ToolGroupNode.tsx
    client/src/components/nodes/SessionNode.tsx
    client/src/components/nodes/SubagentNode.tsx
    client/src/components/nodes/SkillNode.tsx
  </files>
  <action>
    **For each file, in the STATUS_COLORS or stateColors object:**
    - Remove the `idle:` entry (used as fallback only, never actually rendered now)
    - The remaining states should be: 'active', 'waiting', 'completed'

    **Files and lines to check:**
    - TreeNode.tsx line 20: `idle: '#6b7280'`
    - NodeDetail.tsx line 9: `idle: { bg: '#374151', text: '#9ca3af' }`
    - ToolNode.tsx line 18: `idle: { bg: '#1f2937', border: '#4b5563', dot: '#6b7280' }`
    - ToolGroupNode.tsx line 20: `idle: { bg: '#1f2937', border: '#4b5563', dot: '#6b7280' }`
    - SessionNode.tsx line 22: `idle: { bg: '#1f2937', border: '#4b5563', dot: '#6b7280' }`
    - SubagentNode.tsx line 28: `idle: { bg: '#1f2937', border: '#4b5563', dot: '#6b7280' }`
    - SkillNode.tsx line 18: `idle: { bg: '#1f2937', border: '#4b5563', dot: '#6b7280' }`
  </action>
  <verify>
    grep -n "idle:" client/src/components/TreeNode.tsx client/src/components/NodeDetail.tsx client/src/components/nodes/*.tsx
    # Should return no matches
  </verify>
  <done>
    All UI components no longer reference idle state colors
  </done>
</task>

</tasks>

<verification>
After all tasks complete:
1. `grep -rn "idle" shared/src/index.ts server/src/session-discovery.ts` - no matches
2. `grep -rn "showIdle\|setShowIdle" client/src/store/sessionStore.ts client/src/components/FilterBar.tsx` - no matches
3. `grep -rn "idle:" client/src/components/TreeNode.tsx client/src/components/NodeDetail.tsx client/src/components/nodes/*.tsx` - no matches
4. Build passes: `npm run build` in client directory
</verification>

<success_criteria>
- SessionState type = 'active' | 'waiting' | 'completed' (no 'idle')
- determineSessionState never returns 'idle'
- FilterBar has only Active and Archived checkboxes (no Idle)
- All UI components use only active/waiting/completed state colors
- Application builds without errors
</success_criteria>

<output>
After completion, create `.planning/quick/22-fix-active-idle-archived-session-state-d/22-SUMMARY.md`
</output>
