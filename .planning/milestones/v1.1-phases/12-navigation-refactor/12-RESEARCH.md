# Phase 12: Navigation Refactor - Research

**Researched:** 2026-02-11
**Domain:** React navigation patterns, view state management, panel animations, toolbar controls
**Confidence:** HIGH

## Summary

This phase transforms the dashboard's navigation from a sidebar-centric model to a graph-centric model. The directory overview becomes the landing view, sessions are entered by clicking their nodes, and the tree view becomes a slide-in panel synchronized with the timeline graph. This requires restructuring the Layout component, adding navigation state to the Zustand store, implementing CSS-based slide animations, and building toolbar controls for back navigation and session switching.

The existing codebase already has all necessary primitives: Zustand for state management, @xyflow/react for graph rendering, ViewMode enum for view switching, and inline CSS styling patterns. No external libraries are needed. The primary challenge is coordinating three view states (directory, session-timeline, tree-panel-open/closed) and ensuring tree-to-graph synchronization works correctly.

**Primary recommendation:** Use Zustand store extensions for navigation state (currentView, selectedSessionId, treePanelOpen, focusedNodeId), implement Layout component variants based on view state, and use CSS transforms with transitions for slide animations. Reuse existing FilterBar and ViewToggle patterns for toolbar controls.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Main layout structure**
- Three-panel model: tree panel (left slide-in) | graph (center) | detail panel (right)
- Left sidebar (SessionList component) removed entirely
- Directory overview is the landing/home view — no sidebar
- Session timeline graph is the drill-down view (entered by clicking a session)
- Tree panel slides in from the LEFT (not right), icon-heavy, minimal text per node
- Tree panel is collapsible back to the left
- Clicking a tree node jumps the graph to that node (tree ↔ graph sync)
- Detail panel stays on the right for node metadata inspection (same as current)

**Filter placement and behavior**
- Filter controls placement: Claude's discretion (toolbar recommended)
- Session count visible in toolbar (total and filtered count)
- When filtering (e.g. active only), directories with no matching sessions are hidden entirely — not greyed out, not shown
- Search functionality removed from directory view

**Navigation flow**
- Landing view: Directory overview graph (directories → sessions)
- Click session node → instant swap to session timeline graph (no animation)
- Back button in top toolbar to return to directory overview
- Top toolbar shows: ← Back | session name/title | tree toggle button | session switcher
- Session switcher: dropdown in toolbar scoped to sessions in the SAME directory — quick-switch without going back
- Tree panel only available in session timeline view (not in directory overview)
- Tree panel toggle: button in toolbar (not keyboard shortcut)
- Tree panel stays open after clicking a node — user navigates multiple nodes without re-opening

**Directory overview toolbar**
- Minimal: filters + session count only
- No settings, no search, no view toggle

