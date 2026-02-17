---
phase: quick-43
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/components/TreeView.tsx
  - client/src/components/TreeNode.tsx
autonomous: true
requirements: [QUICK-43]
must_haves:
  truths:
    - "Collapsing a subagent in the tree view also collapses it in the graph view"
    - "Expanding a subagent in the tree view also expands it in the graph view"
    - "Subagent sessions in the tree view show agent-colored circle icon instead of generic folder"
    - "Subagent sessions use a fork/branch icon instead of the folder icon"
  artifacts:
    - path: "client/src/components/TreeView.tsx"
      provides: "Tree-to-graph collapse sync via toggleSubagentBox"
    - path: "client/src/components/TreeNode.tsx"
      provides: "Agent-colored icon and fork icon for subagent sessions"
  key_links:
    - from: "client/src/components/TreeView.tsx"
      to: "sessionStore.toggleSubagentBox"
      via: "onToggle callback for subagent sessions"
      pattern: "toggleSubagentBox"
---

<objective>
Sync subagent collapse/expand state between tree view and graph view, and replace the generic folder icon for subagent sessions in the tree with agent-appropriate colored icons.

Purpose: When users collapse/expand subagents in the tree, the graph should mirror that state. Subagent sessions should be visually distinct from root sessions.
Output: Updated TreeView.tsx and TreeNode.tsx with collapse sync and improved subagent icons.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@client/src/components/TreeView.tsx
@client/src/components/TreeNode.tsx
@client/src/store/sessionStore.ts
@client/src/components/nodes/SubagentBoxNode.tsx
@client/src/utils/graphLayout.ts (generateAgentColor function)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Sync tree subagent collapse/expand with graph subagent boxes</name>
  <files>client/src/components/TreeView.tsx</files>
  <action>
In TreeView.tsx, subagent sessions (Session objects where `node.id.length < 20`) currently use local `expandedNodes` state for expand/collapse. The graph uses `expandedSubagentBoxes` via `toggleSubagentBox(sessionId, subagentId)` in the store.

Changes needed in `TreeView.tsx`:

1. Import `toggleSubagentBox` from the store (already have `expandAllSubagentBoxes`):
   ```
   const toggleSubagentBox = useSessionStore((state) => state.toggleSubagentBox);
   ```

2. In the `renderNode` callback, where it determines `isExpanded` and `onToggle`, add a case for subagent sessions. Currently the code checks for `isToolGroup` and `isSubagentNode` (node.type === 'subagent'), but subagent sessions are Session objects (no `type` field) with `id.length < 20`. Add detection:
   ```typescript
   const isSubagentSession = !('type' in node) && node.id.length < 20;
   ```

3. For subagent sessions, derive `isExpanded` from `expandedSubagentBoxes` instead of local `expandedNodes`:
   - Use `useSessionStore.getState().isSubagentBoxExpanded(selectedSessionId!, node.id)` or inline the check against `expandedSubagentBoxes`.
   - Actually, since `expandedSubagentBoxes` is already subscribed in the graph, read it from the store. Add to TreeView:
     ```
     const expandedSubagentBoxes = useSessionStore((state) => state.expandedSubagentBoxes);
     ```
   - Then in renderNode:
     ```typescript
     const isSubagentBoxExp = isSubagentSession && selectedSessionId
       ? (expandedSubagentBoxes.get(selectedSessionId)?.has(node.id) ?? false)
       : false;
     ```

4. Update the `isExpanded` ternary to include subagent session case:
   ```typescript
   const isExpanded = isToolGroup
     ? expandedGroups.has(node.id)
     : isSubagentNode
       ? expandedSubagents.has(node.id)
       : isSubagentSession
         ? isSubagentBoxExp
         : expandedNodes.has(nodeKey);
   ```

5. Update the `onToggle` to call `toggleSubagentBox` for subagent sessions:
   ```typescript
   const onToggle = isToolGroup
     ? () => toggleGroupExpansion(node.id)
     : isSubagentNode
       ? () => toggleSubagentExpansion(node.id)
       : isSubagentSession && selectedSessionId
         ? () => toggleSubagentBox(selectedSessionId, node.id)
         : () => toggleNode(nodeKey);
   ```

6. Add `toggleSubagentBox` and `expandedSubagentBoxes` to the `useCallback` dependency array of `renderNode`.

This ensures that clicking the expand/collapse arrow on a subagent session in the tree view toggles the same `expandedSubagentBoxes` store state that the graph reads, keeping them in sync bidirectionally.
  </action>
  <verify>Run `npm run build` from the project root. Verify no TypeScript errors. Manually verify in browser: expand a subagent in tree -> graph shows it expanded; collapse in tree -> graph collapses it; collapse in graph -> tree shows it collapsed.</verify>
  <done>Subagent session expand/collapse in tree view is synced with graph view via shared `expandedSubagentBoxes` store state. Toggling in either view updates both.</done>
</task>

<task type="auto">
  <name>Task 2: Replace folder icon with colored agent icon for subagent sessions in tree</name>
  <files>client/src/components/TreeNode.tsx</files>
  <action>
In TreeNode.tsx, the `getNodeIcon` function returns `NODE_ICONS.session` (folder emoji) for all Session objects, including subagent sessions. The tree also doesn't show any agent color for subagent sessions.

Changes needed:

