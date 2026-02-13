# Phase 7: Horizontal Timeline Graph with Subagent Convergence - Research

**Researched:** 2026-02-09
**Domain:** React Flow horizontal graph layout with fork-join patterns
**Confidence:** MEDIUM-HIGH

## Summary

Phase 7 requires a major visual overhaul of the graph view from vertical (top-to-bottom) to horizontal (left-to-right) timeline layout. The current implementation uses dagre with `rankdir: 'TB'` and displays subagents as separate parallel columns that never rejoin the main flow. The goal is to create a timeline where subagent branches visually fork off, execute their work, and converge back to the main orchestrator line, with tool calls hidden inside subagent nodes and revealed on click as inline expansions.

This research explores four key technical domains:
1. **Horizontal layout** - Switching from TB to LR with dagre, handle position adjustments
2. **Fork-join convergence** - Creating dummy/invisible nodes to enable parallel branches to rejoin a single node
3. **Nested tool visibility** - Hiding tool calls inside subagent nodes by default, expanding inline on click
4. **Layout recalculation** - Dynamic layout updates when nodes expand/collapse

The current codebase already has strong foundations: dagre layout engine integrated, expand/collapse patterns from Phase 1 (tool grouping), node click handling from Phase 2 (group drill-down), and Zustand state management. The main challenges are: (1) implementing fork-join patterns with dagre (requires dummy nodes or alternative layout engine), (2) nesting tool calls inside subagents without breaking the flow, and (3) dynamic layout recalculation on expansion.

**Primary recommendation:** Switch dagre direction to 'LR', introduce dummy "join" nodes to enable convergence patterns, store expanded subagent state in Zustand, and conditionally add/remove tool nodes from the graph based on expansion state with layout recalculation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | ^12.0.0 | Graph visualization | Already in use, supports horizontal layout and dynamic node visibility |
| dagre | ^0.8.5 | Graph layout | Already integrated, supports LR (left-to-right) direction |
| zustand | ^4.5.0 | State management | Already in use, perfect for expansion state tracking |
| React | ^18.2.0 | UI framework | Already in use, supports dynamic rendering patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| elkjs | ^0.9.0+ | Alternative layout engine | OPTIONAL: If dagre fork-join patterns prove inadequate, elkjs layered algorithm handles complex parallel branches better |
| React.memo | Built-in | Component memoization | Prevent re-renders during layout recalculation (critical for performance) |
| useCallback/useMemo | Built-in | Hook memoization | Stable references during layout updates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| dagre with dummy nodes | elkjs layered algorithm | elkjs handles parallel branches natively but requires learning new API and config, dagre already integrated |
| Hidden property for tools | Separate side panel | Side panel contradicts "inline on branch" requirement, hidden property keeps tools on the branch |
| Dynamic layout recalc | Static pre-calculated layouts | Static layouts can't handle variable expansion state, dynamic is required |

**Installation:**
```bash
# No new dependencies required if using dagre
# Optional: Add elkjs only if dagre fork-join proves inadequate
npm install elkjs  # OPTIONAL
```

## Architecture Patterns

### Recommended Project Structure
```
client/src/
├── utils/
│   ├── graphLayout.ts       # Modify: Add LR direction, dummy join nodes
│   └── subagentExpansion.ts # NEW: Track expanded subagent IDs
├── components/
│   ├── GraphView.tsx        # Modify: Add subagent click handler
│   ├── nodes/
│   │   ├── SubagentNode.tsx # Modify: Add expand/collapse indicator
│   │   └── ToolNode.tsx     # Existing, no changes needed
├── store/
│   └── sessionStore.ts      # Add: expandedSubagents Set<string>
```

