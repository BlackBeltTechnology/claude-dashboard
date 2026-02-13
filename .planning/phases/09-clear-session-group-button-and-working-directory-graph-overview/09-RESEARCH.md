# Phase 9: Clear Session Group Button and Working Directory Graph Overview - Research

**Researched:** 2026-02-09
**Domain:** React UI Enhancement / Graph Visualization / State Management
**Confidence:** HIGH - Based on comprehensive codebase analysis

## Summary

Phase 9 introduces two distinct UI/UX enhancements to the Claude Session Dashboard:

**Feature 1: Clear Session Group Button**
- Adds a clear/remove button to each working directory group in SessionList
- Allows users to remove all sessions from a specific working directory with one click
- Requires new Zustand store action and potential server-side session management
- Group header modification with hover state and confirmation dialog

**Feature 2: Working Directory Graph Overview**
- Creates a new visualization mode showing working directories as primary nodes
- Each directory node connects to its sessions, which connect to their tool calls
- Provides high-level overview of session distribution across directories
- Three implementation options: MiniMap enhancement, separate view mode, or graph overlay

**Primary recommendation:** Implement both features using existing React Flow + Zustand stack. Add store action for session removal by cwd. Create new `DirectoryOverview` component as third view mode option alongside tree/graph views.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|-------------|
| React | 18.2.0 | UI framework | Already used throughout; component-based architecture |
| TypeScript | 5.3.3 | Type safety | Already enabled in strict mode across all packages |
| Zustand | 4.5.0 | State management | Already managing session state; add new actions |
| @xyflow/react | 12.0.0 | Graph visualization | Already rendering sessions as graphs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dagre | 0.8.5 | Layout algorithm | Already positioning nodes; extend for directory layout |
| React Hook Form | - | Form handling | For confirmation dialogs (lightweight alternative to full form library) |

### Implementation Notes

**React Flow Version 12.0.0** is already in use and provides:
- MiniMap component for overview visualization
- fitView() and fitViewOptions() for zoom-to-fit
- Node types system for custom node rendering
- Viewport controls for navigation

**No additional dependencies required** - all features can be built with existing stack.

## Architecture Patterns

### Recommended Project Structure
```
client/src/
├── components/
│   ├── DirectoryOverview.tsx          # NEW: Directory-centric graph view
│   ├── SessionList.tsx               # MODIFY: Add clear button to group headers
│   └── nodes/
│       ├── DirectoryNode.tsx         # NEW: Custom node for directories
│       └── index.ts                  # EXPORT: DirectoryNode
├── store/
│   └── sessionStore.ts              # MODIFY: Add clearSessionsByCwd action
└── utils/
    ├── directoryGraphLayout.ts      # NEW: Layout algorithm for directory view
    └── groupingUtils.ts             # EXISTING: Reuse for directory grouping
```

### Pattern 1: Session Group Clear Action
**What:** Store action to remove sessions by working directory

**When to use:** When user clicks clear button in session group header

**Example:**
```typescript
// In sessionStore.ts
clearSessionsByCwd: (cwd: string) => void;

// Implementation
clearSessionsByCwd: (cwd) => {
  set((state) => ({
    sessions: state.sessions.filter((s) => s.cwd !== cwd)
  }));
}
```

### Pattern 2: Directory-Overview Graph Layout
**What:** Layout algorithm that positions directories as top-level nodes, sessions as children

**When to use:** When rendering directory overview graph view

**Example:**
```typescript
// Create layouted graph for directory overview
export function createDirectoryOverviewGraph(
  sessions: Session[],
  expandedGroups: Set<string>
): GraphData {
  // Group sessions by cwd
  const directoryGroups = groupSessionsByCwd(sessions);

  // Create directory nodes
  // Create session nodes under each directory
  // Create tool nodes under each session
  // Apply dagre layout

  return { nodes: layoutedNodes, edges };
}
```

### Pattern 3: Confirmation Dialog
**What:** Modal dialog before destructive actions

**When to use:** Before clearing a session group (destructive action)

**Example:**
```typescript
// Simple confirmation before clear
const confirmed = window.confirm(
  `Remove all ${sessionCount} sessions from ${directoryName}? This cannot be undone.`
);
if (confirmed) {
  clearSessionsByCwd(cwd);
}
```

