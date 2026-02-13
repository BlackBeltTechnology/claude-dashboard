---
phase: 27-add-agent-response-groups-model-output-n
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/utils/graphLayout.ts
autonomous: true
must_haves:
  truths:
    - "Assistant model output messages appear in the main session timeline graph between tool calls, user prompts, and subagent boxes"
    - "Consecutive model outputs are grouped into a single node with count badge"
    - "Model output nodes are clickable and show content in the detail panel"
  artifacts:
    - path: "client/src/utils/graphLayout.ts"
      provides: "Main timeline model output node generation"
      contains: "model-output"
  key_links:
    - from: "client/src/utils/graphLayout.ts"
      to: "ModelOutputNode component"
      via: "type: 'model-output' in React Flow node"
      pattern: "type: 'model-output'"
---

<objective>
Add assistant model output nodes (agent responses) to the main session timeline graph.

Purpose: Currently, assistant messages (type 'message', role 'assistant') are filtered out of the main timeline at line 354. They should appear as model-output nodes interleaved chronologically with tool calls, user prompts, subagent boxes, and clear markers -- exactly as they already do inside expanded subagent boxes.

Output: Updated graphLayout.ts with model outputs in the main timeline.
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@client/src/utils/graphLayout.ts
@client/src/components/nodes/ModelOutputNode.tsx
@shared/src/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add model output nodes to main session timeline</name>
  <files>client/src/utils/graphLayout.ts</files>
  <action>
In `convertSessionToGraph()`, modify the main timeline builder to include assistant message nodes and render them as model-output React Flow nodes.

**Step 1 - Collect assistant messages into the timeline (around line 350-370):**

After the existing collection loops (skills, user-prompts, clear-markers) and BEFORE the tool grouping block, add a new loop that collects assistant message nodes into the timeline:

```typescript
// Collect assistant message nodes (model outputs)
for (const node of session.nodes) {
  if (node.type === 'message' && node.role === 'assistant' && typeof node.content === 'string' && node.content.trim() !== '') {
    timeline.push({
      type: 'model' as any,
      timestamp: node.timestamp,
      data: node,
    });
  }
}
```

Add `'model'` to the `TimelineItem.type` union at line 312:
```typescript
type: 'skill' | 'tool' | 'tool-group' | 'subagent' | 'user-prompt' | 'clear-marker' | 'model';
```

**Step 2 - Group consecutive model outputs after sorting:**

After `timeline.sort()` at line 383, apply grouping. The approach: after sorting the timeline, we need to group consecutive `model` items. Create a processed timeline where consecutive model items become model-groups.

The simplest approach: process model items inline during the timeline iteration, accumulating consecutive model items and emitting grouped model-output nodes.

**Step 3 - Add the 'model' case to timeline processing (after the clear-marker case, before the subagent case):**

Track consecutive model accumulation with a helper. When we encounter a 'model' item, peek ahead to see if the next item is also 'model'. Accumulate them, and when the run ends, emit a single model-output node (or grouped model-output if count > 1).

Actually, the simplest approach is to pre-process the sorted timeline to merge consecutive model items before the main loop. After `timeline.sort()`:

```typescript
// Group consecutive model outputs in timeline
const processedTimeline: (TimelineItem | { type: 'model-group'; timestamp: number; nodes: AnyNode[]; count: number })[] = [];
let i = 0;
while (i < timeline.length) {
  if (timeline[i].type === 'model') {
    // Collect consecutive model items
    const modelNodes: AnyNode[] = [timeline[i].data as AnyNode];
    const firstTimestamp = timeline[i].timestamp;
    let j = i + 1;
    while (j < timeline.length && timeline[j].type === 'model') {
      modelNodes.push(timeline[j].data as AnyNode);
      j++;
    }
    if (modelNodes.length === 1) {
      processedTimeline.push(timeline[i]);
    } else {
      processedTimeline.push({
        type: 'model-group',
        timestamp: firstTimestamp,
        nodes: modelNodes,
        count: modelNodes.length,
      });
    }
    i = j;
  } else {
    processedTimeline.push(timeline[i]);
    i++;
  }
}
```

Then iterate over `processedTimeline` instead of `timeline`.

**Step 4 - Handle 'model' and 'model-group' in the processing loop:**

For single model items:
```typescript
} else if (item.type === 'model') {
  const node = item.data as AnyNode;
  if (node.type !== 'message') continue;

  const modelNodeId = createNodeId(session.id, node.id);
  const content = (node as any).content || '';

  const modelFlowNode: Node<ModelOutputNodeData> = {
    id: modelNodeId,
    type: 'model-output',
    position: { x: 0, y: 0 },
    data: {
      label: 'Model Output',
      state: node.state,
      content,
      agentColor: '#8b5cf6',  // Purple for main session model outputs
      nodeData: node,
    },
  };
  nodes.push(modelFlowNode);

  edges.push({
    id: `e-${chainPoint}-${modelNodeId}`,
    source: chainPoint,
    target: modelNodeId,
    type: 'smoothstep',
    animated: node.state === 'active',
    style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
  });

  chainPoint = modelNodeId;
```

For model-group items:
```typescript
} else if (item.type === 'model-group') {
  const group = item as any;
  const firstNode = group.nodes[0];
  const groupId = `model-group-main-${firstNode.id}`;
  const modelNodeId = createNodeId(session.id, groupId);
  const content = firstNode.content || '';

  const modelFlowNode: Node<ModelOutputNodeData> = {
    id: modelNodeId,
    type: 'model-output',
    position: { x: 0, y: 0 },
    data: {
      label: `Model Output (${group.count})`,
      state: firstNode.state,
      content,
      count: group.count,
      agentColor: '#8b5cf6',
      nodeData: group.count > 1 ? group.nodes : group.nodes[0],
      groupId,
    },
  };
  nodes.push(modelFlowNode);

  edges.push({
    id: `e-${chainPoint}-${modelNodeId}`,
    source: chainPoint,
    target: modelNodeId,
    type: 'smoothstep',
    animated: firstNode.state === 'active',
    style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
  });

  chainPoint = modelNodeId;
```

**Important:** The existing `nonMessageNodes` filter on line 354 is used ONLY for `groupConsecutiveToolCalls()`. It should remain as-is since we only want tool nodes grouped there. The assistant messages are collected separately via the new loop above.

**Do NOT modify** the subagent internal node logic (lines 588-1307). Only the main timeline processing is affected.
  </action>
  <verify>Run `npm run build` from the project root. It should compile without errors. Visually confirm in the dashboard that model output (purple) nodes now appear in the main session timeline between tool groups and user prompts.</verify>
  <done>Assistant model output messages appear as purple model-output nodes in the main session timeline graph, consecutive outputs are grouped with count badges, edges connect them in the chain, and the build succeeds without errors.</done>
</task>

</tasks>

<verification>
- `npm run build` passes without TypeScript or compilation errors
- Model output nodes appear in the main timeline graph for sessions that have assistant messages
- Consecutive model outputs are grouped into single nodes with "(N)" count labels
- Model output nodes are connected via edges in the chain between other timeline nodes
- Clicking model output nodes still works (existing click handler in GraphView)
</verification>

<success_criteria>
- Purple model-output nodes visible in main session timeline
- Grouped consecutive model outputs show count badge
- No TypeScript errors, build succeeds
- Subagent internal node rendering unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/27-add-agent-response-groups-model-output-n/27-SUMMARY.md`
</output>