### Pattern 1: Horizontal Layout with Dagre
**What:** Change dagre `rankdir` from 'TB' to 'LR' and adjust handle positions from Top/Bottom to Left/Right
**When to use:** Converting vertical graphs to horizontal timeline layouts
**Example:**
```typescript
// Source: React Flow dagre example, verified with dagre documentation
export function applyDagreLayout(
  nodes: Node<CustomNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR'  // Change default to 'LR'
): Node<CustomNodeData>[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure for horizontal layout
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: direction === 'LR' ? 80 : 60,  // Horizontal spacing
    ranksep: direction === 'LR' ? 120 : 80, // Vertical spacing (between parallel branches)
    marginx: 20,
    marginy: 20,
  });

  // Add nodes and edges...
  dagre.layout(dagreGraph);

  // Apply positions with correct handle directions
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const dimensions = NODE_DIMENSIONS[node.type] || NODE_DIMENSIONS.tool;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - dimensions.width / 2,
        y: nodeWithPosition.y - dimensions.height / 2,
      },
      // Adjust handle positions for LR layout
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
    };
  });
}
```

### Pattern 2: Fork-Join with Dummy Nodes
**What:** Insert invisible "join" nodes where parallel branches converge back to the main timeline
**When to use:** When multiple subagents complete and execution continues as a single line
**Example:**
```typescript
// Source: Graphviz FAQ, Activity Diagram fork/join patterns
// Adapted for React Flow with dagre

interface JoinNode {
  id: string;
  type: 'join-node';  // Custom invisible node type
  hidden: true;       // Don't render, just used for layout
}

function createForJoinPattern(
  parentNodeId: string,
  subagents: Session[],
  nextNodeId: string
): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Create invisible join node
  const joinNodeId = `${parentNodeId}-join`;
  nodes.push({
    id: joinNodeId,
    type: 'join-node',
    data: { hidden: true },
    hidden: true,  // Invisible in React Flow
    position: { x: 0, y: 0 },
  });

  // Fork: Parent connects to each subagent
  subagents.forEach((subagent) => {
    edges.push({
      id: `e-${parentNodeId}-${subagent.id}`,
      source: parentNodeId,
      target: subagent.id,
      type: 'smoothstep',
    });

    // Join: Each subagent connects to invisible join node
    edges.push({
      id: `e-${subagent.id}-${joinNodeId}`,
      source: subagent.id,
      target: joinNodeId,
      type: 'smoothstep',
    });
  });

  // Continue from join node to next node
  edges.push({
    id: `e-${joinNodeId}-${nextNodeId}`,
    source: joinNodeId,
    target: nextNodeId,
    type: 'smoothstep',
  });

  return { nodes, edges };
}
```

### Pattern 3: Nested Tool Call Visibility
**What:** Track expanded subagent state in Zustand, conditionally add tool nodes to graph only when subagent is expanded
**When to use:** Hiding/showing child nodes inline on a branch without side panels
**Example:**
```typescript
// Source: Phase 1 research (tool grouping), React Flow hidden nodes example
// Store expansion state
interface SessionStore {
  // ... existing state
  expandedSubagents: Set<string>;  // Subagent IDs that are expanded
  toggleSubagentExpansion: (subagentId: string) => void;
}

// In graphLayout.ts
export function convertSessionToGraph(
  session: Session,
  expandedGroups: Set<string>,
  expandedSubagents: Set<string>,  // NEW parameter
  parentNodeId?: string,
  isSubagent: boolean = false
): GraphData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // ... session node creation ...

  // Process subagents
  for (const subagent of session.subagents) {
    const subagentNodeId = createNodeId(session.id, subagent.id);

    // Create subagent node
    nodes.push({
      id: subagentNodeId,
      type: 'subagent',
      data: {
        label: subagent.summary || 'Task Agent',
        state: subagent.state,
        isExpanded: expandedSubagents.has(subagent.id),
        toolCallCount: subagent.nodes.filter(n => n.type === 'tool').length,
      },
      position: { x: 0, y: 0 },
    });

    // Connect parent to subagent
    edges.push({
      id: `e-${prevNodeId}-${subagentNodeId}`,
      source: prevNodeId,
      target: subagentNodeId,
    });

    // If expanded, add tool nodes inline on the branch
    if (expandedSubagents.has(subagent.id)) {
      let branchPrevId = subagentNodeId;

      for (const node of subagent.nodes) {
        if (node.type === 'tool') {
          const toolNodeId = createNodeId(subagent.id, node.id);
          nodes.push({
            id: toolNodeId,
            type: 'tool',
            data: {
              label: node.toolName,
              state: node.state,
              toolName: node.toolName,
              hasOutput: !!node.output,
            },
            position: { x: 0, y: 0 },
          });

          edges.push({
            id: `e-${branchPrevId}-${toolNodeId}`,
            source: branchPrevId,
            target: toolNodeId,
          });

          branchPrevId = toolNodeId;
        }
      }

      prevNodeId = branchPrevId;  // Last tool becomes prev for join
    } else {
      prevNodeId = subagentNodeId;  // Collapsed: subagent becomes prev
    }
  }

  return { nodes, edges };
}
```

