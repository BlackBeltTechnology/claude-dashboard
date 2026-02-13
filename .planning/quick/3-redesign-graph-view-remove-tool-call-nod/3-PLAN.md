---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/utils/graphLayout.ts
  - client/src/components/nodes/SubagentNode.tsx
  - client/src/components/GraphView.tsx
  - client/src/components/nodes/index.ts
autonomous: true
must_haves:
  truths:
    - "Main graph only shows session nodes, subagent start/stop nodes, and skill nodes -- NO tool call nodes or tool-group nodes on the main timeline"
    - "Each subagent renders as a START node (showing request/prompt when clicked) and a STOP node (showing response/result when clicked)"
    - "Each subagent start node contains an expandable tool call list with tool name + key input params visible in each header row"
    - "Parallel subagents fork from a single point into parallel branches and converge back to a main line"
    - "Sequential subagents chain linearly along the main line"
  artifacts:
    - path: "client/src/utils/graphLayout.ts"
      provides: "Redesigned graph layout that filters tool calls from main timeline, creates subagent-start and subagent-stop node pairs"
    - path: "client/src/components/nodes/SubagentNode.tsx"
      provides: "Redesigned SubagentNode with start/stop variants, embedded tool call list with expandable items showing tool name + input params"
    - path: "client/src/components/GraphView.tsx"
      provides: "Updated click handlers for subagent start/stop nodes"
  key_links:
    - from: "client/src/utils/graphLayout.ts"
      to: "client/src/components/nodes/SubagentNode.tsx"
      via: "SubagentNodeData shape must match what layout provides"
      pattern: "SubagentNodeData"
    - from: "client/src/components/GraphView.tsx"
      to: "client/src/utils/graphLayout.ts"
      via: "createLayoutedGraph provides nodes/edges"
      pattern: "createLayoutedGraph"
---

<objective>
Redesign the graph view to show a clean subagent-centric timeline instead of a tool-call-heavy graph.

Purpose: The current graph is cluttered with individual tool call nodes. Users need a high-level view showing only subagent/task activity on the main timeline, with tool calls accessible as an expandable list within each subagent node.

Output: Redesigned graph showing session -> subagent start/stop pairs with embedded tool call lists, parallel branching, and no tool nodes on the main line.
</objective>

<context>
@client/src/utils/graphLayout.ts
@client/src/components/GraphView.tsx
@client/src/components/nodes/SubagentNode.tsx
@client/src/components/nodes/index.ts
@client/src/store/sessionStore.ts
@shared/src/index.ts
@client/src/components/GroupDrillDownPanel.tsx
@client/src/utils/toolFormatters.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Redesign graph layout to show only subagent/task nodes on main timeline</name>
  <files>
    client/src/utils/graphLayout.ts
  </files>
  <action>
Completely rewrite the `convertSessionToGraph` function in graphLayout.ts to implement the new graph model:

**Main timeline filtering:**
- The main session timeline should ONLY contain: the session node, subagent-start nodes, subagent-stop nodes, and skill nodes.
- Remove ALL tool nodes, tool-group nodes from the main timeline. Do NOT create React Flow nodes for individual tool calls or tool groups on the main graph line.
- Remove the `groupConsecutiveToolCalls` import and usage for the main session processing loop (it may still be used inside subagent expansion, but the main loop no longer needs it).

**Subagent node pairs (start + stop):**
- For each subagent in `session.subagents`, create TWO nodes on the main timeline:
  1. `subagent-start` node: Uses type `'subagent'` with React Flow node type `'subagent'`. Data includes `variant: 'start'`, the subagent's `prompt` (request), `description`, `agentType`, `state`, `model`, and crucially `toolCalls` -- an array of `{ toolName: string; inputSummary: string }[]` extracted from the subagent's `nodes` array (only type === 'tool' entries). The `inputSummary` should be a short preview string: for Bash tools show first 60 chars of `input.command`, for Read/Write show `input.file_path` (last path segment), for Grep show `input.pattern`, for all others show first key-value pair truncated to 60 chars.
  2. `subagent-stop` node: Uses type `'subagent'` with variant `'stop'`. Data includes the subagent's final `state`, the subagent session's `summary` (as the "response"), and the subagent's `lastActivity` timestamp.

