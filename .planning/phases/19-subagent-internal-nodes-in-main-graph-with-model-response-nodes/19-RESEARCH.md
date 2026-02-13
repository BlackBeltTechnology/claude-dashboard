# Phase 19: Subagent internal nodes in main graph with model response nodes - Research

**Researched:** 2026-02-12
**Domain:** React Flow graph layout refactoring, hierarchical node management
**Confidence:** HIGH

## Summary

Phase 19 transforms the subagent box visualization from Phase 17 by promoting internal workflow nodes (request → tool-groups → model-outputs → response) from contained visual cards into actual React Flow nodes in the main session graph. This enables direct interaction with model response nodes in the timeline and proper tree-to-graph navigation for all subagent internal nodes.

The implementation requires refactoring the graph layout engine to generate individual React Flow nodes for each internal workflow step while maintaining the box container's visual grouping. Model response nodes become first-class timeline participants, clickable and navigable like other node types.

**Primary recommendation:** Extend the existing `graphLayout.ts` node generation logic to conditionally render internal nodes as React Flow nodes when boxes are expanded, reuse existing node components (ToolGroupNode, new ModelOutputNode), and update tree-to-graph navigation to handle subagent-internal node IDs.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | ^12.0.0 | Graph rendering and layout | Already in use, supports nested/grouped node patterns |
| dagre | ^0.8.5 | Hierarchical graph layout | Already in use, calculates positions for new nodes |
| zustand | ^4.5.0 | State management | Already manages expand/collapse state |
| shared | workspace | Type definitions | Monorepo shared types package |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | ^5.3.3 | Type safety | All code changes |
| React | ^18.2.0 | UI framework | Node components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Flow nodes | CSS-only nested divs | Lose interactivity, click handling, and layout consistency |
| dagre layout | Custom positioning | More control but reimplements existing layout logic |

**Installation:**
```bash
# No new dependencies needed - all libraries already installed
npm run build  # Verify existing setup
```

## Architecture Patterns

### Recommended Approach

**Expand subagent boxes by generating React Flow child nodes, not by resizing container:**

Phase 17 implementation already builds `internalNodes` array with type info. Phase 19 extends this by:

1. When `isExpanded: true`, generate React Flow nodes for each internal workflow step
2. Add edges between internal nodes (request → first tool → ... → response)
3. Add edges connecting box entry/exit to main timeline
4. Position internal nodes using dagre within the subagent's horizontal range

### Pattern 1: Conditional Node Generation

**What:** Graph layout generates different node structures based on `isExpanded` flag

**When to use:** Expanding subagent boxes to show internal workflow

**Example:**
```typescript
// Source: Existing pattern from graphLayout.ts:840-1023
if (isExpanded) {
  // Generate React Flow nodes for request, tools, model outputs, response
  const requestNodeId = createNodeId(session.id, `${subagent.id}-request`);
  const requestNode: Node<RequestNodeData> = {
    id: requestNodeId,
    type: 'request',
    position: { x: 0, y: 0 },  // dagre calculates final position
    data: {
      label: 'Request',
      state: subagent.state,
      prompt: requestText,
      agentType: agentType,
    },
  };
  nodes.push(requestNode);

  // Generate tool nodes from internalNodes array...
  // Generate model output nodes from internalNodes array...
  // Generate response node...
} else {
  // Generate collapsed box node (existing Phase 17 logic)
  const boxNode: Node<SubagentBoxNodeData> = { ... };
  nodes.push(boxNode);
}
```

### Pattern 2: Node Type Registry Extension

**What:** Add new node types to React Flow's nodeTypes registry

**When to use:** Creating new visual node representations (ModelOutputNode, RequestNode, ResponseNode)

**Example:**
```typescript
// Source: GraphView.tsx:31-41 (existing pattern)
const nodeTypes: NodeTypes = {
  session: SessionNode,
  'subagent-box': SubagentBoxNode,
  // Add new types for internal nodes:
  'request': RequestNode,
  'response': ResponseNode,
  'model-output': ModelOutputNode,
  // ... existing types
};
```

