# Phase 10: Fix subagent graph ordering and add subagent input/output inspection - Research

**Researched:** 2026-02-09
**Domain:** Graph layout algorithms (dagre), React Flow UI patterns
**Confidence:** MEDIUM

## Summary

Phase 10 addresses two distinct problems: (1) fixing the fork-join pattern that renders all subagents in parallel branches when they should appear sequentially, and (2) displaying subagent prompt/result data in the inspection UI.

The current implementation uses dagre's default ranking algorithm which places all nodes with edges from the same source (the fork point) at the same rank, creating parallel visual branches. Dagre provides limited built-in support for sequential ordering constraints—the primary mechanisms are edge weights, minlen parameters, and rank constraints (min/max/same_x), but explicit sequential ordering is not directly supported through the public API.

**Primary recommendation:** Use edge manipulation (chaining through intermediate nodes or adjusting minlen/weight) or post-layout coordinate adjustment to force sequential positioning. For subagent inspection, extend the existing NodeDetail.tsx renderSubagentContent to display prompt and result fields that already exist in the SubagentNode type but are not currently rendered.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| dagre | 0.8.x | Graph layout algorithm | De facto standard for hierarchical graph layouts in JavaScript, used throughout React Flow ecosystem |
| @xyflow/react | 12.x | Node-based UI framework | Industry standard for building interactive node graphs, used by current codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | N/A | No additional libraries needed | Existing stack sufficient |

**Installation:**
```bash
# Already installed in current project
# dagre@^0.8.5
# @xyflow/react@^12.x
```

## Architecture Patterns

### Current Fork-Join Pattern (Problem)
```typescript
// Lines 256-454 in graphLayout.ts
// Creates parallel branches by connecting all subagents to same fork point
const forkPointId = prevNodeId;
const joinNodeId = `${session.id}-join-after-subagents`;

for (const subagent of session.subagents) {
  // All edges start from same forkPointId → dagre places at same rank
  edges.push({
    source: forkPointId,
    target: subagentNodeId,
  });

  edges.push({
    source: branchTailId,
    target: joinNodeId,
  });
}
```

**Why it creates parallel layout:** Dagre's ranking algorithm places nodes at the same rank when they share the same source node and have the same distance from the root. All subagents fan out from forkPointId simultaneously.

### Pattern 1: Chain Through Invisible Nodes (Recommended)
**What:** Insert invisible "sequence" nodes between subagents to force sequential ordering
**When to use:** When you need strict sequential ordering without modifying dagre internals
**Example:**
```typescript
// Modified fork-join with sequential chaining
let chainPoint = forkPointId;

for (let i = 0; i < session.subagents.length; i++) {
  const subagent = session.subagents[i];
  const subagentNodeId = createNodeId(session.id, subagent.id);

  // Create invisible sequencer node for all but first subagent
  if (i > 0) {
    const seqNodeId = `${session.id}-seq-${i}`;
    nodes.push({
      id: seqNodeId,
      type: 'join-node',  // Reuse invisible node type
      position: { x: 0, y: 0 },
      data: { label: '' },
    });

    // Chain: previous end → sequencer → current subagent
    edges.push({
      source: prevBranchEnd,
      target: seqNodeId,
    });
    chainPoint = seqNodeId;
  }

  edges.push({
    source: chainPoint,
    target: subagentNodeId,
  });

  // Track branch end for chaining
  prevBranchEnd = expandedSubagents.has(subagent.id)
    ? branchTailId  // End of expanded tools
    : subagentNodeId;  // Just the subagent node
}
```

### Pattern 2: Rank Constraints (Limited)
**What:** Use dagre's rank attribute to force specific nodes to min/max/same_x ranks
**When to use:** When you need to group nodes at same level or pin to start/end
**Limitations:**
- Does NOT support sequential ordering (rank=0, rank=1, rank=2)
- Only supports: rank=min, rank=max, rank=same_X
- Reported reliability issues in dagre issue tracker

