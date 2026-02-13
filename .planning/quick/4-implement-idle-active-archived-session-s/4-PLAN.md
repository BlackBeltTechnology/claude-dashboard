---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/store/sessionStore.ts
  - client/src/components/FilterBar.tsx
autonomous: true

must_haves:
  truths:
    - "Active checkbox filters sessions with state 'active' or 'waiting'"
    - "Idle checkbox filters sessions with state 'idle'"
    - "Archived checkbox filters sessions with state 'completed'"
    - "All three checkboxes default to true (show everything)"
    - "Unchecking all three shows empty state"
  artifacts:
    - path: "client/src/store/sessionStore.ts"
      provides: "showArchived state + setShowArchived action + updated getFilteredSessions"
    - path: "client/src/components/FilterBar.tsx"
      provides: "Three-toggle filter bar: Active, Idle, Archived"
  key_links:
    - from: "client/src/components/FilterBar.tsx"
      to: "client/src/store/sessionStore.ts"
      via: "useSessionStore selectors for showActive, showIdle, showArchived"
      pattern: "showArchived"
    - from: "client/src/store/sessionStore.ts getFilteredSessions"
      to: "Session.state"
      via: "filter logic mapping states to toggles"
      pattern: "showArchived.*completed"
---

<objective>
Implement idle/active/archived session state filters in the FilterBar component.

Purpose: The user expects three filter toggles matching the conceptual session lifecycle:
- **Active** = session is running (server states: `active`, `waiting`)
- **Idle** = session is opened but not running (server state: `idle`)
- **Archived** = session is finished (server state: `completed`)

Currently only Active and Idle toggles exist, and `completed` sessions are always hidden.
This adds the missing Archived toggle and ensures all three states are filterable.

Output: Updated FilterBar with 3 toggles, updated store with `showArchived` state, updated filter logic.
</objective>

<context>
@client/src/store/sessionStore.ts
@client/src/components/FilterBar.tsx
@shared/src/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add showArchived to Zustand store and fix getFilteredSessions</name>
  <files>client/src/store/sessionStore.ts</files>
  <action>
1. Add `showArchived: boolean` to `SessionStore` interface (default: `true`).
2. Add `setShowArchived: (show: boolean) => void` action to the interface.
3. Initialize `showArchived: true` in the create() call.
4. Add `setShowArchived` implementation: `(show) => { set({ showArchived: show }); }`.
5. Update `getFilteredSessions()`:
   - Destructure `showArchived` alongside existing toggles.
   - Replace the current status filter logic (lines 277-282) with:
     ```
     let result: Session[] = sessions.filter((s) => {
       if (s.state === 'active' || s.state === 'waiting') return showActive;
       if (s.state === 'idle') return showIdle;
       if (s.state === 'completed') return showArchived;
       return true;
     });
     ```
   - This removes the unconditional `completed` hide and makes it toggleable.
6. Update the `useMemo` dependency in `SessionList.tsx` is NOT needed because `SessionList` already subscribes to `showActive` and `showIdle` from the store, and `getFilteredSessions` reads from `get()` directly. BUT we need to ensure `SessionList` also subscribes to `showArchived` so the useMemo re-runs. Add `const showArchived = useSessionStore((state) => state.showArchived);` in `SessionList` component and add it to the useMemo deps array.
  </action>
  <verify>Run `npm run build` from the project root — TypeScript compiles without errors.</verify>
  <done>Store has `showArchived` boolean + setter. `getFilteredSessions()` respects all three toggles: active/waiting -> showActive, idle -> showIdle, completed -> showArchived. SessionList subscribes to showArchived for reactivity.</done>
</task>

<task type="auto">
  <name>Task 2: Add Archived toggle to FilterBar and update SessionList</name>
  <files>client/src/components/FilterBar.tsx, client/src/components/SessionList.tsx</files>
  <action>
1. In `FilterBar.tsx`:
   - Add selector: `const showArchived = useSessionStore((state) => state.showArchived);`
   - Add setter: `const setShowArchived = useSessionStore((state) => state.setShowArchived);`
   - Add a third checkbox label after the Idle label (same style as existing checkboxes):
     ```tsx
     <label style={styles.checkboxLabel}>
       <input
         type="checkbox"
         style={styles.checkbox}
         checked={showArchived}
         onChange={(e) => setShowArchived(e.target.checked)}
       />
       Archived
     </label>
     ```

2. In `SessionList.tsx`:
   - Add `const showArchived = useSessionStore((state) => state.showArchived);` alongside the existing `showActive` and `showIdle` selectors.
   - Add `showArchived` to the useMemo dependency array for the `sessions` variable (the one that calls `getFilteredSessions()`).
   - This ensures the list re-renders when the Archived toggle changes.
  </action>
  <verify>Run `npm run build` from the project root — no errors. Visually confirm in the browser that the FilterBar shows three checkboxes: Active, Idle, Archived.</verify>
  <done>FilterBar renders Active, Idle, and Archived checkboxes. Toggling Archived shows/hides completed sessions. All three default to checked (showing all sessions).</done>
</task>

</tasks>

<verification>
1. `npm run build` completes without TypeScript errors.
2. Open dashboard in browser — FilterBar shows three checkboxes: Active, Idle, Archived.
3. With all three checked: all sessions visible (active, waiting, idle, completed).
4. Uncheck Active: sessions with state `active` or `waiting` disappear.
5. Uncheck Idle: sessions with state `idle` disappear.
6. Uncheck Archived: sessions with state `completed` disappear.
7. Check all three again: all sessions reappear.
</verification>

<success_criteria>
- FilterBar has Active, Idle, and Archived toggle checkboxes
- Each toggle controls visibility of its corresponding session states
- All three default to true (all sessions visible)
- Completed sessions are no longer unconditionally hidden
- Build passes with no TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/4-implement-idle-active-archived-session-s/4-SUMMARY.md`
</output>