- Edge from subagent-start to subagent-stop with purple stroke `#8b5cf6`.

**Helper function for tool call summary extraction:**
Create a helper function `extractToolCallSummaries(subagent: Session): ToolCallSummary[]` where:
```typescript
interface ToolCallSummary {
  toolName: string;
  inputSummary: string;
  state: SessionState;
}
```
This iterates `subagent.nodes`, filters to `type === 'tool'`, and generates the `inputSummary` based on the tool name:
- `Bash`: first 60 chars of `input.command` or "(no command)"
- `Read`: last path segment of `input.file_path` or "(no file)"
- `Write`: last path segment of `input.file_path` or "(no file)"
- `Edit`: last path segment of `input.file_path` or "(no file)"
- `Grep`: `input.pattern` truncated to 40 chars or "(no pattern)"
- `Glob`: `input.pattern` truncated to 40 chars or "(no pattern)"
- Default: first key name + first 40 chars of first value, or "(...)"

**Parallel subagent branching (keep existing fork-join pattern but adapted):**
- Keep the existing `detectParallelSubagentGroups` logic for detecting parallel subagents by shared parentId.
- For PARALLEL groups: fork from chainPoint, each branch gets start+stop pair, all stop nodes converge to a join node. The join node is the invisible join-node type already existing.
- For SEQUENTIAL subagents: chain start->stop nodes linearly on the main line (chainPoint -> start -> stop -> next chainPoint).

**Skill nodes on main timeline:**
- Skill nodes from the session's own `session.nodes` array (type === 'skill') should still appear on the main timeline, chained sequentially between subagent pairs.

**SubagentNodeData update:**
Update the `SubagentNodeData` interface usage (the actual interface is in SubagentNode.tsx -- coordinate with Task 2). The data passed to subagent nodes should now include:
```
{
  label: string;
  state: SessionState;
  agentType: string;
  description?: string;
  variant: 'start' | 'stop';
  prompt?: string;          // Only on 'start' variant -- the request
  summary?: string;         // Only on 'stop' variant -- the response
  model?: string;           // Only on 'start' variant
  toolCalls?: ToolCallSummary[];  // Only on 'start' variant
  toolCallCount?: number;   // Keep for backward compat
  isExpanded?: boolean;     // Whether tool list is expanded
}
```

