# Phase 1: Tool Call Grouping - Research

**Researched:** 2026-02-06
**Domain:** React visualization with graph and tree views
**Confidence:** HIGH

## Summary

This phase requires grouping consecutive tool calls of the same type in both React Flow graph visualization and tree view components. The application already uses React Flow (@xyflow/react v12) for graph visualization and custom tree components with Zustand for state management.

The standard approach involves:
1. **Data transformation layer** - Group consecutive tool nodes before rendering using Array.reduce or Object.groupBy patterns
2. **Hybrid node rendering** - Create specialized "group node" components that render as single nodes with counts (e.g., "Bash (12)")
3. **Expand/collapse state management** - Track expansion state using Zustand store with atomic selectors to prevent unnecessary re-renders
4. **Visibility control** - Use the `hidden` property on React Flow nodes and conditional rendering in tree views to show/hide individual tool calls
5. **State persistence** - Maintain expansion state when switching between graph and tree views using shared Zustand store

The existing codebase already has the foundation: React Flow with dagre layout, custom node components, and Zustand state management. The task is to add grouping logic in the data transformation layer (graphLayout.ts for graph, TreeView.tsx for tree) and create expand/collapse interaction patterns.

**Primary recommendation:** Transform data at the layout/render preparation stage using Array.reduce to group consecutive identical tool calls, create ToolGroupNode components for both views, and manage expansion state in Zustand store with atomic selectors per group ID.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | ^12.0.0 | Graph visualization | Industry standard for node-based UIs, built-in performance optimizations, extensive documentation |
| zustand | ^4.5.0 | State management | Minimal boilerplate, hook-based API, excellent for UI state like expand/collapse |
| React | ^18.2.0 | UI framework | Already in use, useState for local component state |
| dagre | ^0.8.5 | Graph layout | Hierarchical layout algorithm, already integrated for positioning nodes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React.memo | Built-in | Component memoization | Prevent unnecessary re-renders of node components (critical for performance) |
| useCallback | Built-in | Function memoization | Stable references for callbacks passed to nodes |
| useMemo | Built-in | Value memoization | Stable references for derived data like grouped nodes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Array.reduce | Object.groupBy | Object.groupBy is cleaner but requires polyfill for older browsers, reduce offers more control during transformation |
| Zustand | useState in components | useState creates prop drilling and makes state coordination between views harder |
| Custom grouping | React Flow parent nodes | Parent nodes are for spatial grouping, not logical consecutive grouping |

**Installation:**
```bash
# No new dependencies required - all libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
client/src/
├── utils/
│   ├── graphLayout.ts       # Add groupConsecutiveTools() function
│   └── groupingUtils.ts     # Shared grouping logic (NEW)
├── components/
│   ├── nodes/
│   │   ├── ToolNode.tsx           # Existing individual tool node
│   │   └── ToolGroupNode.tsx      # New grouped tool node (NEW)
│   ├── TreeView.tsx               # Add grouping logic
│   └── TreeNode.tsx               # Support group node data
├── store/
│   └── sessionStore.ts            # Add expandedGroups state slice
```

### Pattern 1: Consecutive Grouping with Array.reduce
**What:** Group consecutive nodes of the same tool type into single logical units
**When to use:** During data transformation before rendering (in graphLayout.ts and TreeView.tsx)
**Example:**
```typescript
// Source: Array.reduce pattern verified with LogRocket blog
interface ToolGroup {
  id: string;              // Unique group ID
  type: 'tool-group';
  toolName: string;
  nodes: ToolNode[];       // All consecutive nodes
  count: number;
  firstNode: ToolNode;     // For state/timestamp
}

function groupConsecutiveTools(nodes: AnyNode[]): (AnyNode | ToolGroup)[] {
  return nodes.reduce((acc: (AnyNode | ToolGroup)[], node) => {
    if (node.type !== 'tool') {
      acc.push(node);
      return acc;
    }

    const lastItem = acc[acc.length - 1];

    // Check if last item is a group of the same tool type
    if (lastItem?.type === 'tool-group' &&
        lastItem.toolName === node.toolName) {
      // Extend existing group
      lastItem.nodes.push(node);
      lastItem.count++;
    } else {
      // Start new group
      acc.push({
        id: `group-${node.id}`,
        type: 'tool-group',
        toolName: node.toolName,
        nodes: [node],
        count: 1,
        firstNode: node,
      });
    }

    return acc;
  }, []);
}
```

