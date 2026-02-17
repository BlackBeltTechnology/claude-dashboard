---
phase: 12-navigation-refactor
plan: 02
subsystem: navigation
tags: [navigation, ui-layout, tree-panel, tree-to-graph-sync, session-labels]
dependency_graph:
  requires: [navigation-state, directory-landing-view, session-drill-down]
  provides: [tree-panel, tree-to-graph-sync, session-title-labels]
  affects: [layout, tree-view, graph-view, directory-graph]
tech_stack:
  added: [TreePanel-component, GraphFocusHandler]
  patterns: [tree-to-graph-synchronization, slide-in-panel-animation, useReactFlow-hook]
key_files:
  created:
    - client/src/components/TreePanel.tsx
  modified:
    - client/src/components/Layout.tsx
    - client/src/components/TreeView.tsx
    - client/src/components/GraphView.tsx
    - client/src/utils/directoryGraphLayout.ts
  deleted:
    - client/src/components/ViewToggle.tsx
    - client/src/components/SessionList.tsx
decisions:
  - title: "Tree panel as absolute-positioned overlay"
    rationale: "Panel overlays graph instead of pushing it, preserving graph viewport dimensions. Uses CSS transform for smooth slide animation."
  - title: "GraphFocusHandler as child of ReactFlow"
    rationale: "useReactFlow hook requires component to be child of ReactFlow provider. Extracted focus logic into minimal helper component rendered inside ReactFlow."
  - title: "Session nodes labeled with first command title"
    rationale: "Directory graph session nodes now use getSessionTitle() (first user prompt) instead of getSessionDisplayName() (directory name), making session purpose immediately visible."
metrics:
  duration: 2.7min
  tasks_completed: 3
  files_modified: 4
  files_created: 1
  files_deleted: 2
  completed_at: 2026-02-12T06:34:37Z
---

# Phase 12 Plan 02: Tree Panel, Sync, and Labels Summary

**Slide-in tree panel with tree-to-graph synchronization and session title labels**

## Objective Achieved

Completed the navigation refactor by implementing the tree panel slide-in, wiring tree-to-graph node focus synchronization, updating session node labels in directory graph to show first command titles, and removing dead code from the old sidebar layout model.

## Tasks Completed

### Task 1: Create TreePanel wrapper and wire into Layout

**Status:** ✅ Complete

**What was done:**