### Pattern 4: Dynamic Layout Recalculation
**What:** Recalculate dagre layout whenever expansion state changes to reposition nodes
**When to use:** Any time nodes are added/removed from the graph (expansion/collapse)
**Example:**
```typescript
// Source: Phase 1 research, React Flow expand/collapse example
// In GraphView.tsx
export function GraphView() {
  const expandedSubagents = useSessionStore((state) => state.expandedSubagents);
  const toggleSubagentExpansion = useSessionStore((state) => state.toggleSubagentExpansion);
  const sessions = useSessionStore((state) => state.sessions);

  // Recompute layout when expansion state changes
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => createLayoutedGraph(sessions, expandedGroups, expandedSubagents),
    [sessions, expandedGroups, expandedSubagents]  // Recalc on expansion change
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Update nodes/edges when layout changes
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  // Handle subagent click to expand/collapse
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === 'subagent') {
        toggleSubagentExpansion(node.id);
        // Layout recalculation happens automatically via useMemo
      }
      // ... other click handlers
    },
    [toggleSubagentExpansion]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={onNodeClick}
      // ... other props
    />
  );
}
```

### Pattern 5: Visual Expansion Indicator
**What:** Show expand/collapse chevron icon on subagent nodes to indicate interactivity
**When to use:** Any collapsible node that contains hidden children
**Example:**
```typescript
// Source: Phase 1 research (tool group expansion), common UI patterns
// In SubagentNode.tsx
export function SubagentNode({ data }: NodeProps<SubagentNodeData>) {
  const isExpanded = data.isExpanded || false;
  const toolCount = data.toolCallCount || 0;

  return (
    <div style={styles.node}>
      <div style={styles.header}>
        <span>{data.label}</span>
        {toolCount > 0 && (
          <span style={styles.expandIndicator}>
            {isExpanded ? '▼' : '▶'} {toolCount} tools
          </span>
        )}
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Using parent-child relationships for fork-join:** React Flow parent nodes are for spatial containment, not logical convergence
- **Removing/adding nodes without layout recalc:** Causes gaps and misalignment
- **Side panel for tool calls:** Contradicts "inline on branch" requirement
- **Not using dummy nodes for convergence:** Multiple edges to single node creates layout artifacts
- **Forgetting to update handle positions:** LR layout needs Left/Right handles, not Top/Bottom

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fork-join convergence | Custom edge routing logic | Dummy invisible nodes | Dagre handles layout correctly with intermediate nodes |
| Expansion state management | Component-local useState | Zustand store | State persists across re-renders, accessible from multiple components |
| Layout recalculation | Manual position updates | dagre.layout() + useMemo | Handles dependencies, edge routing, collision avoidance |
| Horizontal layout | Custom positioning algorithm | dagre rankdir: 'LR' | Built-in, handles spacing and alignment |
| Dynamic node visibility | Filter arrays on render | React Flow hidden property + conditional node inclusion | Preserves IDs, better performance |

**Key insight:** Dagre is designed for hierarchical layouts but not fork-join patterns. The standard workaround is dummy nodes - invisible intermediate nodes that enable multiple edges to converge. Alternative: switch to elkjs layered algorithm which handles parallel branches natively, but requires rewriting layout logic.

## Common Pitfalls

### Pitfall 1: Multiple Edges to Single Node Without Dummy Nodes
**What goes wrong:** Dagre only recognizes one edge per source-target pair, subsequent edges are ignored. Parallel branches don't converge correctly.

**Why it happens:** Dagre is designed for trees and simple DAGs, not complex fork-join patterns.

**How to avoid:** Insert invisible "join" nodes where branches converge. Each branch connects to the join node, then join node connects to the next node.

**Warning signs:** Missing edges in the graph, parallel branches don't rejoin, layout looks disconnected.

**Source:** [GitHub - dagrejs/dagre #320: Is multigraph supported by dagre layout?](https://github.com/dagrejs/dagre/issues/320)

### Pitfall 2: Not Recalculating Layout After Expansion
**What goes wrong:** Nodes overlap or have gaps when tool calls are expanded/collapsed inline.

**Why it happens:** Layout was calculated once with the initial node set, doesn't update when nodes are added/removed.

**How to avoid:** Wrap layout calculation in `useMemo` with expansion state as a dependency. Layout recalculates automatically when state changes.

**Warning signs:** Overlapping nodes, large white space gaps, misaligned edges.

**Source:** Phase 1 research (tool grouping), React Flow expand/collapse example

### Pitfall 3: Wrong Handle Positions for LR Layout
**What goes wrong:** Edges connect to top/bottom of nodes in horizontal layout, creating awkward routing.

**Why it happens:** Handle positions default to Top/Bottom (for TB layout), not updated for LR.

**How to avoid:** Set `sourcePosition: Position.Right` and `targetPosition: Position.Left` when `direction === 'LR'`.

**Warning signs:** Edges route around nodes instead of connecting horizontally, visual clutter.

**Source:** [React Flow - Dagre Layout Example](https://reactflow.dev/examples/layout/dagre)

### Pitfall 4: Not Adjusting Node Spacing for Horizontal Layout
**What goes wrong:** Nodes are too close together horizontally or too spread apart vertically.

**Why it happens:** TB spacing values don't translate well to LR (nodesep and ranksep have different meanings).

**How to avoid:** When `rankdir: 'LR'`, increase `ranksep` (horizontal spacing between layers) and adjust `nodesep` (vertical spacing between parallel branches).

**Warning signs:** Cramped timeline, overlapping parallel branches, excessive vertical space.

**Source:** [AntV G6 - Dagre Layout Documentation](https://g6.antv.antgroup.com/en/manual/layout/dagre-layout)

### Pitfall 5: Losing Context with Nested Expansion States
**What goes wrong:** Tool calls inside subagents interfere with tool group expansion state, causing confusion.

**Why it happens:** Two expansion systems (tool groups from Phase 1, subagents from Phase 7) use the same state keys.

**How to avoid:** Use separate state: `expandedGroups` for tool groups, `expandedSubagents` for subagents. Ensure IDs don't collide (prefix subagent IDs differently).

**Warning signs:** Expanding a subagent unexpectedly expands a tool group, or vice versa.

**Source:** Phase 1 research (tool grouping architecture)

### Pitfall 6: Invisible Nodes Not Actually Invisible
**What goes wrong:** Dummy join nodes are visible in the graph, cluttering the visualization.

**Why it happens:** Node `hidden` property not set to true, or custom node type renders visible content.

**How to avoid:** Set `hidden: true` on dummy nodes AND register a custom node type that renders nothing: `() => null`.

**Warning signs:** Small dots or boxes appear where branches converge, extra nodes in mini-map.

**Source:** [React Flow - Hidden Nodes Example](https://reactflow.dev/examples/nodes/hidden)

## Code Examples

Verified patterns from official sources:

### Horizontal Layout Configuration
```typescript
// Source: React Flow dagre example, dagre documentation
// https://reactflow.dev/examples/layout/dagre
import dagre from 'dagre';
import { Position } from '@xyflow/react';