### Pattern 2: Zustand Expansion State Management
**What:** Atomic selectors for expansion state to prevent unnecessary re-renders
**When to use:** Store-level state management for expand/collapse
**Example:**
```typescript
// Source: Verified with TkDodo's Zustand best practices
interface SessionStore {
  // Existing state...
  expandedGroups: Set<string>;  // Group IDs that are expanded

  // Actions namespace (never changes, no re-render risk)
  actions: {
    toggleGroupExpansion: (groupId: string) => void;
    isGroupExpanded: (groupId: string) => boolean;
  };
}

// Atomic selector for specific group
export const useIsGroupExpanded = (groupId: string) =>
  useSessionStore((state) => state.expandedGroups.has(groupId));
```

### Pattern 3: React Flow Hidden Property for Visibility
**What:** Toggle node `hidden` property instead of removing from array
**When to use:** Show/hide individual tool calls when group is collapsed/expanded
**Example:**
```typescript
// Source: React Flow official documentation - Hidden example
function applyGroupVisibility(
  nodes: Node[],
  expandedGroups: Set<string>
): Node[] {
  return nodes.map(node => {
    // If node is part of collapsed group, hide it
    if (node.data.groupId && !expandedGroups.has(node.data.groupId)) {
      return { ...node, hidden: true };
    }
    return { ...node, hidden: false };
  });
}
```

### Pattern 4: Memoization for Performance
**What:** Memoize node components and derived data to prevent unnecessary re-renders
**When to use:** All custom node components and data transformations
**Example:**
```typescript
// Source: React Flow performance documentation
// 1. Memoize node components
export const ToolGroupNode = memo(ToolGroupNodeComponent);

// 2. Memoize nodeTypes object
const nodeTypes = useMemo(() => ({
  session: SessionNode,
  subagent: SubagentNode,
  tool: ToolNode,
  'tool-group': ToolGroupNode,  // NEW
  skill: SkillNode,
}), []);

// 3. Memoize data transformations
const groupedNodes = useMemo(
  () => groupConsecutiveTools(session.nodes),
  [session.nodes]
);
```

### Anti-Patterns to Avoid
- **Creating nodeTypes object on every render:** Causes React Flow to remount all nodes (severe performance issue)
- **Subscribing to entire Zustand store:** Use atomic selectors, don't subscribe to whole state
- **Removing nodes from array when collapsed:** Use `hidden` property instead to maintain graph structure and avoid layout recalculation
- **Mixing group state with individual node state:** Keep expansion state separate in dedicated store slice
- **Using parent nodes for consecutive grouping:** React Flow parent nodes are for spatial containment, not logical grouping

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Grouping consecutive items | Custom loop with counters | Array.reduce pattern | Handles edge cases, functional/immutable, well-tested pattern |
| Node memoization | Custom shouldUpdate logic | React.memo | Built-in, optimized, integrates with React's reconciliation |
| State persistence between views | localStorage with manual sync | Zustand store (already in use) | Automatic subscriptions, no manual sync needed |
| Graph layout recalculation | Manual position calculation | dagre.layout (already in use) | Handles hierarchical positioning, edge routing |
| Visibility toggling | Conditional rendering with filter | React Flow `hidden` property | Preserves layout, avoids recalculation, better performance |

**Key insight:** React Flow is highly optimized for large graphs, but only if you follow its patterns. Fighting the library (removing nodes, recreating objects, skipping memoization) destroys performance. In this domain, use `hidden` property, memoize everything, and use atomic state subscriptions.

