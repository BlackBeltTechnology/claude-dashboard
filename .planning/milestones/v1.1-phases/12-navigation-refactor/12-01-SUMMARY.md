---
phase: 12-navigation-refactor
plan: 01
subsystem: navigation
tags: [navigation, ui-layout, zustand, toolbar, routing]
dependency_graph:
  requires: []
  provides: [navigation-state, directory-landing-view, session-drill-down]
  affects: [layout, store, app-routing]
tech_stack:
  added: [Toolbar-component, navigation-view-state]
  patterns: [atomic-navigation-actions, conditional-toolbar-rendering]
key_files:
  created:
    - client/src/components/Toolbar.tsx
  modified:
    - client/src/store/sessionStore.ts
    - client/src/components/Layout.tsx
    - client/src/components/FilterBar.tsx
    - client/src/components/DirectoryOverview.tsx
    - client/src/App.tsx
    - shared/src/index.ts
    - client/src/components/NodeDetail.tsx
    - client/src/components/TreeNode.tsx
    - client/src/components/nodes/SessionNode.tsx
    - client/src/components/nodes/SkillNode.tsx
    - client/src/components/nodes/SubagentNode.tsx
    - client/src/components/nodes/ToolGroupNode.tsx
    - client/src/components/nodes/ToolNode.tsx
decisions:
  - title: "Navigation state separate from view mode"
    rationale: "navigationView ('directory' | 'session-timeline') is higher-level routing concept; viewMode ('tree' | 'graph' | 'directory') is lower-level component rendering state. They coexist."
  - title: "Atomic navigation actions prevent state desync"
    rationale: "enterSession and exitToDirectory batch multiple state changes atomically, avoiding intermediate inconsistent states that could cause UI bugs."
  - title: "Session switcher scoped by directory CWD"
    rationale: "When viewing a session, the switcher dropdown only shows sessions from the same working directory, providing contextually relevant navigation."
metrics:
  duration: 4.8min
  tasks_completed: 2
  files_modified: 13
  files_created: 1
  completed_at: 2026-02-12T06:28:25Z
---

# Phase 12 Plan 01: Navigation State and Layout Refactor Summary

**JWT-free directory-first navigation with conditional toolbar and atomic state management**

## Objective Achieved

Transformed the dashboard from sidebar-centric to graph-centric layout. Directory overview is now the landing view. Session timeline is the drill-down view. Navigation is controlled by atomic Zustand actions with a conditional toolbar that adapts to the current context.

## Tasks Completed

### Task 1: Extend Zustand store with navigation state and actions

**Status:** ✅ Complete

**What was done:**
- Added `NavigationView` type: `'directory' | 'session-timeline'`
- Added navigation state fields to SessionStore:
  - `navigationView: NavigationView` (default: `'directory'`)
  - `treePanelOpen: boolean` (default: `false`)
  - `focusedNodeId: string | null` (default: `null`)
  - `currentDirectoryCwd: string | null` (default: `null`)
- Implemented atomic navigation actions:
  - `enterSession(sessionId, cwd)`: Sets navigation to session-timeline, stores selected session + directory CWD, resets tree panel and focus state. Does NOT clear selectedNodeData/selectedGroupId per research pitfall avoidance.
  - `exitToDirectory()`: Returns to directory view, clears session selection, DOES clear selectedNodeData/selectedGroupId since we're leaving session context.
  - `toggleTreePanel()`: Toggles tree panel open/closed state (wired in plan 02).
  - `setFocusedNode(nodeId)`: Sets focused node for tree-to-graph sync (used in plan 02).
- Changed `loadViewMode()` default from `'tree'` to `'directory'` since directory is the new landing view.

**Files modified:**
- `client/src/store/sessionStore.ts`

**Verification:** TypeScript compilation passes. Navigation state and actions are type-safe and ready for use.

---

### Task 2: Restructure Layout, build Toolbar, update FilterBar and App

**Status:** ✅ Complete

**What was done:**

**Toolbar.tsx (new component):**
- Created conditional toolbar that renders different controls based on `navigationView`.
- **Directory view toolbar:**
  - Left: App title "Claude Session Dashboard" + connection status dot
  - Right: FilterBar (Active/Archived checkboxes), session count (`"12 sessions"` or `"8 / 12 sessions"` when filtered), settings gear