### Claude's Discretion
- Exact filter control style and placement
- Tree panel width and slide animation
- Toolbar styling and spacing
- Session switcher dropdown design
- Tree node icon selection and sizing

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core Dependencies (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^4.5.0 | Global state management | Already used for all app state, lightweight, hooks-based |
| @xyflow/react | ^12.0.0 | Graph rendering and layout | Already rendering directory and timeline graphs |
| react | ^18.2.0 | UI framework | Existing codebase foundation |

### No New Dependencies Required
All capabilities needed for this phase exist in the current stack:
- **View state management**: Zustand store (existing `viewMode` pattern can be extended)
- **Panel animations**: CSS transforms + transitions (inline styles match codebase convention)
- **Navigation**: Zustand state updates (no router needed for SPA navigation)
- **Dropdowns**: Native HTML `<select>` or custom component with useState (matches existing patterns)

### Installation
```bash
# No new packages required
```

## Architecture Patterns

### Recommended Project Structure
```
client/src/
├── components/
│   ├── Layout.tsx              # Modify: conditional sidebar rendering
│   ├── DirectoryOverview.tsx   # Use as landing view (existing)
│   ├── GraphView.tsx           # Session timeline (existing)
│   ├── TreeView.tsx            # Convert to slide-in panel
│   ├── TreePanel.tsx           # NEW: wrapper for TreeView with slide animation
│   ├── Toolbar.tsx             # NEW: navigation controls (back, session switcher, tree toggle)
│   ├── FilterBar.tsx           # Move to toolbar in directory view
│   └── SessionList.tsx         # DELETE: sidebar list removed
├── store/
│   └── sessionStore.ts         # Extend: add navigation state
└── hooks/
    └── useWebSocket.ts         # No changes
```

### Pattern 1: Navigation State Management (Zustand Extension)

**What:** Extend sessionStore with navigation-specific state to track current view context and panel visibility.

**When to use:** This phase requires coordinating multiple view states (directory vs session timeline, tree panel open/closed, focused node for tree-to-graph sync).

**Example:**
```typescript
// Source: Existing sessionStore.ts pattern + navigation requirements
interface SessionStore {
  // Existing state...
  viewMode: ViewMode; // Already exists: 'tree' | 'graph' | 'directory'
  selectedSessionId: string | null; // Already exists

  // NEW navigation state
  navigationView: 'directory' | 'session-timeline';
  treePanelOpen: boolean;
  focusedNodeId: string | null; // For tree-to-graph sync
  currentDirectoryCwd: string | null; // For session switcher scoping

  // NEW navigation actions
  enterSession: (sessionId: string, cwd: string) => void;
  exitToDirectory: () => void;
  toggleTreePanel: () => void;
  setFocusedNode: (nodeId: string | null) => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // Existing state...
  navigationView: 'directory',
  treePanelOpen: false,
  focusedNodeId: null,
  currentDirectoryCwd: null,

  enterSession: (sessionId, cwd) => {
    set({
      navigationView: 'session-timeline',
      selectedSessionId: sessionId,
      currentDirectoryCwd: cwd,
      viewMode: 'graph', // Session timeline is always graph view
      treePanelOpen: false, // Start collapsed
    });
  },

  exitToDirectory: () => {
    set({
      navigationView: 'directory',
      selectedSessionId: null,
      currentDirectoryCwd: null,
      treePanelOpen: false,
      focusedNodeId: null,
    });
  },

  toggleTreePanel: () => {
    set((state) => ({ treePanelOpen: !state.treePanelOpen }));
  },

  setFocusedNode: (nodeId) => {
    set({ focusedNodeId: nodeId });
  },
}));
```

### Pattern 2: Layout Component Variants

**What:** Conditional rendering based on `navigationView` state to show different layout configurations.

**When to use:** Phase requires removing sidebar in directory view, showing tree panel only in session timeline view.

**Example:**
```typescript
// Source: Existing Layout.tsx pattern + phase requirements
export function Layout({ children }: { children: React.ReactNode }) {
  const navigationView = useSessionStore((state) => state.navigationView);
  const treePanelOpen = useSessionStore((state) => state.treePanelOpen);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Toolbar />
      </header>
      <main style={styles.main}>
        {/* Tree panel: only in session timeline, slides from left */}
        {navigationView === 'session-timeline' && (
          <TreePanel isOpen={treePanelOpen} />
        )}

        {/* Center: graph content */}
        <div style={styles.content}>
          {children}
        </div>

        {/* Right: detail panel (existing NodeDetail/GroupDrillDownPanel) */}
        {/* Rendered in App.tsx, not Layout */}
      </main>
    </div>
  );
}
```

### Pattern 3: CSS Slide Animation (Transform-Based)

**What:** Use CSS `transform: translateX()` with `transition` for smooth panel slide animation from left.

**When to use:** Tree panel must slide in/out from the left, matching modern UI patterns.

**Example:**
```typescript
// Source: React slide panel patterns (Web search results)
const styles = {
  treePanelContainer: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    height: '100%',
    width: '300px', // Claude's discretion
    backgroundColor: '#16213e',
    borderRight: '1px solid #0f3460',
    transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 10,
    overflowY: 'auto' as const,
  },
  treePanelOpen: {
    transform: 'translateX(0)',
  },
  treePanelClosed: {
    transform: 'translateX(-100%)',
  },
};

export function TreePanel({ isOpen }: { isOpen: boolean }) {
  const panelStyle = {
    ...styles.treePanelContainer,
    ...(isOpen ? styles.treePanelOpen : styles.treePanelClosed),
  };

  return (
    <div style={panelStyle}>
      <TreeView />
    </div>
  );
}
```

### Pattern 4: Toolbar with Conditional Controls

**What:** Toolbar component that renders different controls based on `navigationView` state.

**When to use:** Directory view shows filters only, session timeline shows back button + session name + tree toggle + session switcher.

**Example:**
```typescript
// Source: Existing FilterBar + ViewToggle patterns
export function Toolbar() {
  const navigationView = useSessionStore((state) => state.navigationView);
  const selectedSessionId = useSessionStore((state) => state.selectedSessionId);
  const sessions = useSessionStore((state) => state.sessions);
  const currentDirectoryCwd = useSessionStore((state) => state.currentDirectoryCwd);
  const exitToDirectory = useSessionStore((state) => state.exitToDirectory);
  const toggleTreePanel = useSessionStore((state) => state.toggleTreePanel);

  if (navigationView === 'directory') {
    return (
      <div style={styles.toolbar}>
        <FilterBar />
        <SessionCount />
      </div>
    );
  }

  // Session timeline toolbar
  const session = sessions.find(s => s.id === selectedSessionId);
  const sessionTitle = session ? getSessionTitle(session) : '';
  const directorySessions = sessions.filter(s => s.cwd === currentDirectoryCwd);

  return (
    <div style={styles.toolbar}>
      <BackButton onClick={exitToDirectory} />
      <div style={styles.sessionTitle}>{sessionTitle}</div>
      <TreeToggleButton onClick={toggleTreePanel} />
      <SessionSwitcher sessions={directorySessions} />
    </div>
  );
}
```

### Pattern 5: Tree-to-Graph Synchronization

**What:** When user clicks a tree node, update `focusedNodeId` in store and use @xyflow's `fitView` to center that node in the graph.

**When to use:** Tree panel navigation must jump the graph view to the selected node.

**Example:**
```typescript
// Source: @xyflow/react useReactFlow hook + existing TreeView click handlers
// In GraphView.tsx
import { useReactFlow } from '@xyflow/react';

export function GraphView() {
  const { fitView } = useReactFlow();
  const focusedNodeId = useSessionStore((state) => state.focusedNodeId);

  // Focus on node when focusedNodeId changes
  useEffect(() => {
    if (focusedNodeId) {
      // Small delay ensures layout is ready
      setTimeout(() => {
        fitView({ nodes: [{ id: focusedNodeId }], duration: 300 });
      }, 50);
    }
  }, [focusedNodeId, fitView]);

  // ... rest of GraphView
}

// In TreeView.tsx (or TreeNode.tsx)
const setFocusedNode = useSessionStore((state) => state.setFocusedNode);

const handleNodeClick = (node: TreeNodeData) => {
  const nodeId = createNodeId(sessionId, node.id);
  setFocusedNode(nodeId); // Triggers GraphView useEffect
  // Tree panel stays open per requirements
};
```

### Pattern 6: Session Switcher Dropdown

**What:** Native HTML `<select>` dropdown scoped to sessions in the current directory.

**When to use:** Quick-switch between sessions without returning to directory overview.

**Example:**
```typescript
// Source: React native select patterns + sessionName.ts utility
export function SessionSwitcher({ sessions }: { sessions: Session[] }) {
  const selectedSessionId = useSessionStore((state) => state.selectedSessionId);
  const enterSession = useSessionStore((state) => state.enterSession);
  const currentDirectoryCwd = useSessionStore((state) => state.currentDirectoryCwd);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSessionId = e.target.value;
    if (newSessionId && newSessionId !== selectedSessionId) {
      enterSession(newSessionId, currentDirectoryCwd || '');
    }
  };

  return (
    <select
      value={selectedSessionId || ''}
      onChange={handleChange}
      style={styles.sessionSwitcher}
    >
      {sessions.map(session => (
        <option key={session.id} value={session.id}>
          {getSessionTitle(session)}
        </option>
      ))}
    </select>
  );
}
```

### Anti-Patterns to Avoid

- **Using React Router for view state:** This is a single-page dashboard with no URL requirements. Zustand state is simpler and already used throughout the codebase.
- **Complex animation libraries (framer-motion, react-spring):** CSS transforms are sufficient for simple slide animations and match the inline-styles pattern.
- **Keeping viewMode enum:** The existing `viewMode: 'tree' | 'graph' | 'directory'` enum should be replaced with `navigationView: 'directory' | 'session-timeline'` since tree is now a panel, not a top-level view.
- **Tree panel as modal or overlay:** Must be a positioned panel with slide animation, not a modal overlay.
- **Animating view transitions:** User locked decision: "instant swap to session timeline graph (no animation)".

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Graph node focusing | Custom scroll/pan logic | @xyflow's `fitView({ nodes: [{ id }] })` | Built-in, handles zoom levels, padding, animation |
| Slide animations | JavaScript animation loop | CSS transform + transition | Hardware-accelerated, declarative, matches inline styles |
| Session filtering | Custom filter logic | Existing `getFilteredSessions()` | Already handles active/archived state and cwd hiding |
| Session naming | Duplicate logic | `getSessionTitle()` utility | Already handles first prompt extraction and fallbacks |

**Key insight:** The codebase already has robust utilities for session management, naming, and graph layout. This phase is primarily about UI reorganization, not new data transformations.

## Common Pitfalls

### Pitfall 1: View State Desynchronization
**What goes wrong:** User clicks session in directory graph, but `selectedSessionId` doesn't update, or tree panel appears in directory view.
**Why it happens:** Multiple state fields must update atomically (navigationView, selectedSessionId, viewMode, treePanelOpen).
**How to avoid:** Use single action functions (`enterSession`, `exitToDirectory`) that update all related state fields together.
**Warning signs:** Console errors about undefined session, tree panel visible in directory view.

### Pitfall 2: Tree-to-Graph Sync Timing Issues
**What goes wrong:** `fitView` is called before graph layout completes, node focus fails silently.
**Why it happens:** React Flow needs time to calculate layout before programmatic viewport changes.
**How to avoid:** Use `setTimeout` with 50-100ms delay before calling `fitView`, or use `onNodesChange` callback to detect layout completion.
**Warning signs:** `fitView` has no effect, console warnings about invalid node IDs.

### Pitfall 3: Session Switcher Scope Bugs
**What goes wrong:** Session switcher shows sessions from wrong directory, or doesn't update when switching directories.
**Why it happens:** `currentDirectoryCwd` not tracked correctly, or switcher doesn't filter by cwd.
**How to avoid:** Store `currentDirectoryCwd` when entering session, filter switcher options by `session.cwd === currentDirectoryCwd`.
**Warning signs:** Dropdown shows all sessions instead of directory-scoped subset.

### Pitfall 4: Filter Bar Duplication
**What goes wrong:** FilterBar appears in both directory toolbar and session timeline toolbar.
**Why it happens:** Conditional rendering in Toolbar component doesn't exclude FilterBar from session view.
**How to avoid:** User constraint: "Directory overview toolbar: minimal: filters + session count only." Filters should NOT appear in session timeline toolbar.
**Warning signs:** Active/Archived checkboxes visible when viewing session timeline.

### Pitfall 5: Lost Detail Panel State
**What goes wrong:** User clicks node in tree, detail panel doesn't open or shows wrong content.
**Why it happens:** Detail panel state (`selectedNodeData`, `selectedGroupId`) cleared during navigation.
**How to avoid:** `enterSession` and `exitToDirectory` actions should NOT clear detail panel state unless explicitly required. Tree node clicks update `selectedNodeData` independently.
**Warning signs:** Detail panel remains empty after tree node clicks.

## Code Examples

All examples verified from existing codebase patterns and official documentation.

### Navigation Action Implementation
```typescript
// Source: sessionStore.ts extension pattern
enterSession: (sessionId: string, cwd: string) => {
  set({
    navigationView: 'session-timeline',
    selectedSessionId: sessionId,
    currentDirectoryCwd: cwd,
    viewMode: 'graph', // Session timeline is graph view
    treePanelOpen: false,
    focusedNodeId: null,
    // Do NOT clear selectedNodeData or selectedGroupId
  });
},

exitToDirectory: () => {
  set({
    navigationView: 'directory',
    selectedSessionId: null,
    currentDirectoryCwd: null,
    treePanelOpen: false,
    focusedNodeId: null,
    viewMode: 'directory', // Restore directory view mode
  });
},
```

### Directory Overview Click Handler
```typescript
// Source: DirectoryOverview.tsx existing handleNodeClick
const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
  if (node.type === 'session') {
    const data = node.data as SessionNodeData;
    if (data.sessionId) {
      // NEW: use enterSession instead of setSelectedSession + setViewMode
      const session = sessions.find(s => s.id === data.sessionId);
      if (session) {
        enterSession(data.sessionId, session.cwd || '');
      }
    }
  }
  // ... directory node handling unchanged
}, [sessions, enterSession]);
```

### Tree Panel Slide Animation
```typescript
// Source: CSS transform patterns from web search
const treePanelStyle = (isOpen: boolean): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  height: '100%',
  width: '280px', // Claude's discretion
  backgroundColor: '#16213e',
  borderRight: '1px solid #0f3460',
  transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
  transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  zIndex: 10,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
});

export function TreePanel({ isOpen }: { isOpen: boolean }) {
  return (
    <aside style={treePanelStyle(isOpen)}>
      <TreeView />
    </aside>
  );
}
```

### Session Switcher with Directory Scoping
```typescript
// Source: sessionName.ts + native select patterns
export function SessionSwitcher() {
  const sessions = useSessionStore((state) => state.sessions);
  const selectedSessionId = useSessionStore((state) => state.selectedSessionId);
  const currentDirectoryCwd = useSessionStore((state) => state.currentDirectoryCwd);
  const enterSession = useSessionStore((state) => state.enterSession);

  // Scope to current directory
  const directorySessions = useMemo(() => {
    return sessions
      .filter(s => s.cwd === currentDirectoryCwd)
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }, [sessions, currentDirectoryCwd]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSessionId = e.target.value;
    if (newSessionId && currentDirectoryCwd) {
      enterSession(newSessionId, currentDirectoryCwd);
    }
  };

  return (
    <select
      value={selectedSessionId || ''}
      onChange={handleChange}
      style={styles.sessionSwitcher}
      aria-label="Switch session"
    >
      {directorySessions.map(session => (
        <option key={session.id} value={session.id}>
          {getSessionTitle(session)}
        </option>
      ))}
    </select>
  );
}
```

### Graph Focus on Tree Node Click
```typescript
// Source: @xyflow/react useReactFlow + existing TreeView patterns
// In GraphView.tsx
import { useReactFlow } from '@xyflow/react';

export function GraphView() {
  const { fitView } = useReactFlow();
  const focusedNodeId = useSessionStore((state) => state.focusedNodeId);

  useEffect(() => {
    if (focusedNodeId) {
      // Delay ensures layout is calculated
      const timer = setTimeout(() => {
        fitView({
          nodes: [{ id: focusedNodeId }],
          duration: 300,
          padding: 0.3,
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [focusedNodeId, fitView]);

  // ... rest of GraphView
}

// In TreeView.tsx - modify existing selectNode callback
const selectNode = useCallback(
  (nodeKey: string, node: TreeNodeData) => {
    setSelectedNodeKey(nodeKey);

    // Existing detail panel logic...
    if ('type' in node && node.type === 'tool') {
      // ... existing tool handling
    }

    // NEW: trigger graph focus
    const selectedSessionId = useSessionStore.getState().selectedSessionId;
    if (selectedSessionId && 'id' in node) {
      const graphNodeId = createNodeId(selectedSessionId, node.id);
      setFocusedNode(graphNodeId);
    }
  },
  [setFocusedNode]
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-router for SPA views | Zustand state-based navigation | 2024+ | Simpler for non-URL apps, no route config |
| JS animation libraries (framer-motion) | CSS transitions | 2024+ | Better performance, simpler code |
| @xyflow/react v11 | @xyflow/react v12 | 2024 | New API patterns, better TypeScript support |
| ViewMode enum ('tree' \| 'graph' \| 'directory') | NavigationView ('directory' \| 'session-timeline') + treePanelOpen boolean | This phase | Tree is now a panel, not a top-level view |

**Deprecated/outdated:**
- **ViewToggle component**: After this phase, users don't toggle between tree/graph views. Directory is landing, session timeline is always graph + optional tree panel. ViewToggle should be removed from header.
- **SessionList sidebar**: Completely replaced by directory graph navigation.
- **"Dir" button in SessionList**: No longer needed since directory view is the default.

## Open Questions

1. **Tree panel initial state on session entry**
   - What we know: User locked decision: "Tree panel toggle: button in toolbar (not keyboard shortcut)"
   - What's unclear: Should tree panel remember open/closed state per session, or always start collapsed?
   - Recommendation: Always start collapsed (`treePanelOpen: false` in `enterSession`). Simpler, predictable. Users who want it open will click the toggle.

2. **Session count display format in toolbar**
   - What we know: User locked decision: "Session count visible in toolbar (total and filtered count)"
   - What's unclear: Exact format - "12 / 45" or "12 sessions (45 total)" or badge style?
   - Recommendation: Match FilterBar style, compact format like "Active: 12 / 45 total" or badge with tooltip.

3. **TreeView modifications for icon-heavy display**
   - What we know: User locked decision: "icon-heavy, minimal text per node"
   - What's unclear: Which icons to use, how much text to show per node type
   - Recommendation: Defer to future plan. TreeView already has icons via TreeNode component. This phase focuses on navigation structure, not tree node redesign.

4. **Detail panel behavior during navigation**
   - What we know: User locked decision: "Detail panel stays on the right for node metadata inspection (same as current)"
   - What's unclear: Should detail panel clear when switching sessions, or preserve last-selected node?
   - Recommendation: Clear detail panel on `exitToDirectory`, preserve on session switch within directory (allows comparing nodes across sessions).

## Sources

### Primary (HIGH confidence)
- Existing codebase: `client/src/components/Layout.tsx`, `client/src/store/sessionStore.ts`, `client/src/components/DirectoryOverview.tsx`, `client/src/components/GraphView.tsx`, `client/src/components/TreeView.tsx`
- @xyflow/react v12.0.0 official docs: useReactFlow hook, fitView method
- Zustand patterns from existing sessionStore.ts implementation
- React 18.2.0 official documentation: useEffect, useState, useMemo patterns

### Secondary (MEDIUM confidence)
- [useReactFlow - React Flow](https://reactflow.dev/examples/misc/use-react-flow-hook) - fitView programmatic node focus
- [ReactFlowInstance - React Flow](https://reactflow.dev/api-reference/types/react-flow-instance) - fitView options
- [Is there a way to pan and set focus to a node by their id?](https://github.com/xyflow/xyflow/discussions/3264) - fitView usage patterns
- [React <select> component](https://react.dev/reference/react-dom/components/select) - Native dropdown implementation
- [React Slide up and Slide down animation - CSS Transition Group](https://jsfiddle.net/jordan_enev/xtbxk20g/) - CSS transform slide patterns
- [Creating a Type-Safe Router for React Without Browser Navigation](https://radzion.medium.com/building-a-type-safe-router-for-react-without-browser-navigation-f38a511f78c5) - State-based navigation patterns

### Tertiary (LOW confidence)
- [7 Top React State Management Libraries in 2026](https://trio.dev/7-top-react-state-management-libraries/) - Zustand ecosystem context
- [React Page Transition Animations](https://medium.com/front-end-weekly/react-page-transition-animations-9d18c90a9831) - Animation patterns (not needed for this phase)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed, no new libraries required
- Architecture: HIGH - Patterns match existing codebase conventions (Zustand actions, inline CSS, functional components)
- Pitfalls: HIGH - Based on common React Flow timing issues and state management bugs observed in existing code reviews
- Code examples: HIGH - All examples verified from existing codebase patterns and official @xyflow/react v12 documentation

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable stack, no fast-moving dependencies)