## Common Pitfalls

### Pitfall 1: Creating nodeTypes Object in Render
**What goes wrong:** Every render creates a new nodeTypes object, causing React Flow to unmount and remount all nodes, destroying performance
**Why it happens:** Not recognizing that object identity matters for React Flow's internal optimization
**How to avoid:** Define nodeTypes outside component or use useMemo with empty dependency array
**Warning signs:** Graph feels sluggish, console shows many "unmount/mount" in React DevTools, animations restart on interaction

### Pitfall 2: Non-Atomic Zustand Selectors
**What goes wrong:** Component re-renders whenever ANY store state changes, not just the specific value it needs
**Why it happens:** Returning multiple values or objects from selectors without shallow comparison
**How to avoid:** One selector per value, or use multiple atomic hooks in components
**Warning signs:** Components re-render when unrelated state changes, React DevTools shows unnecessary renders

### Pitfall 3: Forgetting to Update Layout After Visibility Changes
**What goes wrong:** Graph has gaps where hidden nodes used to be, layout looks broken
**Why it happens:** dagre layout calculated once with all nodes, not recalculated when visibility changes
**How to avoid:** Either (1) recalculate layout when groups expand/collapse, or (2) keep hidden nodes in layout calculation but render them as hidden
**Warning signs:** White space gaps in graph, nodes not repositioning smoothly

### Pitfall 4: Group ID Instability
**What goes wrong:** Group IDs change between renders, causing expansion state to be lost
**Why it happens:** Using non-deterministic IDs (timestamps, random) or index-based IDs that shift when data changes
**How to avoid:** Generate stable IDs from group content (e.g., `${toolName}-${firstNodeId}`)
**Warning signs:** Groups collapse unexpectedly, expansion state doesn't persist, flickering UI

### Pitfall 5: Not Handling Single-Item Groups
**What goes wrong:** UI shows "Bash (1)" which is pointless grouping, or logic breaks for single items
**Why it happens:** Grouping algorithm doesn't check count, always creates groups
**How to avoid:** Check if count > 1 before rendering as group, or "unwrap" single-item groups in post-processing
**Warning signs:** Awkward "(1)" labels in UI, user complaints about unnecessary grouping

### Pitfall 6: Breaking Consecutive Logic with Non-Tool Nodes
**What goes wrong:** Tool grouping breaks when message/skill/subagent nodes appear between consecutive tool calls
**Why it happens:** Not resetting group accumulation when encountering non-tool nodes
**How to avoid:** In reduce function, check if previous item is a group AND if current node is a tool before extending
**Warning signs:** Groups spanning across message boundaries, incorrect counts, visual confusion

## Code Examples

Verified patterns from official sources:

### Grouping Consecutive Tool Calls
```typescript
// Source: Array.reduce pattern from existing codebase + LogRocket grouping article
interface ToolGroup {
  id: string;
  type: 'tool-group';
  toolName: string;
  nodes: ToolNode[];
  count: number;
  state: SessionState;  // Derived from firstNode
  timestamp: number;    // From firstNode
}

function groupConsecutiveToolCalls(nodes: AnyNode[]): (AnyNode | ToolGroup)[] {
  return nodes.reduce<(AnyNode | ToolGroup)[]>((acc, node) => {
    // Non-tool nodes always break the grouping chain
    if (node.type !== 'tool') {
      acc.push(node);
      return acc;
    }

    const lastItem = acc[acc.length - 1];
    const isConsecutiveSameTool =
      lastItem?.type === 'tool-group' &&
      lastItem.toolName === node.toolName;

    if (isConsecutiveSameTool) {
      // Extend existing group
      lastItem.nodes.push(node);
      lastItem.count++;
      // Update group state if any node is active
      if (node.state === 'active') {
        lastItem.state = 'active';
      }
    } else {
      // Start new group (even for single items, unwrap later if needed)
      acc.push({
        id: `tool-group-${node.toolName}-${node.id}`,
        type: 'tool-group',
        toolName: node.toolName,
        nodes: [node],
        count: 1,
        state: node.state,
        timestamp: node.timestamp,
      });
    }

    return acc;
  }, []);
}

// Unwrap single-item groups (optional, based on UX preference)
function unwrapSingleItemGroups(items: (AnyNode | ToolGroup)[]): (AnyNode | ToolGroup)[] {
  return items.map(item =>
    item.type === 'tool-group' && item.count === 1
      ? item.nodes[0]
      : item
  );
}
```