1. Update the `getNodeIcon` function to return a different icon for subagent sessions. Detect subagent sessions the same way: `!('type' in node) && node.id.length < 20`. Return a fork/branch icon instead of folder. Use the unicode character for shuffle/fork: keep the existing subagent icon `\u{1F500}` (shuffle arrows) which is already defined in NODE_ICONS but only used for SubagentNode type nodes, not Session-typed subagent sessions.

   ```typescript
   // It's a Session (root or subagent)
   if (node.id.length < 20) {
     return NODE_ICONS.subagent;  // Shuffle icon for subagent sessions
   }
   return NODE_ICONS.session;  // Folder for root sessions
   ```

2. Add `agentColor` rendering support to TreeNode. The TreeNodeProps interface needs a new optional prop:
   ```typescript
   agentColor?: string;
   ```

3. In the TreeNode component, when `agentColor` is provided, render a small colored circle (similar to SubagentBoxNode's agentColorCircle) next to the icon, before the status dot:
   ```tsx
   {/* Agent color indicator for subagent sessions */}
   {agentColor && (
     <div
       style={{
         width: '8px',
         height: '8px',
         borderRadius: '50%',
         backgroundColor: agentColor,
         flexShrink: 0,
         marginRight: '4px',
         border: '1px solid rgba(255, 255, 255, 0.3)',
       }}
     />
   )}
   ```
   Place this between the type icon span and the status dot div.

4. In TreeView.tsx, pass the `agentColor` prop when rendering subagent sessions. In the `renderNode` function, when building subagent session children (around line 398-449 where `isSubagentSession` is true), the parent session that spawned the subagent is the current session context. The `buildSubagentMeta` function already extracts agentType from SubagentNode entries. To get the color, use the same `generateAgentColor` function from graphLayout.ts.

   Import `generateAgentColor` from `../utils/graphLayout` in TreeView.tsx. (If it's not exported, export it first from graphLayout.ts.)

   Then in TreeView.tsx where subagent sessions are rendered (inside `buildSessionTimeline` results loop and the subagent session items), pass the agentColor:

   In the section where subagent sessions appear in the timeline (around the `for (const { item } of timelineItems)` loop), when the item is a Session (subagent), compute the color:
   ```typescript
   // For subagent sessions in timeline, compute agent color
   let itemAgentColor: string | undefined;
   if (!('type' in item)) {
     // It's a subagent session - get color from meta
     const meta = subagentMeta.get(item.id);
     const agentType = meta?.agentType || 'Task';
     itemAgentColor = generateAgentColor(item.id, agentType);
   }
   ```

   Then pass it through renderNode. Since renderNode calls TreeNode, add an `agentColor` parameter to renderNode's signature and pass it to `<TreeNode agentColor={agentColor}>`.

   Actually, a simpler approach: compute agentColor inside `getNodeIcon` area of TreeNode or determine it at the renderNode call site in TreeView and pass as a prop.

   Simplest approach - compute it in TreeNode.tsx directly:
   - Export `generateAgentColor` from graphLayout.ts (add `export` keyword if not already exported).
   - In TreeNode.tsx, import it and compute color for subagent sessions:
     ```typescript
     import { generateAgentColor } from '../utils/graphLayout';
     ```
   - Derive color in the component:
     ```typescript
     const agentColor = useMemo(() => {
       if (!('type' in node) && node.id.length < 20) {
         // Subagent session - generate color from ID
         return generateAgentColor(node.id, undefined);
       }
       return undefined;
     }, [node]);
     ```
   - Note: This won't have the agentType info. Better approach: pass agentColor as a prop from TreeView where we have subagentMeta available.

   **Final approach:** Add `agentColor?: string` to TreeNodeProps. In TreeView.tsx `renderNode`, add an `agentColor` parameter. When calling renderNode for subagent session items from the timeline, look up the subagentMeta to get agentType, then call `generateAgentColor(item.id, agentType)`. Pass the color through to TreeNode.

   Update the renderNode signature to accept `agentColor?: string` as the last parameter. In TreeNode JSX, pass `agentColor={agentColor}`.

   In TreeView.tsx where subagent session items are iterated in the timeline loop, compute and pass the color:
   ```typescript
   // In the timeline loop for both root and subagent session children:
   let itemAgentColor: string | undefined;
   if (!('type' in item)) {
     const meta = subagentMeta.get(item.id);
     itemAgentColor = generateAgentColor(item.id, meta?.agentType);
   }
   // Pass to renderNode call
   renderNode(item as TreeNodeData, depth, nodeKey, undefined, itemLabel, itemAgentColor)
   ```

   Make sure to update ALL renderNode call sites to include the new parameter (default `undefined` where not applicable).
  </action>
  <verify>Run `npm run build` from the project root. Verify no TypeScript errors. In browser: subagent sessions in tree should show shuffle icon (not folder) and a small colored circle matching the agent's color in the graph view.</verify>
  <done>Subagent sessions in tree view display a shuffle/fork icon instead of generic folder, plus a colored circle matching the agent's assigned color from the graph view.</done>
</task>

</tasks>

<verification>
- `npm run build` passes with zero errors
- Tree view subagent sessions show shuffle icon + colored dot instead of folder icon
- Collapsing a subagent in tree collapses it in graph (and vice versa)
- Expanding a subagent in tree expands it in graph (and vice versa)
- Root sessions still show folder icon (no regression)
- Tool groups and other node types unaffected
</verification>

<success_criteria>
1. Bidirectional collapse/expand sync between tree and graph for subagent sessions
2. Subagent sessions in tree show agent-type-appropriate icon (shuffle, not folder) with agent color indicator
3. Build passes, no regressions to existing tree/graph functionality
</success_criteria>

<output>
After completion, create `.planning/quick/43-tree-graph-subagent-collapse-sync-and-tr/43-SUMMARY.md`
</output>