export function applyDagreLayout(
  nodes: Node<CustomNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR'  // Default to horizontal
): Node<CustomNodeData>[] {
  if (nodes.length === 0) return nodes;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure graph for horizontal timeline
  dagreGraph.setGraph({
    rankdir: direction,
    // Adjust spacing for horizontal layout
    nodesep: direction === 'LR' ? 80 : 60,   // Vertical space between parallel branches
    ranksep: direction === 'LR' ? 120 : 80,  // Horizontal space along timeline
    marginx: 20,
    marginy: 20,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    const dimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ||
                       NODE_DIMENSIONS.tool;
    dagreGraph.setNode(node.id, {
      width: dimensions.width,
      height: dimensions.height,
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply positions to nodes with correct handle positions
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const dimensions = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ||
                       NODE_DIMENSIONS.tool;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - dimensions.width / 2,
        y: nodeWithPosition.y - dimensions.height / 2,
      },
      // Critical: Set handle positions based on direction
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
    };
  });
}
```

### Fork-Join Pattern with Dummy Nodes
```typescript
// Source: Graphviz FAQ (dummy nodes), Activity Diagram patterns
// Adapted for React Flow + dagre
function buildSubagentForJoin(
  parentNodeId: string,
  subagents: Session[],
  nextNodeId: string,
  sessionId: string
): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Create invisible join node
  const joinNodeId = `${sessionId}-join-after-${parentNodeId}`;
  nodes.push({
    id: joinNodeId,
    type: 'join-node',
    data: { label: '' },
    hidden: true,  // Invisible in React Flow
    position: { x: 0, y: 0 },  // Dagre will position it
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  // Fork: Parent connects to each subagent
  for (const subagent of subagents) {
    const subagentNodeId = createNodeId(sessionId, subagent.id);

    edges.push({
      id: `e-fork-${parentNodeId}-${subagentNodeId}`,
      source: parentNodeId,
      target: subagentNodeId,
      type: 'smoothstep',
      style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
    });

    // Join: Each subagent connects to invisible join node
    edges.push({
      id: `e-join-${subagentNodeId}-${joinNodeId}`,
      source: subagentNodeId,
      target: joinNodeId,
      type: 'smoothstep',
      style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
    });
  }

  // Continue: Join node connects to next node in timeline
  edges.push({
    id: `e-continue-${joinNodeId}-${nextNodeId}`,
    source: joinNodeId,
    target: nextNodeId,
    type: 'smoothstep',
    style: { stroke: '#4b5563', strokeWidth: 1.5 },
  });

  return { nodes, edges };
}

// Register invisible node type
const nodeTypes = {
  session: SessionNode,
  subagent: SubagentNode,
  tool: ToolNode,
  'tool-group': ToolGroupNode,
  skill: SkillNode,
  'join-node': () => null,  // Renders nothing
};
```

### Subagent Expansion State Management
```typescript
// Source: Phase 1 research (tool grouping), Zustand best practices
// In sessionStore.ts
interface SessionStore {
  // ... existing state
  expandedSubagents: Set<string>;  // Subagent session IDs that are expanded

  // Actions
  toggleSubagentExpansion: (subagentId: string) => void;
  expandSubagent: (subagentId: string) => void;
  collapseSubagent: (subagentId: string) => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // ... existing state
  expandedSubagents: new Set<string>(),

  toggleSubagentExpansion: (subagentId: string) => {
    set((state) => {
      const newSet = new Set(state.expandedSubagents);
      if (newSet.has(subagentId)) {
        newSet.delete(subagentId);
      } else {
        newSet.add(subagentId);
      }
      return { expandedSubagents: newSet };
    });
  },

  expandSubagent: (subagentId: string) => {
    set((state) => ({
      expandedSubagents: new Set(state.expandedSubagents).add(subagentId)
    }));
  },

  collapseSubagent: (subagentId: string) => {
    set((state) => {
      const newSet = new Set(state.expandedSubagents);
      newSet.delete(subagentId);
      return { expandedSubagents: newSet };
    });
  },
}));

