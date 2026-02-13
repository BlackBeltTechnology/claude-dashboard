# Architecture Research

**Domain:** React Dashboard with @xyflow/react + Zustand
**Researched:** 2026-02-06
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React)                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ TreeView │  │GraphView │  │SidePanel │  │ Settings │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
│       └─────────────┴─────────────┴─────────────┘           │
│                         │                                    │
├─────────────────────────┼────────────────────────────────────┤
│                   Zustand Store                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ sessions[], selectedSessionId, panelState, ...       │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                  WebSocket Hook                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ useWebSocket → handleMessage → updateStore           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ WebSocket
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Node + Express)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │SessionMgr   │  │WSManager    │  │FileWatcher  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
├─────────┴────────────────┴────────────────┴─────────────────┤
│                     Session Parser                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ parseJSONL → buildNodes → determineState             │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Filesystem (JSONL)                        │
│  ~/.claude/projects/{hash}/{sessionId}.jsonl                 │
│  ~/.claude/projects/{hash}/{sessionId}/subagents/*.jsonl     │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| TreeView | Recursive hierarchy rendering | React recursive components with expand/collapse state |
| GraphView | Flow diagram with dagre layout | @xyflow/react with custom node types |
| SidePanel | Drill-down detail view for grouped items | Sliding panel with conditional rendering |
| Zustand Store | Global state management | Immutable state updates with selectors |
| WebSocketManager | Broadcast state updates | ws library with event handlers |
| SessionParser | Parse JSONL files into Session objects | Line-by-line parser with error tolerance |
| FileWatcher | Detect file changes | chokidar with debouncing |

## Recommended Project Structure

```
client/src/
├── components/
│   ├── nodes/              # @xyflow/react custom nodes
│   │   ├── SessionNode.tsx
│   │   ├── ToolNode.tsx
│   │   ├── SkillNode.tsx
│   │   ├── SubagentNode.tsx
│   │   └── ToolGroupNode.tsx    # NEW: Grouped tool node
│   ├── panels/             # NEW: Side panel components
│   │   ├── SidePanel.tsx        # NEW: Main panel container
│   │   └── ToolGroupPanel.tsx   # NEW: Tool group drill-down
│   ├── GraphView.tsx
│   ├── TreeView.tsx
│   └── ...
├── store/
│   └── sessionStore.ts     # Zustand store
├── utils/
│   ├── graphLayout.ts      # dagre layout logic
│   └── grouping.ts         # NEW: Tool grouping logic
└── hooks/
    ├── useWebSocket.ts
    └── useSidePanel.ts     # NEW: Panel state management

shared/src/
└── index.ts                # TypeScript interfaces
    ├── Session, AnyNode, etc.
    └── ToolGroup            # NEW: Grouped tool type

server/src/
├── session-discovery.ts    # File scanning + parsing
├── jsonl-parser.ts         # JSONL parsing
├── websocket.ts            # WebSocket server
└── index.ts                # Express + WS setup
```

### Structure Rationale

- **components/nodes/**: Each node type is isolated for @xyflow/react's `nodeTypes` prop
- **components/panels/**: Side panel components are separate from main views for clarity
- **utils/grouping.ts**: Tool grouping logic is pure function (testable, reusable)
- **shared/**: Type definitions shared between client and server prevent drift

## Architectural Patterns

### Pattern 1: Server-Side Grouping vs Client-Side Grouping

**What:** Deciding where tool call grouping logic lives

**Recommendation:** **Client-side grouping** for this use case

**When to use:**
- Server-side: When grouping is expensive, affects multiple clients, or requires persistence
- Client-side: When grouping is lightweight, view-specific, or user-configurable

**Trade-offs:**

| Aspect | Server-Side | Client-Side |
|--------|------------|-------------|
| Performance | One computation, broadcast to all | Each client computes independently |
| Flexibility | Hard to customize per-user | Easy to add filters/preferences |
| Network | Sends less data (grouped) | Sends raw data (larger payload) |
| Complexity | More server logic | More client logic |
| Caching | Server can cache groups | Client recalculates on state change |

**Rationale for client-side:**
1. Current architecture already sends full `Session` objects to clients
2. Grouping rules may need user preferences (group by time window, parallel execution, etc.)
3. Grouping is fast (linear scan over nodes array)
4. Keeps server simple (just parse JSONL → broadcast)

**Example client-side grouping:**
```typescript
// client/src/utils/grouping.ts
import type { AnyNode, ToolNode } from 'shared';

export interface ToolGroup {
  id: string;
  type: 'tool-group';
  toolNodes: ToolNode[];
  parentId: string | null;
  state: SessionState;
  timestamp: number;
  groupReason: 'parallel' | 'sequential' | 'same-parent';
}

export function groupToolCalls(nodes: AnyNode[]): (AnyNode | ToolGroup)[] {
  const result: (AnyNode | ToolGroup)[] = [];
  const toolNodes: ToolNode[] = nodes.filter(n => n.type === 'tool') as ToolNode[];

  // Group consecutive tool calls with same parentId and within time window
  let currentGroup: ToolNode[] = [];
  let lastParent: string | null = null;
  let lastTimestamp = 0;

  for (const tool of toolNodes) {
    const timeDiff = tool.timestamp - lastTimestamp;

    // Start new group if parent changed or time gap > 5s
    if (tool.parentId !== lastParent || timeDiff > 5000) {
      if (currentGroup.length > 1) {
        result.push(createToolGroup(currentGroup));
      } else if (currentGroup.length === 1) {
        result.push(currentGroup[0]);
      }
      currentGroup = [tool];
    } else {
      currentGroup.push(tool);
    }

    lastParent = tool.parentId;
    lastTimestamp = tool.timestamp;
  }

  // Push remaining group
  if (currentGroup.length > 1) {
    result.push(createToolGroup(currentGroup));
  } else if (currentGroup.length === 1) {
    result.push(currentGroup[0]);
  }

  // Add non-tool nodes
  result.push(...nodes.filter(n => n.type !== 'tool'));

  // Sort by timestamp
  return result.sort((a, b) => a.timestamp - b.timestamp);
}

function createToolGroup(tools: ToolNode[]): ToolGroup {
  return {
    id: `group-${tools.map(t => t.id).join('-')}`,
    type: 'tool-group',
    toolNodes: tools,
    parentId: tools[0].parentId,
    state: tools.some(t => t.state === 'active') ? 'active' : 'completed',
    timestamp: tools[0].timestamp,
    groupReason: detectGroupReason(tools),
  };
}

function detectGroupReason(tools: ToolNode[]): 'parallel' | 'sequential' | 'same-parent' {
  const timestamps = tools.map(t => t.timestamp);
  const maxDiff = Math.max(...timestamps) - Math.min(...timestamps);

  // Parallel if all within 100ms
  if (maxDiff < 100) return 'parallel';

  // Sequential if timestamps are ordered
  const isSequential = timestamps.every((t, i) => i === 0 || t >= timestamps[i - 1]);
  if (isSequential) return 'sequential';

  return 'same-parent';
}
```

### Pattern 2: Side Panel State Integration with Zustand

**What:** How to manage side panel open/close state and drill-down content

**When to use:** When you need coordinated state between graph/tree clicks and panel display

**Trade-offs:**
- **Zustand store:** Global state, easy to access from any component, but can bloat store
- **Local component state:** Simpler, but harder to coordinate with external triggers

**Recommendation:** **Zustand store with panel-specific slice**

**Example:**
```typescript
// client/src/store/sessionStore.ts (additions)

interface PanelState {
  isOpen: boolean;
  panelType: 'node-detail' | 'tool-group' | null;
  panelData: AnyNode | ToolGroup | null;
}

interface SessionStore {
  // ... existing state

  panelState: PanelState;

  // Actions
  openPanel: (type: PanelState['panelType'], data: PanelState['panelData']) => void;
  closePanel: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // ... existing state

  panelState: {
    isOpen: false,
    panelType: null,
    panelData: null,
  },

  openPanel: (type, data) => {
    set({ panelState: { isOpen: true, panelType: type, panelData: data } });
  },

  closePanel: () => {
    set({ panelState: { isOpen: false, panelType: null, panelData: null } });
  },
}));
```

### Pattern 3: @xyflow/react Node Click → Panel Open Flow

**What:** How to handle node clicks in GraphView and trigger side panel

**When to use:** When graph nodes need to trigger side UI updates

**Data flow:**
```
User clicks ToolGroupNode
    ↓
onNodeClick handler (GraphView)
    ↓
useSessionStore().openPanel('tool-group', groupData)
    ↓
SidePanel component reads panelState from store
    ↓
Conditional render: <ToolGroupPanel data={panelState.panelData} />
```

**Example:**
```typescript
// client/src/components/GraphView.tsx (additions)

import { useSessionStore } from '../store/sessionStore';

export function GraphView() {
  const openPanel = useSessionStore((state) => state.openPanel);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === 'tool-group') {
        // Open side panel with group details
        openPanel('tool-group', node.data);
      } else if (node.type === 'tool') {
        openPanel('node-detail', node.data);
      }
    },
    [openPanel]
  );

  return (
    <div style={styles.container}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        // ...
      />
      <SidePanel /> {/* Reads panelState from store */}
    </div>
  );
}
```

```typescript
// client/src/components/panels/SidePanel.tsx