### React Flow ToolGroupNode Component
```typescript
// Source: Pattern from existing ToolNode.tsx + React Flow documentation
import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useSessionStore } from '../../store/sessionStore';

export interface ToolGroupNodeData {
  label: string;          // "Bash (12)"
  toolName: string;       // "Bash"
  count: number;          // 12
  state: SessionState;
  groupId: string;        // Stable ID for expansion state
}

function ToolGroupNodeComponent({ data, id }: NodeProps<Node<ToolGroupNodeData>>) {
  const isExpanded = useSessionStore(state =>
    state.expandedGroups.has(data.groupId)
  );
  const toggleExpansion = useSessionStore(state =>
    state.actions.toggleGroupExpansion
  );

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        className="tool-group-node"
        onClick={() => toggleExpansion(data.groupId)}
        style={{ cursor: 'pointer' }}
      >
        <div className="header">
          {TOOL_ICONS[data.toolName] || DEFAULT_ICON}
          <span>{data.toolName} ({data.count})</span>
          <span>{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export const ToolGroupNode = memo(ToolGroupNodeComponent);
```

### Zustand Store Extension
```typescript
// Source: TkDodo's Zustand best practices + existing sessionStore.ts
interface SessionStore {
  // ... existing state ...

  // New state for group expansion
  expandedGroups: Set<string>;

  // Actions namespace
  actions: {
    // ... existing actions ...

    toggleGroupExpansion: (groupId: string) => void;
    expandGroup: (groupId: string) => void;
    collapseGroup: (groupId: string) => void;
    isGroupExpanded: (groupId: string) => boolean;
  };
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // ... existing state ...
  expandedGroups: new Set<string>(),

  actions: {
    // ... existing actions ...

    toggleGroupExpansion: (groupId: string) => {
      set((state) => {
        const newSet = new Set(state.expandedGroups);
        if (newSet.has(groupId)) {
          newSet.delete(groupId);
        } else {
          newSet.add(groupId);
        }
        return { expandedGroups: newSet };
      });
    },

    expandGroup: (groupId: string) => {
      set((state) => ({
        expandedGroups: new Set(state.expandedGroups).add(groupId)
      }));
    },

    collapseGroup: (groupId: string) => {
      set((state) => {
        const newSet = new Set(state.expandedGroups);
        newSet.delete(groupId);
        return { expandedGroups: newSet };
      });
    },

    isGroupExpanded: (groupId: string) => {
      return get().expandedGroups.has(groupId);
    },
  },
}));

// Atomic selector hook for components
export const useIsGroupExpanded = (groupId: string) =>
  useSessionStore((state) => state.expandedGroups.has(groupId));
```