### Pattern 3: Tree-to-Graph Navigation with ID Mapping

**What:** Map tree view node clicks to corresponding graph node IDs

**When to use:** Supporting navigation from TreeView to internal subagent nodes in graph

**Example:**
```typescript
// Source: TreeView.tsx:178-184 (existing pattern)
if (parentSubagentId && selectedSessionId) {
  // Clicking on a node inside a subagent session
  expandAllSubagentBoxes(selectedSessionId, [parentSubagentId]);
  // Map internal node to graph node ID:
  // For model outputs: `${sessionId}-${subagentId}-model-${nodeId}`
  const graphNodeId = createNodeId(selectedSessionId, `${parentSubagentId}-${node.id}`);
  setFocusedNode(graphNodeId);
}
```

### Anti-Patterns to Avoid

- **Recreating box container as React Flow parent node:** React Flow doesn't support true hierarchical parent-child rendering. Use visual grouping via positioning and edges instead.
- **Mixing internal node rendering modes:** If expanded, ALL internal nodes must be React Flow nodes (not some as nodes, some as box-internal cards). Consistency prevents edge connection issues.
- **Hard-coding node positions:** Always use dagre for positioning. Manual positions break on graph changes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Graph layout algorithm | Custom node positioning logic | dagre.layout() | Handles rank assignment, edge routing, collision avoidance automatically |
| State persistence | Custom localStorage wrapper | Zustand's existing expandedSubagentBoxes Map | Already proven pattern in Phase 17 |
| Node click handling | Custom event propagation | React Flow's onNodeClick with type discrimination | Handles z-index, event bubbling, selection state |
| Edge connection validation | Manual source/target checks | React Flow's built-in edge validation | Prevents invalid connections, handles node removal |

**Key insight:** React Flow is designed for dynamic node graphs. Leverage its node lifecycle (add/remove on expand/collapse) rather than fighting it with manual DOM manipulation.

## Common Pitfalls

### Pitfall 1: Edge Connection Points with Nested Nodes

**What goes wrong:** Edges connecting to/from internal nodes may not align properly with box container boundaries

**Why it happens:** dagre positions nodes independently; box visual boundary isn't a real React Flow container

**How to avoid:**
- Use invisible "join" nodes at box entry/exit points (existing pattern from Phase 11 parallel subagents)
- Connect main timeline → entry join → first internal node
- Connect last internal node → exit join → next main node

**Warning signs:** Edges appear to start/end in empty space, or cross box boundaries incorrectly

### Pitfall 2: Duplicate Node IDs Between Collapsed and Expanded States

**What goes wrong:** React Flow throws errors about duplicate node IDs when switching expand states

**Why it happens:** Box node ID conflicts with internal node IDs if not namespaced properly

**How to avoid:**
- Box node: `${sessionId}-${subagentId}-box`
- Internal nodes: `${sessionId}-${subagentId}-request`, `${sessionId}-${subagentId}-tool-${toolId}`, etc.
- Never reuse the plain subagentId as a node ID

**Warning signs:** Console errors "Node with id X already exists", graph flickering on expand/collapse

### Pitfall 3: Model Output Node Data Structure Mismatch

**What goes wrong:** Model output nodes don't have a corresponding AnyNode type in shared types

**Why it happens:** Phase 17 added 'model' to internal node types but didn't add ModelOutputNode to shared AnyNode union

**How to avoid:**
- Create synthetic node data when clicking model output nodes (existing pattern in GraphView.tsx:148-166)
- OR: Add MessageNode to detail panel's accepted types and pass through the original assistant message
- Use NodeDetail component's message rendering for model outputs

**Warning signs:** TypeScript errors in detail panel, model outputs show "undefined" content

### Pitfall 4: Tree-to-Graph Navigation ID Mismatch