import { useSessionStore } from '../../store/sessionStore';
import { ToolGroupPanel } from './ToolGroupPanel';

export function SidePanel() {
  const panelState = useSessionStore((state) => state.panelState);
  const closePanel = useSessionStore((state) => state.closePanel);

  if (!panelState.isOpen) return null;

  return (
    <div style={styles.overlay} onClick={closePanel}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeButton} onClick={closePanel}>✕</button>

        {panelState.panelType === 'tool-group' && (
          <ToolGroupPanel group={panelState.panelData} />
        )}

        {panelState.panelType === 'node-detail' && (
          <NodeDetailPanel node={panelState.panelData} />
        )}
      </div>
    </div>
  );
}
```

```typescript
// client/src/components/panels/ToolGroupPanel.tsx

import type { ToolGroup } from '../../utils/grouping';

interface ToolGroupPanelProps {
  group: ToolGroup;
}

export function ToolGroupPanel({ group }: ToolGroupPanelProps) {
  return (
    <div>
      <h3>{group.toolNodes.length} Tool Calls</h3>
      <p>Group reason: {group.groupReason}</p>

      <div style={styles.toolList}>
        {group.toolNodes.map((tool) => (
          <div key={tool.id} style={styles.toolCard}>
            <strong>{tool.toolName}</strong>
            <pre>{JSON.stringify(tool.input, null, 2)}</pre>
            {tool.output && (
              <details>
                <summary>Output</summary>
                <pre>{tool.output}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Pattern 4: Session Naming from Working Directory

**What:** Derive human-readable session names from `cwd` field in JSONL

**When to use:** When session summary is missing but you want meaningful labels

**Where to implement:** Server-side during session parsing (enrichment step)

**Example:**
```typescript
// server/src/session-discovery.ts (modifications)

import { basename } from 'path';

export async function parseSessionFile(filePath: string, indexEntry?: SessionIndexEntry): Promise<Session | null> {
  // ... existing parsing logic

  // Extract cwd from first entry
  const firstEntry = entries[0];
  let derivedName: string | undefined;

  if (firstEntry?.cwd) {
    // Get last two path segments: "~/my-projects/dashboard" → "my-projects/dashboard"
    const pathParts = firstEntry.cwd.split('/').filter(Boolean);
    derivedName = pathParts.slice(-2).join('/');
  }

  const session: Session = {
    id: sessionId,
    projectHash,
    state,
    summary: indexEntry?.summary || metadata.summary || derivedName || `Session ${sessionId.slice(0, 8)}`,
    gitBranch: indexEntry?.gitBranch || metadata.gitBranch,
    createdAt: indexEntry?.created ? new Date(indexEntry.created).getTime() : metadata.firstTimestamp,
    lastActivity: metadata.lastTimestamp,
    workingDirectory: firstEntry?.cwd, // NEW: Store cwd for reference
    nodes,
    subagents: [],
  };

  return session;
}
```

**Shared type update:**
```typescript
// shared/src/index.ts (additions)

export interface Session {
  id: string;
  projectHash: string;
  state: SessionState;
  summary?: string;
  gitBranch?: string;
  tmuxTarget?: string;
  workingDirectory?: string;  // NEW: Working directory from JSONL
  createdAt: number;
  lastActivity: number;
  nodes: AnyNode[];
  subagents: Session[];
}
```

## Data Flow

### Request Flow: WebSocket Broadcast

```
File change detected (chokidar)
    ↓
parseSessionFile(filePath)
    ↓
Session object built
    ↓
wsManager.broadcastSessionUpdate(sessionId, session)
    ↓
All connected clients receive 'session-update' message
    ↓
useWebSocket hook receives message
    ↓
sessionStore.handleWebSocketMessage(message)
    ↓
sessionStore.updateSession(session)
    ↓
React components re-render (subscribed to store)
```

### State Management: Zustand Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Zustand Store                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ sessions: Session[]                               │  │
│  │ selectedSessionId: string | null                  │  │
│  │ viewMode: 'tree' | 'graph'                        │  │
│  │ filter: FilterType                                │  │
│  │ searchTerm: string                                │  │
│  │ panelState: { isOpen, panelType, panelData }      │  │ ← NEW
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  Actions:                                                 │
│  • updateSession(session)                                 │
│  • setSelectedSession(id)                                 │
│  • setFilter(filter)                                      │
│  • openPanel(type, data)                                  │ ← NEW
│  • closePanel()                                           │ ← NEW
│                                                           │
│  Selectors:                                               │
│  • getFilteredSessions()                                  │
│  • getGroupedNodes(sessionId)                             │ ← NEW
└─────────────────────────────────────────────────────────┘
         ↓ subscribe              ↓ subscribe
  ┌────────────┐          ┌─────────────┐
  │ GraphView  │          │  SidePanel  │
  └────────────┘          └─────────────┘
```

### Key Data Flows

1. **Session Update Flow:**
   - WebSocket receives `session-update` → Store updates `sessions` array → Views re-render

2. **Tool Grouping Flow:**
   - GraphView reads `sessions` from store → Applies client-side grouping via `groupToolCalls()` → Renders `ToolGroupNode` components

3. **Panel Open Flow:**
   - User clicks `ToolGroupNode` → `onNodeClick` calls `openPanel('tool-group', data)` → `SidePanel` reads `panelState` → Renders `ToolGroupPanel`

4. **Session Naming Flow:**
   - Server parses JSONL → Extracts `cwd` from first entry → Derives name from path → Includes in `Session.summary` → Client displays in UI

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-10 sessions | Current architecture is fine, no changes needed |
| 10-100 sessions | Add client-side pagination/virtualization for session list |
| 100-1000 sessions | Server-side filtering (date range, project), incremental loading |
| 1000+ sessions | Database for session metadata, full-text search, archival strategy |

### Scaling Priorities

1. **First bottleneck:** Large session files (>1000 nodes) slow down graph layout
   - **Solution:** Implement virtual scrolling in TreeView, lazy-load subagent details

2. **Second bottleneck:** Many simultaneous sessions (>50) cause large WebSocket payloads
   - **Solution:** Implement subscription filters (client subscribes to specific sessions)

3. **Third bottleneck:** Grouping logic runs on every store update
   - **Solution:** Memoize `groupToolCalls()` with `useMemo` on session ID + nodes.length

## Anti-Patterns

### Anti-Pattern 1: Grouping in Shared Types

**What people do:** Add `ToolGroup` as a new `NodeType` in shared types, making server aware of grouping

**Why it's wrong:**
- Server has to implement grouping logic (extra complexity)
- Harder to change grouping rules (requires server restart)
- Violates separation of concerns (server = data provider, client = view logic)

**Do this instead:**
- Keep `ToolGroup` as client-only type (not in shared/)
- Server sends raw `ToolNode[]` array
- Client groups on-demand in utils/grouping.ts

### Anti-Pattern 2: Panel State in Component Local State

**What people do:** Store `isPanelOpen` and `panelData` in `GraphView` component state

**Why it's wrong:**
- TreeView can't open the panel (state is isolated)
- Keyboard shortcuts can't toggle panel (no global access)
- Panel state doesn't persist across view mode switches

**Do this instead:**
- Store panel state in Zustand store
- Both TreeView and GraphView can call `openPanel()`
- Panel state survives view mode toggle

### Anti-Pattern 3: Nested Node Groups

**What people do:** Create groups of groups (recursive grouping)

**Why it's wrong:**
- Exponentially increases complexity
- Confuses users (too many levels of nesting)
- Makes drill-down navigation harder

**Do this instead:**
- Single-level grouping only
- Use different group types (parallel vs sequential) for clarity
- If more hierarchy needed, use subagents (already hierarchical)

### Anti-Pattern 4: Eager Loading All Subagent Details

**What people do:** Load full subagent JSONL files on every session parse

**Why it's wrong:**
- Slows down initial load (many file reads)
- Wastes memory (most subagents never viewed)
- Increases WebSocket payload size

**Do this instead:**
- Load subagent metadata only (ID, state, summary)
- Lazy-load full subagent details when user expands node
- Implement `/api/sessions/:sessionId/subagents/:agentId` endpoint for on-demand loading

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Filesystem (JSONL) | File watcher → Parse → Broadcast | chokidar for file watching, debounce to avoid spam |
| Tmux | REST API POST /api/send-prompt | Send user prompts to active tmux session |
| Desktop Notifications | node-notifier library | Notify on state changes (active → waiting) |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client ↔ Server | WebSocket (ws protocol) | Bidirectional but primarily server → client broadcasts |
| Server ↔ Filesystem | fs/promises (async reads) | Read-only, no writing to JSONL files |
| Store ↔ Components | Zustand subscriptions | Components subscribe to specific store slices for efficiency |
| GraphView ↔ Layout | Pure function calls | dagre layout is synchronous, no side effects |

## Build Order Implications

### Phase 1: Client-Side Grouping Foundation
**Dependencies:** None (extends existing client code)
**Order:**
1. Add `ToolGroup` type to client-only types
2. Implement `groupToolCalls()` in utils/grouping.ts
3. Add unit tests for grouping logic
4. Update GraphView to apply grouping before layout

**Why first:** Establishes core grouping logic without breaking existing features

### Phase 2: ToolGroupNode Component
**Dependencies:** Phase 1 (needs `ToolGroup` type)
**Order:**
1. Create `ToolGroupNode.tsx` component (similar to existing node components)
2. Add to `nodeTypes` in GraphView
3. Update graphLayout.ts to handle `ToolGroup` in layout calculation

**Why second:** Makes groups visible in UI, allows testing of visual design

### Phase 3: Side Panel Infrastructure
**Dependencies:** None (new feature, independent)
**Order:**
1. Add `panelState` to Zustand store
2. Create `SidePanel.tsx` container component
3. Add `openPanel` / `closePanel` actions
4. Wire up to GraphView layout (absolute positioning)

**Why third:** Establishes panel mechanics before specific content

### Phase 4: Tool Group Drill-Down
**Dependencies:** Phase 2 (ToolGroupNode), Phase 3 (SidePanel)
**Order:**
1. Create `ToolGroupPanel.tsx` detail component
2. Wire `ToolGroupNode` click to `openPanel('tool-group', data)`
3. Add keyboard shortcuts (Escape to close)

**Why fourth:** Combines grouping + panel for full feature

### Phase 5: Session Naming from Working Directory
**Dependencies:** None (server-side enhancement)
**Order:**
1. Update `Session` type to include `workingDirectory?: string`
2. Modify `parseSessionFile()` to extract `cwd` from JSONL
3. Derive fallback name from directory path
4. Update client UI to display working directory in tooltip

**Why fifth:** Independent enhancement, can be done in parallel or after

### Dependency Graph

```
Phase 1 (Grouping Logic)
    ↓
Phase 2 (ToolGroupNode)
    ↓
Phase 4 (Drill-Down)
    ↑
Phase 3 (SidePanel)

Phase 5 (Session Naming) ← Independent
```

## Sources

- **@xyflow/react documentation:** https://reactflow.dev/learn
- **Zustand documentation:** https://docs.pmnd.rs/zustand/getting-started/introduction
- **dagre layout algorithm:** https://github.com/dagrejs/dagre/wiki
- **Existing codebase analysis:** Direct inspection of current implementation

---
*Architecture research for: Claude Session Dashboard*
*Researched: 2026-02-06*