### Graph View Integration
```typescript
// Source: Existing graphLayout.ts + React Flow hidden property pattern
export function convertSessionToGraph(
  session: Session,
  expandedGroups: Set<string>,
  parentNodeId?: string,
  isSubagent: boolean = false
): GraphData {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge[] = [];

  // ... existing session node creation ...

  // Group consecutive tool calls
  const groupedNodes = groupConsecutiveToolCalls(session.nodes);
  let prevNodeId = sessionNodeId;

  for (const item of groupedNodes) {
    if (item.type === 'tool-group') {
      // Create group node
      const groupNodeId = createNodeId(session.id, item.id);
      const toolGroupNode: Node<ToolGroupNodeData> = {
        id: groupNodeId,
        type: 'tool-group',
        position: { x: 0, y: 0 },
        data: {
          label: `${item.toolName} (${item.count})`,
          toolName: item.toolName,
          count: item.count,
          state: item.state,
          groupId: item.id,
        },
      };
      nodes.push(toolGroupNode);

      edges.push({
        id: `e-${prevNodeId}-${groupNodeId}`,
        source: prevNodeId,
        target: groupNodeId,
      });

      // If expanded, add individual tool nodes as children
      if (expandedGroups.has(item.id)) {
        let groupPrevId = groupNodeId;
        for (const toolNode of item.nodes) {
          const nodeId = createNodeId(session.id, toolNode.id);
          const toolFlowNode: Node<ToolNodeData> = {
            id: nodeId,
            type: 'tool',
            position: { x: 0, y: 0 },
            data: {
              label: toolNode.toolName,
              state: toolNode.state,
              toolName: toolNode.toolName,
              hasOutput: !!toolNode.output,
              groupId: item.id,  // Track membership
            },
          };
          nodes.push(toolFlowNode);

          edges.push({
            id: `e-${groupPrevId}-${nodeId}`,
            source: groupPrevId,
            target: nodeId,
          });

          groupPrevId = nodeId;
        }
        prevNodeId = groupPrevId;
      } else {
        prevNodeId = groupNodeId;
      }
    } else {
      // Handle non-group nodes (skill, subagent, message, etc.)
      // ... existing node handling ...
    }
  }

  return { nodes, edges };
}
```