### Anti-Patterns to Avoid
- **Don't modify server-side session files** - Dashboard is read-only view; clearing should only affect UI state
- **Don't create new WebSocket message types** - Session removal is client-side only
- **Don't mix directory view with tree/graph view** - Keep as separate view mode for clarity
- **Don't auto-clear without confirmation** - Always confirm destructive actions

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Layout algorithm | Custom positioning | dagre 0.8.5 | Already integrated; handles hierarchical layout automatically |
| Confirmation dialog | Custom modal system | window.confirm() | Simple, native, no additional dependencies |
| Graph rendering | Canvas/SVG from scratch | @xyflow/react 12.0.0 | Already used; provides interactions, pan/zoom, minimap |
| State management | Custom store | Zustand 4.5.0 | Already managing sessions; adding one action is trivial |

**Key insight:** All required functionality exists in current stack. No need for additional libraries or custom implementations.

## Common Pitfalls

### Pitfall 1: State Desynchronization After Clear
**What goes wrong:** After clearing sessions by cwd, server continues to send updates for those sessions via WebSocket, causing removed sessions to reappear

**Why it happens:** Server watches file system and broadcasts all sessions; client removes from local state but server keeps sending

**How to avoid:** Add session filtering in store getter instead of removing from sessions array
```typescript
// BAD: Removes from state
clearSessionsByCwd: (cwd) => {
  set((state) => ({
    sessions: state.sessions.filter((s) => s.cwd !== cwd)
  }));
}

// GOOD: Filters in getter
hideSessionsByCwd: (cwd) => {
  set((state) => ({
    hiddenCwds: new Set([...state.hiddenCwds, cwd])
  }));
}

getFilteredSessions: () => {
  const { sessions, hiddenCwds } = get();
  return sessions.filter((s) => !hiddenCwds.has(s.cwd || ''));
}
```

**Warning signs:** Sessions reappear after WebSocket message; console shows sessions being added then immediately removed

### Pitfall 2: MiniMap Performance with Large Graphs
**What goes wrong:** MiniMap becomes slow or unusable with many directories and sessions

**Why it happens:** React Flow renders all nodes in MiniMap by default

**How to avoid:** Use nodeColor and nodeStrokeWidth callbacks to optimize MiniMap rendering
```typescript
<MiniMap
  nodeColor={(node) => {
    // Only color directory nodes distinctly
    return node.type === 'directory' ? '#e94560' : '#4b5563';
  }}
  nodeStrokeWidth={(node) => {
    // Make directories more visible
    return node.type === 'directory' ? 3 : 0;
  }}
/>
```

**Warning signs:** Slow frame rates during pan/zoom; MiniMap lag when moving main viewport

### Pitfall 3: Infinite Re-renders in Directory Layout
**What goes wrong:** Component re-renders continuously when computing directory graph

**Why it happens:** Layout computation without useMemo or dependency array issues

**How to avoid:** Memoize layout computation with proper dependencies
```typescript
const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
  () => createDirectoryOverviewGraph(sessions, expandedGroups),
  [sessions, expandedGroups]
);
```

**Warning signs:** High CPU usage; rapid console logs; browser tab becomes unresponsive

### Pitfall 4: Button Placement Confusion
**What goes wrong:** Clear button conflicts with group expand/collapse toggle

**Why it happens:** Both attached to group header click handler

**How to avoid:** Use separate click target or right-click menu
```typescript
// GOOD: Separate icon button
<div style={styles.groupHeader} onClick={() => setExpanded(!isExpanded)}>
  <span style={styles.groupChevron}>{chevron}</span>
  <span style={styles.groupTitle}>{cwdDisplayName}</span>
  <IconButton
    onClick={(e) => {
      e.stopPropagation();
      handleClearGroup(cwd);
    }}
    icon="×"
    title="Clear sessions in this directory"
  />
</div>
```

**Warning signs:** Clicking clear also expands/collapses group; unclear which action will trigger

## Code Examples

### Session Group Clear Button
```tsx
// In SessionList.tsx - CollapsibleSessionGroup component
function CollapsibleSessionGroup({ cwd, sessions, ... }: CollapsibleSessionGroupProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const clearSessionsByCwd = useSessionStore((state) => state.clearSessionsByCwd);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger group expand/collapse
    const confirmed = window.confirm(
      `Remove all ${sessions.length} sessions from ${getCwdDisplayName(cwd)}? This cannot be undone.`
    );
    if (confirmed) {
      clearSessionsByCwd(cwd);
    }
  };

  return (
    <div>
      <div
        style={styles.groupHeader}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span style={styles.groupChevron}>{isExpanded ? '▼' : '▶'}</span>
        <span style={styles.groupTitle}>{getCwdDisplayName(cwd)}</span>
        <span style={styles.groupCount}>({sessions.length})</span>

        {/* Clear button - only show on hover */}
        {isHovered && (
          <button
            style={styles.clearButton}
            onClick={handleClear}
            title="Clear all sessions in this directory"
          >
            Clear
          </button>
        )}
      </div>
      {isExpanded && (
        <div style={styles.groupContent}>
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              displayName={displayNames.get(session.id) || session.id}
              isSelected={selectedSessionId === session.id}
              onClick={() => onSessionSelect(session.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Directory Node Component
```tsx
// client/src/components/nodes/DirectoryNode.tsx
import React from 'react';
import { Handle, Position } from '@xyflow/react';

