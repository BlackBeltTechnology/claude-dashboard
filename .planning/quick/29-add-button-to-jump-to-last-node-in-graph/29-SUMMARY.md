# Quick Task 29: Add button to jump to last node in graph

## Changes

1. **sessionStore.ts**: Added `jumpToEndTrigger` state and `jumpToEnd()` action
2. **GraphView.tsx**: Extended `GraphFocusHandler` with useEffect that responds to `jumpToEndTrigger` by finding the rightmost non-child node and fitting view to it
3. **Toolbar.tsx**: Added "End" button (with arrow icon) in session timeline toolbar

## How it works
- Click the "⇥ End" button in the toolbar
- `jumpToEnd()` increments the trigger counter
- `GraphFocusHandler` detects the change, finds the node with the highest X position (rightmost = last in LR layout), and smoothly pans/zooms to it

## Build
Clean build, zero TypeScript errors.