**What goes wrong:** Clicking model outputs in tree view doesn't navigate to corresponding graph node

**Why it happens:** TreeView uses original node IDs, but graph uses prefixed IDs for internal nodes

**How to avoid:**
- Extend TreeView's selectNode logic to detect when node is inside a subagent
- Build graph node ID using same pattern: `createNodeId(selectedSessionId, ${parentSubagentId}-${node.id})`
- Pass `parentSubagentId` context through TreeView's recursive rendering

**Warning signs:** Navigation works for regular nodes but fails for model outputs in subagents

## Code Examples

Verified patterns from codebase analysis:

### Conditional Node Generation (Collapsed vs Expanded)
```typescript
// Source: graphLayout.ts:839-842, 1005-1026
const isExpanded = expandedSubagentBoxes.has(subagent.id);

if (isExpanded) {
  // Generate individual React Flow nodes for internal workflow
  const internalRFNodes: Node<CustomNodeData>[] = [];

  // Request node
  const requestNodeId = createNodeId(session.id, `${subagent.id}-request`);
  internalRFNodes.push({
    id: requestNodeId,
    type: 'request',
    position: { x: 0, y: 0 },
    data: { label: 'Request', state: subagent.state, prompt: requestText },
  });

  // Tool and model nodes from internalNodes array...

  // Response node
  const responseNodeId = createNodeId(session.id, `${subagent.id}-response`);
  internalRFNodes.push({
    id: responseNodeId,
    type: 'response',
    position: { x: 0, y: 0 },
    data: { label: 'Response', state: subagent.state, summary: responseText },
  });

  nodes.push(...internalRFNodes);
  // Add edges between internal nodes...
} else {
  // Generate collapsed box node (existing Phase 17 code)
  const boxNode: Node<SubagentBoxNodeData> = { /* ... */ };
  nodes.push(boxNode);
}
```

### Model Output Node Generation
```typescript
// Source: graphLayout.ts:698-704, 933-941 (pattern for internal nodes)
// Build from existing internalNodes array with type 'model'
internalNodes.forEach((internalNode) => {
  if (internalNode.type === 'model') {
    const modelNodeId = createNodeId(session.id, `${subagent.id}-${internalNode.id}`);
    const modelRFNode: Node<ModelOutputNodeData> = {
      id: modelNodeId,
      type: 'model-output',
      position: { x: 0, y: 0 },
      data: {
        label: internalNode.label,  // "Model Output" or "Model Output (3)"
        state: internalNode.state,
        content: internalNode.content || '',
        count: internalNode.count,
        nodeData: internalNode.nodeData,  // Original MessageNode(s)
      },
    };
    nodes.push(modelRFNode);
  }
});
```

### Tree-to-Graph Navigation for Subagent Internal Nodes
```typescript
// Source: TreeView.tsx:174-184 (existing pattern to extend)
const selectNode = useCallback(
  (nodeKey: string, node: TreeNodeData, parentSubagentId?: string) => {
    setSelectedNodeKey(nodeKey);
    onNodeSelect?.(node);

    if (parentSubagentId && selectedSessionId) {
      // Node is inside a subagent session
      expandAllSubagentBoxes(selectedSessionId, [parentSubagentId]);

      // Build graph node ID for internal node
      const graphNodeId = createNodeId(selectedSessionId, `${parentSubagentId}-${node.id}`);
      setFocusedNode(graphNodeId);
    }
    // ... existing logic for regular nodes
  },
  [selectedSessionId, expandAllSubagentBoxes, setFocusedNode]
);
```