export interface DirectoryNodeData {
  label: string;
  sessionCount: number;
  cwd: string;
}

export function DirectoryNode({ data }: { data: DirectoryNodeData }) {
  return (
    <div style={{
      padding: '12px 16px',
      backgroundColor: '#16213e',
      border: '2px solid #0f3460',
      borderRadius: '8px',
      minWidth: '180px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#93c5fd',
        marginBottom: '4px',
      }}>
        {data.label}
      </div>
      <div style={{
        fontSize: '11px',
        color: '#888',
      }}>
        {data.sessionCount} session{data.sessionCount !== 1 ? 's' : ''}
      </div>

      {/* Output handle for sessions */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#93c5fd',
          width: '8px',
          height: '8px',
        }}
      />
    </div>
  );
}
```

### Directory Overview Graph View
```tsx
// client/src/components/DirectoryOverview.tsx
import React, { useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DirectoryNode } from './nodes/DirectoryNode';
import { SessionNode } from './nodes/SessionNode';
import { useSessionStore } from '../store/sessionStore';
import { createDirectoryOverviewGraph } from '../utils/directoryGraphLayout';

const nodeTypes = {
  directory: DirectoryNode,
  session: SessionNode,
};

export function DirectoryOverview() {
  const sessions = useSessionStore((state) => state.sessions);
  const expandedGroups = useSessionStore((state) => state.expandedGroups);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => createDirectoryOverviewGraph(sessions, expandedGroups),
    [sessions, expandedGroups]
  );

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#1a1a2e' }}>
      <ReactFlow
        nodes={layoutedNodes}
        edges={layoutedEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Controls
          position="bottom-right"
          style={{ backgroundColor: '#16213e', border: '1px solid #0f3460' }}
        />
        <MiniMap
          position="bottom-left"
          style={{ backgroundColor: '#16213e' }}
          nodeColor={(node) => {
            return node.type === 'directory' ? '#93c5fd' : '#4b5563';
          }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#2a2a4e"
        />
      </ReactFlow>
    </div>
  );
}
```

### Store Action for Session Hiding
```typescript
// In client/src/store/sessionStore.ts
interface SessionStore {
  // ... existing state
  hiddenCwds: Set<string>;  // NEW: Track hidden working directories

  // ... existing actions
  hideSessionsByCwd: (cwd: string) => void;  // NEW
  unhideAllCwds: () => void;  // NEW
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // ... existing state
  hiddenCwds: new Set<string>(),

  // NEW: Hide sessions by working directory (UI only)
  hideSessionsByCwd: (cwd) => {
    set((state) => ({
      hiddenCwds: new Set([...state.hiddenCwds, cwd])
    }));
  },

  // NEW: Show all hidden directories again
  unhideAllCwds: () => {
    set({ hiddenCwds: new Set<string>() });
  },

  // ... existing methods
}));
```

### Layout Utility for Directory Overview
```typescript
// client/src/utils/directoryGraphLayout.ts
import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { Session } from 'shared';

interface DirectoryGraphData {
  nodes: Node[];
  edges: Edge[];
}