**TreePanel.tsx (new component):**
- Created slide-in panel wrapper component that contains TreeView
- Props: `{ isOpen: boolean }`
- CSS transform animation: `translateX(0)` when open, `translateX(-100%)` when closed
- Transition: `250ms cubic-bezier(0.4, 0, 0.2, 1)` for smooth animation
- Panel styles:
  - `position: 'absolute'` (overlays graph, doesn't push it)
  - `left: 0, top: 0, height: '100%'`
  - `width: '280px'`
  - `backgroundColor: '#16213e'`
  - `borderRight: '1px solid #0f3460'`
  - `zIndex: 10`
  - `overflowY: 'auto'`
- Renders `<TreeView />` inside the panel

**Layout.tsx (updated):**
- Imported TreePanel and useSessionStore
- Added conditional rendering: TreePanel only renders when `navigationView === 'session-timeline'`
- Wrapped content in `contentWrapper` div with `position: 'relative'` so TreePanel's absolute positioning works correctly
- TreePanel overlays on top of graph content (not flow layout)

**Files modified:**
- `client/src/components/TreePanel.tsx` (created)
- `client/src/components/Layout.tsx`

**Verification:** Build passes. Tree panel slides in from left when toggle button clicked, collapses back when clicked again. Panel only appears in session-timeline view, never in directory overview.

---

### Task 2: Wire tree-to-graph sync and update session node labels

**Status:** ✅ Complete

**What was done:**

**TreeView.tsx (tree-to-graph sync):**
- Imported `createNodeId` from `'../utils/graphLayout'`
- Imported `setFocusedNode` from store
- Updated `selectNode` callback to trigger graph focus for all node types:
  - **Tool nodes:** Build graph node ID via `createNodeId(selectedSessionId, toolNode.id)`, call `setFocusedNode(graphNodeId)`
  - **Tool-group nodes:** Build graph node ID via `createNodeId(selectedSessionId, node.id)`, call `setFocusedNode(graphNodeId)`
  - **Skill nodes:** Build graph node ID via `createNodeId(selectedSessionId, node.id)`, call `setFocusedNode(graphNodeId)`
  - **Subagent nodes:** Build graph node ID via `createNodeId(selectedSessionId, node.id)`, call `setFocusedNode(graphNodeId)`
  - **Message nodes:** Build graph node ID via `createNodeId(selectedSessionId, node.id)`, call `setFocusedNode(graphNodeId)`
  - **Session nodes:** Focus directly on `node.id` (session root)
- Tree panel stays open after clicking nodes (no auto-close behavior)

**GraphView.tsx (focus handler):**
- Imported `useEffect` and `useReactFlow` from `@xyflow/react`
- Created `GraphFocusHandler` component:
  - Uses `useReactFlow()` hook to access `fitView` function
  - Subscribes to `focusedNodeId` from store
  - `useEffect` watches `focusedNodeId`, calls `fitView` with 100ms delay to ensure layout is calculated
  - `fitView` options: `{ nodes: [{ id: focusedNodeId }], duration: 300, padding: 0.3 }`
  - Returns `null` (no DOM rendering)
- Rendered `<GraphFocusHandler />` as child of `<ReactFlow>` (alongside Controls, MiniMap, Background)
- **Technical note:** `useReactFlow()` requires component to be child of ReactFlow provider, hence the extracted helper component

**directoryGraphLayout.ts (session labels):**
- Changed import from `getSessionDisplayName` to `getSessionTitle`
- Updated session node data creation to use `label: getSessionTitle(session)` instead of `label: getSessionDisplayName(session)`
- Session nodes in directory graph now display first command title (from `session.firstUserPrompt`) instead of directory name

**Files modified:**
- `client/src/components/TreeView.tsx`
- `client/src/components/GraphView.tsx`
- `client/src/utils/directoryGraphLayout.ts`

**Verification:** Build passes. Tree-to-graph synchronization works: clicking a tree node focuses the graph on that node with smooth animation. Session nodes in directory graph display first command title. Tree panel remains open during navigation.

---

### Task 3: Clean up removed components and dead code

**Status:** ✅ Complete

**What was done:**

**ViewToggle.tsx and SessionList.tsx (deleted):**
- Verified no remaining imports of ViewToggle or SessionList (Grep search found only the export declarations in the files themselves)
- Deleted both files as they are no longer used after plan 01 restructured the layout
- ViewToggle: Old view mode toggle component (replaced by Toolbar navigation controls)
- SessionList: Old sidebar session list component (replaced by DirectoryOverview and Toolbar session switcher)

**Files deleted:**
- `client/src/components/ViewToggle.tsx`
- `client/src/components/SessionList.tsx`

**Verification:** Build passes with zero TypeScript errors. No broken imports. All dead code from the old sidebar layout model is cleaned up.

---

## Deviations from Plan

None - plan executed exactly as written.

---

## Technical Details

### TreePanel Slide Animation

```typescript
// CSS transform for slide-in from left
const transform = isOpen ? 'translateX(0)' : 'translateX(-100%)';
const transition = 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)';
```

Panel uses absolute positioning to overlay graph without affecting layout flow.

### Tree-to-Graph Synchronization

**TreeView side (trigger):**
```typescript
// Build React Flow node ID matching graphLayout.ts convention
const graphNodeId = createNodeId(selectedSessionId, node.id);
setFocusedNode(graphNodeId);
```

**GraphView side (handler):**
```typescript
// GraphFocusHandler component (child of ReactFlow)
const { fitView } = useReactFlow();
const focusedNodeId = useSessionStore((state) => state.focusedNodeId);

useEffect(() => {
  if (focusedNodeId) {
    setTimeout(() => {
      fitView({
        nodes: [{ id: focusedNodeId }],
        duration: 300,
        padding: 0.3,
      });
    }, 100);
  }
}, [focusedNodeId, fitView]);
```

The 100ms delay ensures React Flow's layout calculation is complete before fitView is called.

### Session Title Labels

```typescript
// directoryGraphLayout.ts
import { getSessionTitle } from './sessionName';

const sessionNode: Node<SessionNodeData> = {
  // ...
  data: {
    label: getSessionTitle(session), // Changed from getSessionDisplayName(session)
    // ...
  },
};
```

`getSessionTitle()` uses `session.firstUserPrompt` (first non-/clear user command) as the primary label, falling back to directory name if no prompt is available.

---

## Requirements Satisfied

- ✅ **NAV-01 (complete):** Directory graph is the main view with conditional tree panel in session timeline
- ✅ **NAV-02 (complete):** Active/archived session filters work in directory graph toolbar
- ✅ **NAV-03 (complete):** Session nodes labeled with first command title (skipping /clear)
- ✅ **NAV-04 (complete):** Click session node navigates to timeline AND tree-to-graph sync works

**All 4 NAV requirements from v1.1 milestone are fully implemented.**

---

## Key Files

### Created
- `client/src/components/TreePanel.tsx` - Slide-in panel wrapper with CSS transform animation

### Modified
- `client/src/components/Layout.tsx` - Conditional TreePanel rendering in session-timeline view
- `client/src/components/TreeView.tsx` - Tree-to-graph sync via setFocusedNode on node click
- `client/src/components/GraphView.tsx` - GraphFocusHandler component for fitView synchronization
- `client/src/utils/directoryGraphLayout.ts` - Session labels use getSessionTitle() for first command titles

### Deleted
- `client/src/components/ViewToggle.tsx` - Old view mode toggle (replaced by Toolbar)
- `client/src/components/SessionList.tsx` - Old sidebar session list (replaced by DirectoryOverview + Toolbar)

---

## Architecture Notes

**Tree panel overlay pattern:**
- Panel uses `position: absolute` with `transform: translateX()` for slide animation
- Does NOT affect graph viewport dimensions (overlay, not flow layout)
- Only rendered when `navigationView === 'session-timeline'`
- TreeView auto-filters to `selectedSessionId` already (existing behavior)

**Tree-to-graph sync flow:**
1. User clicks tree node
2. TreeView calls `setFocusedNode(graphNodeId)`
3. GraphFocusHandler (inside ReactFlow) reacts via `useEffect`
4. Handler calls `fitView` with focused node ID and animation options
5. Graph pans/zooms to center the focused node (300ms animation)

**Session title display:**
- Directory graph: Session nodes show first command title via `getSessionTitle()`
- Session timeline graph: Session nodes show directory name via `getSessionDisplayName()` (existing behavior, unchanged)
- This distinction makes sense: directory graph needs session differentiation by purpose; session timeline shows session context (directory).

**useReactFlow hook constraint:**
- `useReactFlow()` must be called inside a component that is a child of `<ReactFlow>`
- Extracted focus logic into minimal `GraphFocusHandler` component
- Rendered as sibling to Controls, MiniMap, Background (all children of ReactFlow)

---

## Self-Check: PASSED

**Created files exist:**
```bash
✅ FOUND: client/src/components/TreePanel.tsx
```

**Modified files have expected changes:**
```bash
✅ Layout.tsx imports TreePanel, conditionally renders in session-timeline view
✅ TreeView.tsx calls setFocusedNode for all node types
✅ GraphView.tsx has GraphFocusHandler component reacting to focusedNodeId
✅ directoryGraphLayout.ts uses getSessionTitle() for session node labels
```

**Deleted files no longer exist:**
```bash
✅ NOT FOUND: client/src/components/ViewToggle.tsx
✅ NOT FOUND: client/src/components/SessionList.tsx
```

**Build verification:**
```bash
✅ npm run build passes with zero errors
✅ Client bundle generated successfully
```

---

## What's Next (Phase 13: Timeline)

Phase 12 (Navigation Refactor) is now complete. All NAV requirements satisfied.

Next phase will focus on timeline enhancements:
- TIME-01: Visible user prompts in session timeline
- TIME-02: Clickable commands in NodeDetail panel
- TIME-03: Enhanced timeline with command execution visibility

Navigation foundation is solid. Directory-first navigation with tree-to-graph sync provides intuitive multi-session workflows.