### Node Type Registration
```typescript
// Source: GraphView.tsx:31-41
import { ModelOutputNode } from './nodes/ModelOutputNode';
import { RequestNode } from './nodes/RequestNode';
import { ResponseNode } from './nodes/ResponseNode';

const nodeTypes: NodeTypes = {
  session: SessionNode,
  'subagent-box': SubagentBoxNode,
  'request': RequestNode,
  'response': ResponseNode,
  'model-output': ModelOutputNode,
  subagent: SubagentNode,  // Legacy, may be removed
  tool: ToolNode,
  'tool-group': ToolGroupNode,
  skill: SkillNode,
  'user-prompt': UserPromptNode,
  'clear-marker': ClearMarkerNode,
  'join-node': JoinNode,
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Subagent boxes contain visual cards (divs) for internal nodes | Subagent boxes expand to reveal React Flow nodes in main graph | Phase 19 (planned) | Enables direct interaction, tree-to-graph nav, consistent styling |
| Model responses invisible in timeline | Model outputs rendered as nodes between tool calls | Phase 17-04 (2026-02-12) | Shows assistant reasoning between tools |
| Subagent nodes as start/stop pairs | Subagent boxes with expand/collapse | Phase 17 (2026-02-12) | Better visualization of workflow |
| Parallel subagents on separate branches | Parallel subagents stacked vertically with join nodes | Phase 11 (2026-02-09) | Clearer parallelism visualization |

**Deprecated/outdated:**
- SubagentNode component (start/stop pairs): Replaced by SubagentBoxNode in Phase 17. May still exist in codebase but no longer generated by graphLayout.ts for new sessions.
- expandedSubagents state: Used by old subagent node expansion. Replaced by expandedSubagentBoxes Map in Phase 17.

## Open Questions

1. **Should collapsed boxes remain as visual nodes when expanded, or be removed entirely?**
   - What we know: Phase 17 renders either box OR internal cards; React Flow allows rendering both simultaneously
   - What's unclear: Whether a ghost/outline box helps visual grouping or creates confusion
   - Recommendation: Remove box node entirely when expanded, rely on edge routing and node positioning to show grouping. Simpler mental model.

2. **How should model output groups (multiple consecutive responses) be represented?**
   - What we know: graphLayout.ts already groups consecutive model outputs (groupConsecutiveModelOutputs function)
   - What's unclear: Single node with "(3)" count label, or 3 separate nodes?
   - Recommendation: Single node with count indicator (matches tool-group pattern). Click opens drill-down panel showing all messages.

3. **Should request/response nodes be reusable components or specialized variants?**
   - What we know: Both are simple label-only nodes with click-to-detail behavior
   - What's unclear: Worth creating RequestNode.tsx and ResponseNode.tsx, or reuse generic LabelNode?
   - Recommendation: Create specialized components for semantic clarity and future styling (e.g., request nodes green, response nodes blue). Low cost, high maintainability.

## Sources

### Primary (HIGH confidence)
- Codebase: `client/src/utils/graphLayout.ts` (lines 69-100, 605-746, 839-1023) - Subagent box generation with internalNodes array
- Codebase: `client/src/components/GraphView.tsx` (lines 31-41, 133-243) - Node type registry and click handling
- Codebase: `client/src/components/nodes/SubagentBoxNode.tsx` (lines 181-363) - Expanded box rendering with internal cards
- Codebase: `client/src/components/TreeView.tsx` (lines 174-200) - Tree-to-graph navigation pattern
- Codebase: `.planning/phases/17-subagent-workflow-visualization/17-01-PLAN.md` - Phase 17 architecture decisions
- Official docs: React Flow 12.0 Node Types - https://reactflow.dev/api-reference/types/node

### Secondary (MEDIUM confidence)
- Codebase: `client/src/store/sessionStore.ts` (lines 49-50, 75-78) - expandedSubagentBoxes state pattern

### Tertiary (LOW confidence)
- None (all findings verified with codebase analysis)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified in package.json
- Architecture: HIGH - Patterns extracted from working Phase 17 implementation
- Pitfalls: MEDIUM - Based on common React Flow issues and codebase patterns, not battle-tested in this specific context

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - stable dependencies, React Flow 12 is current)