// Atomic selector hook
export const useIsSubagentExpanded = (subagentId: string) =>
  useSessionStore((state) => state.expandedSubagents.has(subagentId));
```

### Inline Tool Call Expansion
```typescript
// Source: Phase 1 research (tool grouping), React Flow hidden nodes example
// In graphLayout.ts
export function convertSessionToGraph(
  session: Session,
  expandedGroups: Set<string>,
  expandedSubagents: Set<string>,
  parentNodeId?: string,
  isSubagent: boolean = false
): GraphData {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge[] = [];

  // ... session node creation ...

  let prevNodeId = sessionNodeId;

  // Process nodes in the session
  for (const node of session.nodes) {
    if (node.type === 'tool') {
      // Tool nodes handled normally in main session
      const toolNodeId = createNodeId(session.id, node.id);
      nodes.push({
        id: toolNodeId,
        type: 'tool',
        position: { x: 0, y: 0 },
        data: {
          label: node.toolName,
          state: node.state,
          toolName: node.toolName,
          hasOutput: !!node.output,
        },
      });

      edges.push({
        id: `e-${prevNodeId}-${toolNodeId}`,
        source: prevNodeId,
        target: toolNodeId,
      });

      prevNodeId = toolNodeId;
    }
    // ... handle other node types (skill, subagent marker, etc.)
  }

  // Process subagent sessions
  if (session.subagents.length > 0) {
    // Find next node after subagents (for join pattern)
    const nextNodeAfterSubagents = findNextNodeAfterSubagents(session, prevNodeId);

    // Build fork-join structure
    const { nodes: joinNodes, edges: joinEdges } = buildSubagentForJoin(
      prevNodeId,
      session.subagents,
      nextNodeAfterSubagents,
      session.id
    );
    nodes.push(...joinNodes);
    edges.push(...joinEdges);

    // Add each subagent node
    for (const subagent of session.subagents) {
      const subagentNodeId = createNodeId(session.id, subagent.id);

      // Count tool calls for display
      const toolCallCount = subagent.nodes.filter(n => n.type === 'tool').length;

      nodes.push({
        id: subagentNodeId,
        type: 'subagent',
        position: { x: 0, y: 0 },
        data: {
          label: subagent.summary || 'Task Agent',
          state: subagent.state,
          agentType: 'Task',
          description: subagent.summary,
          isExpanded: expandedSubagents.has(subagent.id),
          toolCallCount,
        },
      });

      // If expanded, add tool calls inline on the branch
      if (expandedSubagents.has(subagent.id)) {
        let branchPrevId = subagentNodeId;

        for (const subagentNode of subagent.nodes) {
          if (subagentNode.type === 'tool') {
            const toolNodeId = createNodeId(subagent.id, subagentNode.id);
            nodes.push({
              id: toolNodeId,
              type: 'tool',
              position: { x: 0, y: 0 },
              data: {
                label: subagentNode.toolName,
                state: subagentNode.state,
                toolName: subagentNode.toolName,
                hasOutput: !!subagentNode.output,
              },
            });

            edges.push({
              id: `e-${branchPrevId}-${toolNodeId}`,
              source: branchPrevId,
              target: toolNodeId,
              type: 'smoothstep',
              style: { stroke: '#f59e0b', strokeWidth: 1.5 },
            });

            branchPrevId = toolNodeId;
          }
        }
      }
    }

    prevNodeId = nextNodeAfterSubagents;
  }

  return { nodes, edges };
}
```

### SubagentNode with Expansion Indicator
```typescript
// Source: Phase 1 research (ToolGroupNode), existing SubagentNode.tsx
// In SubagentNode.tsx
import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { SessionState } from 'shared';