### Tree View Integration
```typescript
// Source: Existing TreeView.tsx + conditional rendering pattern
export function TreeView({ onNodeSelect }: TreeViewProps) {
  const expandedGroups = useSessionStore(state => state.expandedGroups);
  const toggleGroupExpansion = useSessionStore(
    state => state.actions.toggleGroupExpansion
  );

  // Group nodes before rendering
  const renderNode = useCallback(
    (item: AnyNode | ToolGroup, depth: number, parentKey: string = '') => {
      if (item.type === 'tool-group') {
        const nodeKey = `${parentKey}-${item.id}`;
        const isExpanded = expandedGroups.has(item.id);

        return (
          <div key={nodeKey}>
            <TreeNode
              node={{
                type: 'tool-group',
                label: `${item.toolName} (${item.count})`,
                state: item.state,
              }}
              depth={depth}
              isExpanded={isExpanded}
              hasChildren={item.count > 1}
              onToggle={() => toggleGroupExpansion(item.id)}
              onSelect={() => onNodeSelect?.(item)}
            />
            {isExpanded && (
              <div style={{ marginLeft: '20px' }}>
                {item.nodes.map((toolNode, idx) =>
                  renderNode(toolNode, depth + 1, nodeKey)
                )}
              </div>
            )}
          </div>
        );
      }

      // Regular node rendering
      // ... existing logic ...
    },
    [expandedGroups, toggleGroupExpansion]
  );

  const groupedNodes = useMemo(
    () => groupConsecutiveToolCalls(session.nodes),
    [session.nodes]
  );

  return (
    <div>
      {groupedNodes.map(item => renderNode(item, 0))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Array.reduce only | Object.groupBy available | End of 2024 | Cleaner syntax but requires polyfill for older browsers, reduce still preferred for transformations during grouping |
| Redux for UI state | Zustand/Jotai | 2023-2025 | Less boilerplate, better DX, faster adoption for new projects |
| Removing nodes on collapse | Hidden property | React Flow v10+ | Better performance, preserves layout, no recalculation |
| Single nodeTypes for all | Custom node per interaction | 2024+ | Better separation of concerns, easier to extend |

**Deprecated/outdated:**
- React Flow's `parentNode` property: Renamed to `parentId` in v11.11.0 (use `parentId`)
- Creating new `nodeTypes` object in render: Always caused issues but now well-documented as anti-pattern
- Using `display: none` on handles: Use `opacity: 0` instead (handles must be measurable)

## Open Questions

Things that couldn't be fully resolved:

1. **Should single-item groups be rendered as groups or unwrapped?**
   - What we know: UX preference, no technical constraint
   - What's unclear: User expectation - is "Bash (1)" helpful or redundant?
   - Recommendation: Start with unwrapping (render as normal ToolNode if count === 1), add config option later if users want different behavior

2. **Should expansion state persist across sessions or be ephemeral?**
   - What we know: Zustand can persist to localStorage, current state is ephemeral
   - What's unclear: User preference for state persistence
   - Recommendation: Start ephemeral (reset on page refresh), easy to add persistence later if requested

3. **Should group nodes show aggregated output information?**
   - What we know: Individual tool nodes show "output" badge if hasOutput is true
   - What's unclear: Should group show "3/12 have output" or similar?
   - Recommendation: Start simple (just count), iterate based on user feedback

4. **Performance threshold for automatic collapsing**
   - What we know: Large graphs (1000+ nodes) need optimization
   - What's unclear: At what count should groups default to collapsed?
   - Recommendation: All groups start collapsed, user can expand. Add "expand all" / "collapse all" controls if needed.

## Sources

### Primary (HIGH confidence)
- React Flow official documentation - https://reactflow.dev/examples/layout/expand-collapse - Expand/collapse patterns and hidden property
- React Flow official documentation - https://reactflow.dev/learn/layouting/sub-flows - Parent-child node relationships
- React Flow official documentation - https://reactflow.dev/learn/advanced-use/performance - Performance best practices
- React Flow official documentation - https://reactflow.dev/learn/troubleshooting/common-errors - Common errors and pitfalls
- LogRocket blog - https://blog.logrocket.com/guide-object-groupby-alternative-array-reduce/ - Array grouping patterns
- TkDodo's blog - https://tkdodo.eu/blog/working-with-zustand - Zustand best practices

### Secondary (MEDIUM confidence)
- Medium article - https://medium.com/@lukasz.jazwa_32493/the-ultimate-guide-to-optimize-react-flow-project-performance-42f4297b2b7b - React Flow performance optimization
- Multiple web sources on React tree view patterns - MUI X Tree View, Mantine Tree, DevExpress TreeView (2026 documentation)
- Multiple web sources on state management trends - Zustand 40%+ usage in 2026, 30%+ YoY growth

### Tertiary (LOW confidence)
- None - all key findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, versions verified from package.json
- Architecture: HIGH - Patterns verified from React Flow official docs and Zustand best practices
- Pitfalls: HIGH - Documented in React Flow troubleshooting and community discussions

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable technology stack)

---

## Sources List

### Official Documentation
- [React Flow: Expand and Collapse](https://reactflow.dev/examples/layout/expand-collapse)
- [React Flow: Sub Flows](https://reactflow.dev/learn/layouting/sub-flows)
- [React Flow: Performance](https://reactflow.dev/learn/advanced-use/performance)
- [React Flow: Common Errors](https://reactflow.dev/learn/troubleshooting/common-errors)
- [React Flow: Hidden Nodes](https://reactflow.dev/examples/nodes/hidden)

### Technical Articles
- [A guide to Object.groupBy: An alternative to Array.reduce - LogRocket](https://blog.logrocket.com/guide-object-groupby-alternative-array-reduce/)
- [Working with Zustand - TkDodo's blog](https://tkdodo.eu/blog/working-with-zustand)
- [The ultimate guide to optimize React Flow project performance - Medium](https://medium.com/@lukasz.jazwa_32493/the-ultimate-guide-to-optimize-react-flow-project-performance-42f4297b2b7b)

### Ecosystem References
- [State Management in 2026: Redux, Context API, and Modern Patterns - Nucamp](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)
- [Top 5 React State Management Tools Developers Actually Use in 2026 - Syncfusion](https://www.syncfusion.com/blogs/post/react-state-management-libraries)
- [MUI X Simple Tree View - Expansion](https://mui.com/x/react-tree-view/simple-tree-view/expansion/)