- **Session timeline view toolbar:**
  - Left: Back button (← Back) + session title (from `getSessionTitle()`)
  - Right: Tree toggle button, session switcher dropdown (scoped to same directory CWD), settings gear
- Session switcher only renders when `sameDirSessions.length > 1` (no dropdown clutter for single-session directories).
- Consistent styling with existing theme: dark blue header (#16213e), accent color (#e94560), hover effects.

**Layout.tsx (complete rewrite):**
- Removed `sidebar` prop entirely.
- New props: `children`, `connected`, `onOpenSettings`.
- Structure: `<header>` contains `<Toolbar />`, `<main>` contains full-width content area (no sidebar column).
- Removed padding from content area so graphs can use full viewport dimensions.

**FilterBar.tsx (simplified):**
- Removed search input entirely (per user decision: "Search functionality removed from directory view").
- Changed layout from vertical stacked to horizontal single row (`flexDirection: 'row'`, `gap: '10px'`).
- Removed `borderBottom` and reduced padding since it's now embedded inside the toolbar.
- Only renders Active/Archived checkboxes.

**DirectoryOverview.tsx (navigation wiring):**
- Changed session node click handler from `setSelectedSession()` + `setViewMode('graph')` to `enterSession(sessionId, cwd)`.
- Looks up session object to extract `cwd` before calling `enterSession()`.

**App.tsx (major restructure):**
- Removed imports: `SessionList`, `ViewToggle`, `TreeView` (tree becomes panel in plan 02).
- Removed `sidebar` and `headerActions` variables.
- Updated `MainView` component to use `navigationView` instead of `viewMode`:
  - `navigationView === 'directory'` → renders `<DirectoryOverview />`
  - `navigationView === 'session-timeline'` → renders `<GraphView />`
- Moved settings button to Toolbar (via `onOpenSettings` callback prop + `connected` status).
- Layout now takes `connected` and `onOpenSettings` props (passed through to Toolbar).
- Kept: ErrorBoundary, GroupDrillDownPanel, Settings modal, WebSocket handling, notifications, favicon badge, tmux health check.

**Files modified:**
- `client/src/components/Toolbar.tsx` (created)
- `client/src/components/Layout.tsx`
- `client/src/components/FilterBar.tsx`
- `client/src/components/DirectoryOverview.tsx`
- `client/src/App.tsx`

**Verification:**
- Build passes: `npm run build` succeeds with zero TypeScript errors.
- Dev servers running: Frontend (5173) and backend (3847) both operational.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing 'waiting' SessionState type**
- **Found during:** Task 1 verification (TypeScript compilation)
- **Issue:** The `SessionState` type in `shared/src/index.ts` only included `'active' | 'completed'`, but server code was using `'waiting'` state causing TypeScript compilation errors.
- **Fix:** Added `'waiting'` to `SessionState` type definition. Added corresponding color mappings for 'waiting' state (yellow/amber theme) across all node components and status badges.
- **Files modified:**
  - `shared/src/index.ts` - Added 'waiting' to SessionState union type
  - `client/src/components/NodeDetail.tsx` - Added waiting color to STATUS_COLORS
  - `client/src/components/TreeNode.tsx` - Added waiting color to STATUS_COLORS
  - `client/src/components/nodes/SessionNode.tsx` - Added waiting color to STATUS_COLORS
  - `client/src/components/nodes/SkillNode.tsx` - Added waiting color to STATUS_COLORS
  - `client/src/components/nodes/SubagentNode.tsx` - Added waiting color to STATUS_COLORS
  - `client/src/components/nodes/ToolGroupNode.tsx` - Added waiting color to STATUS_COLORS
  - `client/src/components/nodes/ToolNode.tsx` - Added waiting color to STATUS_COLORS
  - `client/src/App.tsx` - Added waiting color to STATE_BADGE_COLORS
- **Rationale:** This was a blocking bug preventing TypeScript compilation. The 'waiting' state is used throughout the codebase (server-side session state management, notification logic) but was never formally defined in the shared type system. Auto-fixed per Deviation Rule 1.

---

## Technical Details

### Navigation State Model

```typescript
export type NavigationView = 'directory' | 'session-timeline';

// Store state
navigationView: NavigationView;           // Current high-level navigation context
treePanelOpen: boolean;                   // Tree panel visibility (plan 02)
focusedNodeId: string | null;             // Tree-to-graph sync (plan 02)
currentDirectoryCwd: string | null;       // Directory context for session switcher
```

### Atomic Navigation Actions

**enterSession(sessionId, cwd):**
- Atomically sets: `navigationView: 'session-timeline'`, `selectedSessionId`, `currentDirectoryCwd`, `viewMode: 'graph'`, `treePanelOpen: false`, `focusedNodeId: null`.
- Preserves `selectedNodeData` and `selectedGroupId` (user may have a drill-down panel open - don't destroy it when entering session).

**exitToDirectory():**
- Atomically sets: `navigationView: 'directory'`, clears session selection, resets tree/focus state, sets `viewMode: 'directory'`.
- **Does** clear `selectedNodeData` and `selectedGroupId` since we're leaving session context entirely.

### Toolbar Rendering Logic

```typescript
if (navigationView === 'directory') {
  // Show: Title, connection dot, filters, session count, settings
}

if (navigationView === 'session-timeline') {
  // Show: Back button, session title, tree toggle, session switcher, settings
  // Session switcher filtered by: sessions.filter(s => s.cwd === currentDirectoryCwd)
}
```

### Session Count Display

- Unfiltered: `"12 sessions"`
- Filtered: `"8 / 12 sessions"` (8 shown of 12 total)
- Uses `getFilteredSessions()` to respect Active/Archived filter state.

---

## Requirements Satisfied

- ✅ **NAV-01:** Directory graph is the main view with no left sidebar session list visible
- ✅ **NAV-02:** Active/archived session filters work in directory graph toolbar
- ✅ **NAV-04 (partial):** Clicking session node navigates to session timeline graph

**Partial NAV-04:** The session node click navigation works end-to-end. Full NAV-04 also requires tmux prompt integration (handled in phase 14).

---

## Key Files

### Created
- `client/src/components/Toolbar.tsx` - Conditional toolbar with directory and session-timeline modes

### Modified
- `client/src/store/sessionStore.ts` - Navigation state and atomic actions
- `client/src/components/Layout.tsx` - Sidebarless layout with toolbar header
- `client/src/components/FilterBar.tsx` - Horizontal Active/Archived filters (search removed)
- `client/src/components/DirectoryOverview.tsx` - Session click handler uses enterSession()
- `client/src/App.tsx` - MainView controlled by navigationView, no sidebar/ViewToggle
- `shared/src/index.ts` - Added 'waiting' to SessionState type
- All node components - Added 'waiting' state color mappings

---

## Architecture Notes

**State separation:**
- `navigationView`: High-level routing (directory vs session-timeline)
- `viewMode`: Low-level component rendering (tree vs graph vs directory)
- These are independent concerns that coexist in the store.

**Toolbar as single source of UI truth:**
- All navigation controls live in Toolbar (no scattered UI state).
- Toolbar reads navigation state and renders appropriate controls.
- Clean separation: Layout provides structure, Toolbar provides navigation UI.

**FilterBar reusability:**
- FilterBar is now a reusable horizontal component (embedded in Toolbar).
- No sidebar dependency - can be used anywhere.

---

## Self-Check: PASSED

**Created files exist:**
```bash
✅ FOUND: client/src/components/Toolbar.tsx
```

**Modified files have expected changes:**
```bash
✅ sessionStore.ts contains navigationView, enterSession, exitToDirectory
✅ Layout.tsx removed sidebar prop, added Toolbar
✅ FilterBar.tsx removed search input, horizontal layout
✅ DirectoryOverview.tsx uses enterSession action
✅ App.tsx uses navigationView for routing, no sidebar
✅ shared/index.ts includes 'waiting' in SessionState
```

**Build verification:**
```bash
✅ npm run build passes with zero errors
✅ Client bundle generated successfully
✅ Dev servers running on ports 5173 (client) and 3847 (server)
```

---

## What's Next (Plan 02)

- Wire tree panel rendering in session-timeline view (when `treePanelOpen === true`)
- Implement tree-to-graph node focus synchronization (using `focusedNodeId`)
- Add tree toggle button functionality
- Handle tree panel state persistence

This plan provides the navigation skeleton. Plan 02 will add the tree panel as an overlay on the session timeline view.