export interface SubagentNodeData {
  label: string;
  state: SessionState;
  agentType: string;
  description?: string;
  isExpanded?: boolean;      // NEW
  toolCallCount?: number;    // NEW
  [key: string]: unknown;
}

function SubagentNodeComponent({ data, selected }: NodeProps<Node<SubagentNodeData>>) {
  const colors = STATUS_COLORS[data.state];
  const isExpanded = data.isExpanded || false;
  const toolCount = data.toolCallCount || 0;

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}  // Changed from Top for LR layout
        style={styles.handle}
      />
      <div
        style={{
          ...styles.node,
          backgroundColor: colors.bg,
          border: `2px solid ${colors.border}`,
          ...(selected ? styles.nodeSelected : {}),
          cursor: toolCount > 0 ? 'pointer' : 'default',  // Indicate clickable
        }}
      >
        <div style={styles.header}>
          <div style={styles.icon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span style={styles.title}>{data.label}</span>
          <div
            style={{
              ...styles.statusDot,
              backgroundColor: colors.dot,
            }}
            title={data.state}
          />
        </div>
        {data.description && (
          <div style={styles.description} title={data.description}>
            {data.description}
          </div>
        )}
        <div style={styles.agentType}>
          Task: {data.agentType}
        </div>
        {/* NEW: Expansion indicator */}
        {toolCount > 0 && (
          <div style={styles.expandIndicator}>
            {isExpanded ? '▼' : '▶'} {toolCount} tool{toolCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}  // Changed from Bottom for LR layout
        style={styles.handle}
      />
    </>
  );
}

export const SubagentNode = memo(SubagentNodeComponent);

const styles = {
  // ... existing styles ...
  expandIndicator: {
    fontSize: '10px',
    color: '#9ca3af',
    marginTop: '4px',
    textAlign: 'center' as const,
  },
};
```

### Dynamic Layout Recalculation on Expansion
```typescript
// Source: Phase 1 research (tool grouping), React Flow expand/collapse example
// In GraphView.tsx
export function GraphView() {
  const sessions = useSessionStore((state) => state.sessions);
  const selectedSessionId = useSessionStore((state) => state.selectedSessionId);
  const expandedGroups = useSessionStore((state) => state.expandedGroups);
  const expandedSubagents = useSessionStore((state) => state.expandedSubagents);
  const toggleSubagentExpansion = useSessionStore((state) => state.toggleSubagentExpansion);

  // Filter to selected session or show all sessions
  const displaySessions = useMemo(() => {
    if (selectedSessionId) {
      const selected = sessions.find((s) => s.id === selectedSessionId);
      return selected ? [selected] : sessions;
    }
    return sessions;
  }, [sessions, selectedSessionId]);

  // Compute graph layout with subagent expansion state
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => createLayoutedGraph(displaySessions, expandedGroups, expandedSubagents),
    [displaySessions, expandedGroups, expandedSubagents]  // Recalc when expansion changes
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Update nodes/edges when layout changes
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  // Handle node click for subagent expansion
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === 'subagent') {
        // Toggle expansion - layout recalc happens automatically via useMemo
        toggleSubagentExpansion(node.id);
      } else if (node.type === 'tool-group') {
        // Existing tool group click handling
        setSelectedGroupId(node.id);
      }
      // ... other click handlers
    },
    [toggleSubagentExpansion, setSelectedGroupId]
  );

  return (
    <div style={styles.container}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={proOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        {/* ... Controls, MiniMap, Background ... */}
      </ReactFlow>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vertical (TB) layouts only | Horizontal (LR) timeline layouts | Ongoing 2024-2026 | Better for temporal/sequential data visualization |
| Side panels for drill-down | Inline expansion on branches | 2024+ | More intuitive spatial relationships, less context switching |
| Static pre-calculated layouts | Dynamic layout with useMemo | React Flow v10+ | Supports interactive expand/collapse without reload |
| dagre only | dagre + elkjs alternatives | 2025+ | Elkjs handles complex parallel branches better, but higher learning curve |
| Manual edge routing | Layout engine handles edges | Always | Eliminates manual position calculations |

**Deprecated/outdated:**
- Fixed top-to-bottom layouts for all graph types - horizontal layouts better for timelines
- Removing nodes from graph on collapse - use hidden property for better performance
- Separate expansion states in component local state - Zustand store prevents state loss on re-render

## Open Questions

1. **Dagre vs. Elkjs for Fork-Join**
   - What we know: Dagre requires dummy nodes for convergence, elkjs layered algorithm handles parallel branches natively
   - What's unclear: Whether elkjs complexity is worth the benefit, or if dummy nodes are sufficient
   - Recommendation: Start with dagre + dummy nodes (less refactoring). If layout quality is poor, evaluate elkjs migration

2. **Handling Deeply Nested Subagents**
   - What we know: Subagents can spawn their own subagents (nested Task tool calls)
   - What's unclear: Should nested subagents also fork/join, or display linearly?
   - Recommendation: Start with linear display for nested subagents (simpler), add fork-join recursively only if user requests it

3. **Animation on Expansion**
   - What we know: Layout recalculation causes node positions to change, could be jarring
   - What's unclear: Should nodes animate to new positions, or snap instantly?
   - Recommendation: React Flow has built-in node position transitions. Enable with `duration: 300` in fitViewOptions. Test user experience before committing.

4. **Tool Grouping Inside Subagents**
   - What we know: Phase 1 implemented tool grouping (consecutive same-type tools)
   - What's unclear: Should tool calls inside expanded subagents also be grouped?
   - Recommendation: Yes, maintain consistency. Apply groupConsecutiveToolCalls() to subagent nodes before rendering inline.

5. **Join Node Visual Representation**
   - What we know: Join nodes should be invisible for clean visualization
   - What's unclear: Should there be any visual indicator where branches converge (dot, line, etc.)?
   - Recommendation: Start fully invisible (cleaner). Add subtle indicator only if users report confusion about flow convergence.

## Sources

### Primary (HIGH confidence)
- [React Flow - Dagre Tree Example](https://reactflow.dev/examples/layout/dagre) - Horizontal layout configuration
- [React Flow - Expand and Collapse Example](https://reactflow.dev/examples/layout/expand-collapse) - Dynamic expansion patterns
- [React Flow - Hidden Nodes Example](https://reactflow.dev/examples/nodes/hidden) - Node visibility control
- [GitHub - dagrejs/dagre #320](https://github.com/dagrejs/dagre/issues/320) - Multigraph support and limitations
- [AntV G6 - Dagre Layout](https://g6.antv.antgroup.com/en/manual/layout/dagre-layout) - Dagre configuration options
- Project codebase - Existing Phase 1 research (tool grouping), Phase 2 research (side panels), graphLayout.ts implementation

### Secondary (MEDIUM confidence)
- [React Flow - ELK.js Example](https://reactflow.dev/examples/layout/elkjs) - Alternative layout engine
- [Eclipse ELK - Algorithms](https://eclipse.dev/elk/reference/algorithms.html) - ELK algorithm options
- [Graphviz FAQ](https://graphviz.org/faq/) - Dummy nodes for layout
- [Software Ideas Modeler - Activity Diagram Fork](https://www.softwareideas.net/activity-diagram-fork) - Fork/join UML patterns
- [GitHub - xyflow/xyflow Discussion #1265](https://github.com/xyflow/xyflow/discussions/1265) - Expand/collapse child elements

### Tertiary (LOW confidence)
- [yWorks - Interactive Showcase of Graph Layouts](https://www.yworks.com/pages/interactive-showcase-of-graph-layouts) - General layout concepts
- [Tom Sawyer Software - Graph Layout](https://www.tomsawyer.com/graph-layout) - Commercial layout algorithms (not applicable)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - dagre already integrated, React Flow patterns established
- Architecture: MEDIUM-HIGH - Fork-join with dagre requires dummy nodes (workaround), inline expansion patterns proven in Phase 1
- Pitfalls: MEDIUM - Dagre limitations with multigraph are documented, but convergence pattern implementation is custom

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable technology, but implementation pattern is custom)

---

## Summary of Key Findings

1. **Horizontal Layout**: Simple - change dagre `rankdir: 'TB'` to `'LR'`, adjust handle positions to Left/Right, increase `ranksep` for timeline spacing

2. **Fork-Join Convergence**: Moderate complexity - requires dummy invisible nodes where parallel branches rejoin. Dagre doesn't natively support multiple edges to one node, workaround is proven pattern

3. **Inline Tool Expansion**: Established pattern - reuse Phase 1 expansion state management, conditionally add/remove tool nodes from graph based on Zustand state

4. **Dynamic Layout**: Proven approach - wrap layout calculation in `useMemo` with expansion state dependencies, React Flow handles position transitions automatically

5. **Alternative (elkjs)**: Optional fallback - if dagre + dummy nodes produce poor layout quality, elkjs layered algorithm handles parallel branches natively, but requires rewriting layout logic

**Recommended Implementation Path:**
1. Start with dagre LR layout (low risk, high impact)
2. Add dummy join nodes for convergence (moderate complexity)
3. Implement subagent expansion state (reuse Phase 1 patterns)
4. Test with real session data to validate layout quality
5. Evaluate elkjs migration only if dagre quality is insufficient

**Primary Risk:** Dagre's limitations with complex fork-join patterns may produce suboptimal layouts. Mitigation: prototype early, prepare elkjs fallback plan.
