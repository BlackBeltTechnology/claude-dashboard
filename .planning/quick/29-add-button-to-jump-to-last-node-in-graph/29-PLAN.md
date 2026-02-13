# Quick Task 29: Add button to jump to last node in graph

## Plan 29-01: Jump to End button

### Task 1: Add jump-to-end mechanism
- Add `jumpToEndTrigger` counter + `jumpToEnd()` action to sessionStore
- In GraphFocusHandler, respond to trigger by finding rightmost node and fitting view
- Add "End" button to Toolbar in session timeline view

**Files:** sessionStore.ts, GraphView.tsx, Toolbar.tsx
