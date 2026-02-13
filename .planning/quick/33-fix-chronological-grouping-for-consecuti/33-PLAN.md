---
phase: quick-33
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/utils/groupingUtils.ts
  - client/src/utils/graphLayout.ts
  - client/src/store/sessionStore.ts
  - client/src/components/Toolbar.tsx
  - client/src/components/GraphView.tsx
autonomous: true
---

<objective>
Fix chronological grouping to only group truly consecutive same-name nodes, and add node type filter toggles to the session timeline toolbar.
</objective>

<tasks>
1. Rewrite groupConsecutiveToolCalls to only group consecutive same-name tools (not all same-name within a run)
2. Fix main timeline to pass all nodes (including messages) to grouping so messages break tool runs
3. Fix both subagent paths (parallel + sequential) to group in-place on chronological timeline
4. Add hiddenNodeTypes state to store with toggleNodeTypeVisibility action
5. Pass hiddenNodeTypes through createLayoutedGraph → convertSessionsToGraph → convertSessionToGraph
6. Apply filter on processedTimeline before generating RF nodes
7. Add filter chip buttons to Toolbar (Tools, Model, Prompts, Agents, Skills)
</tasks>