export function createDirectoryOverviewGraph(
  sessions: Session[],
  expandedGroups: Set<string>
): DirectoryGraphData {
  // Group sessions by working directory
  const cwdGroups = new Map<string, Session[]>();
  for (const session of sessions) {
    const cwd = session.cwd || '__no_cwd__';
    const existing = cwdGroups.get(cwd);
    if (existing) {
      existing.push(session);
    } else {
      cwdGroups.set(cwd, [session]);
    }
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nodeIndex = 0;

  // Create directory nodes
  for (const [cwd, sessionList] of cwdGroups) {
    const dirName = cwd === '__no_cwd__' ? 'Unknown' : cwd.split('/').pop();

    nodes.push({
      id: `directory-${nodeIndex++}`,
      type: 'directory',
      position: { x: 0, y: 0 }, // Will be positioned by dagre
      data: {
        label: dirName,
        sessionCount: sessionList.length,
        cwd,
      },
    });

    const directoryNodeId = `directory-${nodeIndex - 1}`;

    // Create session nodes under this directory
    for (const session of sessionList) {
      const sessionNodeId = `session-${session.id}`;

      nodes.push({
        id: sessionNodeId,
        type: 'session',
        position: { x: 0, y: 0 },
        data: {
          label: session.summary || `Session ${session.id.slice(0, 8)}`,
          state: session.state,
          sessionId: session.id,
        },
      });

      // Edge from directory to session
      edges.push({
        id: `e-${directoryNodeId}-${sessionNodeId}`,
        source: directoryNodeId,
        target: sessionNodeId,
        type: 'smoothstep',
        style: { stroke: '#93c5fd', strokeWidth: 2 },
      });
    }
  }

  // Apply dagre layout
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'LR',
    nodesep: 100,
    ranksep: 150,
    marginx: 20,
    marginy: 20,
  });

  nodes.forEach((node) => {
    const isDirectory = node.type === 'directory';
    dagreGraph.setNode(node.id, {
      width: isDirectory ? 200 : 180,
      height: isDirectory ? 80 : 60,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  // Apply positions
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const dimensions = node.type === 'directory'
      ? { width: 200, height: 80 }
      : { width: 180, height: 60 };

    node.position = {
      x: nodeWithPosition.x - dimensions.width / 2,
      y: nodeWithPosition.y - dimensions.height / 2,
    };
  });

  return { nodes, edges };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sessions displayed linearly | Group sessions by working directory | Phase 3 | Better organization, collapsible groups |
| Tool calls inline | Group consecutive tool calls | Phase 1 | Cleaner visualization, less noise |
| Full session detail in graph | Horizontal timeline with subagent convergence | Phase 7 | Better flow visualization, fork-join pattern |
| Basic MiniMap | Customized MiniMap with type-based colors | Phase 8 | Better navigation, visual clarity |

**Current status:** Directory grouping exists in SessionList (sidebar), but no equivalent in graph view. Phase 9 creates parity between tree and graph views for directory-based navigation.

**Deprecated/outdated:**
- Single-session view only (before Phase 3) - now groups by directory
- No tool grouping (before Phase 1) - now groups consecutive tool calls

## Open Questions

1. **Should clearing sessions persist across page refreshes?**
   - Current recommendation: No - keep in-memory only (Zustand state)
   - Rationale: Dashboard is read-only view of file system; clearing is temporary UX convenience
   - If persistence needed: Add server-side endpoint to toggle session visibility

2. **Should directory overview be a separate view mode or integrated into existing graph?**
   - Recommendation: Separate view mode ("tree", "graph", "directory")
   - Rationale: Different enough visualization to warrant separate mode
   - Alternative: Toggle button in graph view header (more crowded UI)

3. **How many directories/sessions before MiniMap becomes unusable?**
   - Need to test: Performance testing with 10+ directories, 50+ sessions
   - Current stack (React Flow 12.0.0 + dagre 0.8.5) should handle this well
   - Fallback: Add "simplified MiniMap" mode for large datasets

4. **Should clear button have different states (disabled when no sessions, visible only on hover)?**
   - Recommendation: Visible on hover, disabled when no sessions
   - Rationale: Reduces UI clutter, clear affordance when needed

5. **Should working directory graph show full session details or just directory → session → top-level tools?**
   - Recommendation: Directory → Session → (expandable) Tools
   - Rationale: Balance between overview and detail
   - Can expand session nodes to show tools (similar to existing tool group expansion)

## Sources

### Primary (HIGH confidence)
- React Flow 12.0.0 Documentation - https://reactflow.dev/ - Features verified in existing GraphView.tsx
- Zustand 4.5.0 State Management - https://github.com/pmndrs/zustand - Patterns from existing sessionStore.ts
- dagre 0.8.5 Layout Algorithm - https://github.com/dagrejs/dagre - Already integrated in graphLayout.ts

### Secondary (MEDIUM confidence)
- Existing Phase 3 implementation - Session grouping by cwd in SessionList.tsx
- Existing Phase 7 implementation - Horizontal timeline graph with subagent convergence
- Existing Phase 8 implementation - Tree view fixes and subagent highlighting

### Tertiary (LOW confidence)
- Performance characteristics of React Flow MiniMap with large graphs - Requires validation testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, no new dependencies
- Architecture: HIGH - Clear patterns from existing codebase (SessionList grouping, GraphView rendering)
- Pitfalls: HIGH - Common React/Zustand issues with well-known solutions
- Code examples: HIGH - Based on existing components and patterns

**Research date:** 2026-02-09
**Valid until:** 2026-04-09 (stack unlikely to change; React Flow minor versions compatible)

**Dependencies:**
- Phase 3 (Session identification with working directories) - Already implemented
- Phase 8 (Tree view fixes) - Already implemented
- No blocking dependencies for Phase 9

**Ready for Planning:** Yes - All technical questions answered, implementation path clear