**Node dimensions:**
Update `NODE_DIMENSIONS` -- the subagent type should have slightly larger dimensions to accommodate the tool call list: `{ width: 220, height: 90 }`. Remove the entries for 'tool', 'tool-group' from NODE_DIMENSIONS since they no longer appear on the main graph (keep them if needed for backward compat but they won't be used).

**Remove old expandSubagentInline function:**
The old `expandSubagentInline` function that created inline tool/tool-group/skill React Flow nodes inside subagent branches is no longer needed. Tool calls are now embedded in the SubagentNode component's data, not as separate graph nodes. Delete this function entirely.

**Remove old main-timeline tool processing:**
In the main `groupedItems` loop, remove the branches for `item.type === 'tool-group'`, `item.type === 'tool'`. Only keep `item.type === 'skill'` and `item.type === 'subagent'` (though subagent handling from `session.nodes` may just be skipped since actual subagent sessions are processed via `session.subagents`).

Actually, rethink the approach: Instead of iterating `groupedItems` from `session.nodes`, the new main loop should:
1. Start with sessionNode as prevNodeId.
2. Iterate `session.nodes` and only process `type === 'skill'` nodes (add them to the main chain).
3. Then process `session.subagents` (sorted by createdAt) to create start/stop pairs. But we need to interleave skills and subagents chronologically.

Better approach: Build a unified timeline from both `session.nodes` (skills only) and `session.subagents` (as start/stop pairs), sorted by timestamp. Then chain them linearly on the main line. For parallel subagents (same parentId), fork-join them.

Implementation steps:
1. Collect skill nodes from `session.nodes` with their timestamps.
2. Collect subagent sessions from `session.subagents` with their `createdAt` timestamps.
3. Sort all items chronologically.
4. Detect parallel subagent groups (2+ subagents with same parentId).
5. Chain through the sorted items:
   - For a skill: add skill node, chain from prevNodeId.
   - For a sequential subagent: add start node, chain from prevNodeId -> start -> stop, update prevNodeId to stop.
   - For a parallel subagent group: fork from prevNodeId, each branch gets start -> stop, all converge to join node, update prevNodeId to join.

Export the `ToolCallSummary` type so SubagentNode.tsx can import it.
  </action>
  <verify>
Run `npm run build` from the project root. The build should succeed with no TypeScript errors in graphLayout.ts. Verify that tool nodes and tool-group nodes are no longer created in the main graph conversion functions.
  </verify>
  <done>
graphLayout.ts produces a graph with only session, subagent (start/stop variants), skill, and join-node types. No tool or tool-group nodes appear in the main timeline. Parallel subagents fork and converge. Each subagent-start node carries toolCalls data with tool name + input summary.
  </done>
</task>

<task type="auto">
  <name>Task 2: Redesign SubagentNode component with start/stop variants and embedded tool list</name>
  <files>
    client/src/components/nodes/SubagentNode.tsx
    client/src/components/nodes/index.ts
    client/src/components/GraphView.tsx
  </files>
  <action>
**SubagentNode.tsx -- Complete redesign:**

Update `SubagentNodeData` interface to match the new data shape from graphLayout.ts:
```typescript
import type { SessionState } from 'shared';
import type { ToolCallSummary } from '../../utils/graphLayout';

export interface SubagentNodeData {
  label: string;
  state: SessionState;
  agentType: string;
  description?: string;
  variant: 'start' | 'stop';
  prompt?: string;            // request text (start variant)
  summary?: string;           // response text (stop variant)
  model?: string;
  toolCalls?: ToolCallSummary[];
  toolCallCount?: number;
  isExpanded?: boolean;       // whether tool call list is shown
  [key: string]: unknown;
}
```

Redesign the SubagentNode component to render differently based on `variant`:

**Start variant (`variant === 'start'`):**
- Header shows: subagent icon (existing SVG), label (description or "Task Agent"), status dot.
- Below header: "Request" label in small muted text.
- If `prompt` exists, show first 80 chars truncated with "..." as a preview line in muted italic text. Full prompt is shown in the side panel when clicked.
- Below the prompt preview: "Tool Calls ({count})" expandable section header.
  - The expansion is visual-only within the node (not React Flow expansion). Use component-local `useState` for `showTools` toggle.
  - When expanded, render a compact scrollable list (max-height ~200px, overflow-y auto) of tool calls from `data.toolCalls`.
  - Each tool call row shows: a small tool icon (reuse the TOOL_ICONS map from ToolNode.tsx -- copy the same SVG icons), the tool name in white, and the `inputSummary` in muted gray monospace text. Each row is ~24px tall, compact.
  - When collapsed, just show the count badge: "{N} tools" with a chevron indicator.
- Color scheme: purple border/handles (`#8b5cf6`) with green-ish bg for active state (existing STATUS_COLORS pattern).

**Stop variant (`variant === 'stop'`):**
- Smaller, more compact node.
- Header shows: checkmark or stop icon, "Complete" or the state label, status dot.
- If `summary` exists, show first 60 chars as preview text.
- Color scheme: same STATUS_COLORS but with a slightly different icon to distinguish from start.
- Dimensions should be smaller than start node: no tool list, just a summary line.

**Visual distinction between start/stop:**
- Start node: left border accent of 3px purple `#8b5cf6`, standard shape.
- Stop node: left border accent of 3px blue `#3b82f6`, slightly smaller dimensions, different icon.

**Handle positions:** Both use Left/Right positions for LR layout (same as current).

**Node dimensions note:** The start node is larger (accommodates tool list when expanded). The stop node is compact. Since React Flow node dimensions are set in dagre layout, the node CSS should accommodate both states. Set `minWidth: 200px` for start, `minWidth: 140px` for stop.

**GraphView.tsx updates:**

Update the `onNodeClick` handler for subagent nodes:
- When clicking a `subagent` node with `variant === 'start'`: open the NodeDetail side panel with the subagent node data (same as current behavior finding the SubagentNode from session.nodes). The panel shows the full prompt/request.
- When clicking a `subagent` node with `variant === 'stop'`: open the NodeDetail side panel with the subagent data. The panel shows the summary/response. To support this, we need to find the matching Session from `session.subagents` and pass it as selectedNodeData. Actually, use the existing SubagentDetailFormatter which already shows prompt and description. For the stop variant, create a synthetic AnyNode with the summary as the main content.

Actually, simplify: Both start and stop clicks open the same SubagentNode detail in the side panel (the existing SubagentDetailFormatter already shows prompt, description, model, sourceFilePath). The key difference is what's highlighted. For now, just open the detail panel for the SubagentNode (matched by agentId) regardless of variant. The start node click no longer toggles subagent expansion (tool calls are now embedded in the node itself, not as separate graph nodes). Remove the `toggleSubagentExpansion` call from the subagent click handler.

Remove the tool-group click handler and tool node click handler from GraphView since these node types no longer appear on the graph. Clean up the imports: remove ToolGroupNode, ToolNode imports from GraphView.tsx if they are no longer registered as nodeTypes. Actually, keep them registered in nodeTypes in case they appear in other contexts, but they won't be created by the main graph. To be safe, keep the nodeTypes registration but remove the click handling logic for tool and tool-group types (they can be no-ops).

**index.ts updates:**
No changes needed -- the existing exports are fine. JoinNode is still used.
  </action>
  <verify>
Run `npm run build` from the project root. The build should succeed. Open the dashboard in a browser at http://localhost:5173, navigate to the graph view, and verify:
1. Main timeline shows only session node and subagent start/stop pairs (no tool nodes).
2. Each subagent start node shows a tool call count that can be expanded to show the list.
3. Each tool call row in the expanded list shows tool name + input summary.
4. Clicking a subagent node opens the detail panel.
5. Parallel subagents branch out and converge back to a single line.
  </verify>
  <done>
SubagentNode renders as start/stop variants with embedded expandable tool call list. GraphView click handlers updated. No tool call nodes appear on the main graph. Parallel branching works with proper fork-join convergence.
  </done>
</task>

</tasks>

<verification>
1. `npm run build` succeeds with no TypeScript errors across all workspaces.
2. The graph view shows a clean timeline: Session -> [Skill/Subagent-Start/Subagent-Stop nodes only].
3. No ToolNode or ToolGroupNode appears on the main graph timeline.
4. Each subagent-start node shows an expandable tool call list with tool name + input params summary.
5. Each subagent-stop node shows a compact completion indicator with optional summary preview.
6. Parallel subagents fork into parallel branches and converge back to the main line.
7. Sequential subagents chain linearly.
8. Clicking subagent nodes opens the detail side panel with full information.
</verification>

<success_criteria>
- Graph view only contains session, subagent-start, subagent-stop, skill, and invisible join nodes.
- Tool calls are accessible via the expandable list inside each subagent-start node, showing tool name and key input parameter.
- Parallel subagent branches fork from and converge back to a main line.
- Build passes, no runtime errors when viewing graph.
</success_criteria>

<output>
After completion, create `.planning/quick/3-redesign-graph-view-remove-tool-call-nod/3-SUMMARY.md`
</output>