**API (not exposed in current codebase):**
```typescript
// Not currently available in graphLayout.ts
// Would require extending dagreGraph.setNode() calls
dagreGraph.setNode(nodeId, {
  width,
  height,
  rank: 'same_1'  // Group with other same_1 nodes
});
```

**Source:** [Dagre Issue #54 - Rank Constraints](https://github.com/dagrejs/dagre/issues/54)

### Pattern 3: Edge Weight and MinLen (Complex)
**What:** Adjust edge priority (weight) and minimum length (minlen) to influence ordering
**When to use:** Fine-tuning layout when other methods insufficient
**Limitations:** Indirect control, requires experimentation

```typescript
// When adding edges to dagre graph
edges.forEach((edge, index) => {
  dagreGraph.setEdge(edge.source, edge.target, {
    weight: 10 - index,  // Higher weight = straighter, shorter
    minlen: 1,           // Minimum ranks between nodes
  });
});
```

**Source:** [Dagre Wiki - Edge Configuration](https://github.com/dagrejs/dagre/wiki)

### Pattern 4: Post-Layout Y-Coordinate Adjustment (Fallback)
**What:** Run dagre layout, then manually adjust y-coordinates to enforce sequential ordering
**When to use:** When layout algorithm can't achieve desired result
**Example:**
```typescript
function enforceSequentialSubagents(
  nodes: Node[],
  edges: Edge[],
  subagentNodeIds: string[]
): Node[] {
  // First, run standard dagre layout
  const layoutedNodes = applyDagreLayout(nodes, edges);

  // Find subagent nodes and sort by original order
  const subagentNodes = layoutedNodes.filter(n =>
    subagentNodeIds.includes(n.id)
  );

  // Re-position vertically with fixed spacing
  const SEQUENTIAL_SPACING = 150;
  const startY = Math.min(...subagentNodes.map(n => n.position.y));

  subagentNodeIds.forEach((id, index) => {
    const node = layoutedNodes.find(n => n.id === id);
    if (node) {
      node.position.y = startY + (index * SEQUENTIAL_SPACING);
    }
  });

  return layoutedNodes;
}
```

### Subagent Inspection UI Pattern
**What:** Extend existing NodeDetail.tsx component to display prompt/result
**Current state:** SubagentNode type includes prompt, result, model, sourceFilePath fields but renderSubagentContent() doesn't display them
**Pattern:**
```typescript
// In NodeDetail.tsx - renderSubagentContent()
function renderSubagentContent(node: AnyNode & { type: 'subagent' }): React.ReactNode {
  return (
    <>
      {/* Existing: Agent ID, type, description */}

      {node.sourceFilePath && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Source File</div>
          <div style={styles.content}>{node.sourceFilePath}</div>
        </div>
      )}

      {node.prompt && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Input Prompt</div>
          <div style={styles.content}>{node.prompt}</div>
        </div>
      )}

      {node.model && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Model</div>
          <div style={styles.content}>{node.model}</div>
        </div>
      )}

      {/* Note: SubagentNode doesn't have result field in types */}
      {/* Would need to check if result is stored elsewhere */}
    </>
  );
}
```

**Source:** Current codebase - client/src/components/NodeDetail.tsx lines 453-482

### Anti-Patterns to Avoid
- **Don't modify dagre library source:** Forking dagre to add ordering features creates maintenance burden
- **Don't use hidden nodes with edges:** React Flow silently drops edges to/from hidden:true nodes (see JoinNode comment lines 261-264)
- **Don't assume rank constraints work reliably:** Dagre's rank feature has reported bugs and limited public API

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Graph layout algorithm | Custom positioning logic | dagre with edge chaining | Graph layout is NP-complete; dagre handles edge routing, node overlap, aspect ratios |
| Sequential node ordering | Custom layering algorithm | Invisible chain nodes + dagre | Dagre handles all layout constraints except sequential ordering; easier to chain nodes than rewrite layout engine |
| Node detail panels | Custom positioned overlays | React Flow Panel component | Handles viewport transforms, z-indexing, accessibility |

**Key insight:** Dagre is optimized for hierarchical layouts where parallelism is desirable (e.g., org charts, dependency graphs). Sequential ordering of parallel branches requires workarounds because it contradicts the algorithm's core assumptions.

## Common Pitfalls

### Pitfall 1: Assuming rank=N supports numeric ordering
**What goes wrong:** Setting rank=0, rank=1, rank=2 on nodes doesn't enforce sequential ranks
**Why it happens:** Dagre's rank attribute only recognizes 'min', 'max', and 'same_X' patterns—numeric ranks are ignored
**How to avoid:** Use edge chaining (Pattern 1) or invisible sequencer nodes
**Warning signs:** Nodes with different rank values still appear at same horizontal position in LR layout

**Source:** [Dagre Issue #54 Comments](https://github.com/dagrejs/dagre/issues/54)

### Pitfall 2: Using hidden:true for invisible nodes
**What goes wrong:** Edges to/from hidden nodes are silently dropped
**Why it happens:** React Flow skips rendering hidden nodes entirely, including their Handle components, so edge position calculation returns null
**How to avoid:** Use type:'join-node' pattern with manually rendered invisible div + handles (see client/src/components/nodes/index.ts lines 10-22)
**Warning signs:** Edges disappear in graph view without console errors

### Pitfall 3: Expecting edge weight alone to enforce sequential ordering
**What goes wrong:** Setting higher weights on sequential edges doesn't prevent parallel placement
**Why it happens:** Edge weight affects edge straightness/priority within a rank assignment, not the rank assignment itself
**How to avoid:** Combine weight with minlen or use structural constraints (chaining)
**Warning signs:** Edges look straighter but nodes remain at same rank

### Pitfall 4: Forgetting subagent result data location
**What goes wrong:** Looking for result field on SubagentNode when it might be stored in Session.nodes
**Why it happens:** Subagents are Sessions themselves, their "result" is the final state/output of all their nodes
**How to avoid:** Check Session.subagents structure—each subagent IS a Session with its own nodes[] array
**Warning signs:** Missing output data when prompt is available

## Code Examples

Verified patterns from codebase:

### Current Fork-Join Pattern (Source: graphLayout.ts:256-454)
```typescript
// Creates parallel layout (current problem)
if (session.subagents.length > 0) {
  const forkPointId = prevNodeId;
  const joinNodeId = `${session.id}-join-after-subagents`;

  nodes.push({
    id: joinNodeId,
    type: 'join-node',
    position: { x: 0, y: 0 },
    data: { label: '' },
  });

  for (const subagent of session.subagents) {
    edges.push({
      id: `e-fork-${forkPointId}-${subagentNodeId}`,
      source: forkPointId,  // All edges from same source
      target: subagentNodeId,
    });

    edges.push({
      id: `e-join-${branchTailId}-${joinNodeId}`,
      source: branchTailId,
      target: joinNodeId,
    });
  }

  prevNodeId = joinNodeId;
}
```

### Invisible Join Node Pattern (Source: nodes/index.ts:10-22)
```typescript
// Join node: invisible convergence point for fork-join pattern.
// Must render Handle components so React Flow can compute edge positions;
// without handles, getEdgePosition() returns null and all connected edges
// are silently dropped.
const joinHandleStyle = { opacity: 0, width: 1, height: 1 } as const;

const JoinNodeComponent = () =>
  createElement('div', { style: { width: 1, height: 1 } },
    createElement(Handle, { type: 'target', position: Position.Left, style: joinHandleStyle }),
    createElement(Handle, { type: 'source', position: Position.Right, style: joinHandleStyle }),
  );

export const JoinNode = memo(JoinNodeComponent);
```

### Dagre Layout Configuration (Source: graphLayout.ts:479-496)
```typescript
function applyDagreLayout(
  nodes: Node<CustomNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR'
): Node<CustomNodeData>[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: direction === 'LR' ? 80 : 60,   // Vertical space between parallel branches
    ranksep: direction === 'LR' ? 120 : 80,  // Horizontal space along timeline
    marginx: 20,
    marginy: 20,
  });

  // Add nodes and edges, run dagre.layout(), apply positions
}
```

### Existing SubagentNode Type (Source: shared/src/index.ts:53-62)
```typescript
// Subagent node (Task tool invocation)
export interface SubagentNode extends HierarchyNode {
  type: 'subagent';
  agentId: string;
  agentType: string;
  description?: string;
  sourceFilePath?: string;  // Available but not displayed
  prompt?: string;          // Available but not displayed
  model?: string;           // Available but not displayed
}
// Note: No result field—subagent output is in Session.nodes
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vertical (TB) graph layout | Horizontal (LR) timeline | Phase 7 (2026-02-09) | LR layout exposes parallel subagent placement more visibly |
| Side panel subagent tools | Inline expansion on branch | Phase 7 (2026-02-09) | Inline expansion makes sequential ordering more important |
| No subagent inspection | Click-to-inspect infrastructure exists | Phase 5 (2026-02-09) | NodeDetail.tsx ready for prompt/result fields |

**Deprecated/outdated:**
- graphlib-dot ordering attributes: Not supported in dagre public API despite code existing internally
- rank=numeric: Never supported, only 'min'/'max'/'same_X' work

## Open Questions

1. **Where is subagent result data stored?**
   - What we know: SubagentNode has prompt field, Session.subagents are full Sessions
   - What's unclear: Is "result" the final tool output, last message, or summary field?
   - Recommendation: Inspect JSONL session files in ~/.claude to verify structure

2. **Should sequential ordering apply to expanded or collapsed subagents?**
   - What we know: Collapsed subagents show just the subagent node; expanded shows inline tools
   - What's unclear: Does sequential layout apply to collapsed nodes only, or also affect expanded branch positioning?
   - Recommendation: User testing to determine which is more readable

3. **Do nested subagents need sequential ordering?**
   - What we know: Line 417 notes "Nested subagent -- render linearly (no recursive fork-join for simplicity)"
   - What's unclear: Should nested subagents within a subagent also be sequential?
   - Recommendation: Start with top-level only, extend if users request

## Sources

### Primary (HIGH confidence)
- Current codebase: client/src/utils/graphLayout.ts (lines 256-454 fork-join pattern, 479-530 dagre config)
- Current codebase: client/src/components/nodes/index.ts (lines 10-22 invisible node pattern)
- Current codebase: client/src/components/NodeDetail.tsx (lines 453-482 subagent rendering)
- Current codebase: shared/src/index.ts (lines 53-62 SubagentNode type definition)

### Secondary (MEDIUM confidence)
- [React Flow Dagre Layout Example](https://reactflow.dev/examples/layout/dagre) - Official example showing dagre integration
- [React Flow Panel Component](https://reactflow.dev/api-reference/components/panel) - Official docs for Panel component
- [Dagre GitHub Wiki](https://github.com/dagrejs/dagre/wiki) - Official documentation on graph configuration
- [Dagre Issue #54 - Rank Constraints](https://github.com/dagrejs/dagre/issues/54) - Maintainer responses on rank attribute behavior
- [Dagre Issue #112 - Edge Ordering](https://github.com/dagrejs/dagre/issues/112) - Discussion of ordering limitations

### Tertiary (LOW confidence)
- [Medium: Understanding Dagre Network-Simplex](https://medium.com/@angeloarcillas64/understanding-how-dagre-js-layout-works-ranker-network-simplex-5a4459b011c2) - Third-party explanation of ranking algorithm
- Community patterns for subagent UI - Feature requests across Claude Code, Cursor, OpenCode discussing subagent prompt visibility

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - dagre and @xyflow/react confirmed in package.json and current usage
- Architecture patterns: MEDIUM - Chain-through-nodes pattern is proven approach but not tested in this codebase
- Sequential ordering limitation: HIGH - Confirmed via dagre issue tracker and maintainer comments
- Subagent inspection UI: HIGH - NodeDetail.tsx infrastructure exists, SubagentNode fields documented
- Subagent result data location: LOW - Need to verify in actual JSONL session files

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable domain)
