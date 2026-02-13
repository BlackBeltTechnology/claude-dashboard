---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/components/TreeView.tsx
  - client/src/components/GraphView.tsx
  - client/src/components/DirectoryOverview.tsx
  - client/src/components/SessionList.tsx
  - client/src/components/GroupDrillDownPanel.tsx
  - client/src/store/sessionStore.ts
autonomous: true

must_haves:
  truths:
    - "Clicking any node in tree view opens its metadata in the detail side panel"
    - "Clicking session/subagent/skill nodes in graph view opens metadata in the detail side panel"
    - "Clicking a session group header in the left panel switches to directory view"
    - "Graph view uses same filter logic as sidebar (respects showArchived, hiddenCwds)"
    - "Active/waiting sessions always appear in graph when showActive is true"
  artifacts:
    - path: "client/src/components/TreeView.tsx"
      provides: "Session and message node clicks trigger detail panel"
    - path: "client/src/components/GraphView.tsx"
      provides: "Aligned session filtering with store, session node detail on click"
    - path: "client/src/components/DirectoryOverview.tsx"
      provides: "Directory and session node clicks trigger detail panel"
    - path: "client/src/components/SessionList.tsx"
      provides: "Session group header click navigates to directory view"
    - path: "client/src/components/GroupDrillDownPanel.tsx"
      provides: "Renders session metadata via NodeDetail for session-type selectedNodeData"
  key_links:
    - from: "TreeView.tsx selectNode"
      to: "store.setSelectedNodeData"
      via: "Click handler for session and message nodes"
    - from: "GraphView.tsx onNodeClick"
      to: "store.setSelectedNodeData"
      via: "Session node click finds Session object and sets it as selectedNodeData"
    - from: "SessionList.tsx CollapsibleSessionGroup"
      to: "store.setViewMode('directory')"
      via: "Group header click switches to directory view"
    - from: "GraphView.tsx sessions filter"
      to: "store.getFilteredSessions"
      via: "Replaces hardcoded filter with store selector"
---

<objective>
Fix three issues: (1) node click metadata inspection across all views, (2) session group click navigates to directory overview, (3) running agents visibility in graph view.

Purpose: Make all clickable nodes show their metadata in the detail panel regardless of which view the user is in, enable quick directory navigation from session groups, and fix graph view filtering to show all relevant sessions.
Output: Updated TreeView, GraphView, DirectoryOverview, SessionList, and GroupDrillDownPanel components.
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@client/src/components/TreeView.tsx
@client/src/components/GraphView.tsx
@client/src/components/DirectoryOverview.tsx
@client/src/components/SessionList.tsx
@client/src/components/GroupDrillDownPanel.tsx
@client/src/components/NodeDetail.tsx
@client/src/store/sessionStore.ts
@shared/src/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix node click metadata inspection in all views + session detail in GroupDrillDownPanel</name>
  <files>
    client/src/components/TreeView.tsx
    client/src/components/GraphView.tsx
    client/src/components/DirectoryOverview.tsx
    client/src/components/GroupDrillDownPanel.tsx
    client/src/store/sessionStore.ts
  </files>
  <action>
**TreeView.tsx** - In the `selectNode` callback (line ~164), add handling for session nodes and message nodes:
- When clicked node is a Session object (no 'type' property, detected by `!('type' in node)`), call `setSelectedNodeData` with a synthetic AnyNode. However, Session is not an AnyNode. Instead, store the Session itself. To do this, update the store's `selectedNodeData` type to accept `AnyNode | Session | null`. OR: simply call the existing `NodeDetail` component which already handles Session objects via `TreeNodeData`. The simplest approach: add a new store field `selectedTreeNodeData: TreeNodeData | null` alongside `selectedNodeData`, OR reuse the existing `selectedNodeData` by casting. Actually the cleanest approach: Update `setSelectedNodeData` to accept `AnyNode | null` as before, but add a new store action `setSelectedSessionDetail: (session: Session | null) => void` that sets `selectedNodeData` to null and sets a new `selectedSessionDetail` field. Then GroupDrillDownPanel renders NodeDetail for it.

SIMPLEST APPROACH (recommended): The `GroupDrillDownPanel` already has a branch for `selectedNodeData` rendering SkillDetailFormatter and SubagentDetailFormatter. Extend it to also render `NodeDetail` for any node type including session. The `NodeDetail` component already handles all node types including Session objects. So:

1. In `sessionStore.ts`: Change `selectedNodeData` type from `AnyNode | null` to `AnyNode | Session | null` (Session from shared). Update `setSelectedNodeData` signature accordingly. The synthetic groupId pattern still works: `node-detail-${data.id}`.

2. In `TreeView.tsx` `selectNode` callback: Add an `else` branch at the end for session nodes (when `!('type' in node)` — i.e., it's a Session object). Call `setSelectedNodeData(node as any)` — since Session has an `id` field, the synthetic groupId routing works. Also add handling for message nodes: `else if ('type' in node && node.type === 'message')` — call `setSelectedNodeData(node as AnyNode)`.

3. In `GraphView.tsx` `onNodeClick`: For session node clicks, KEEP the `setSelectedSession(node.id)` call (to select that session and zoom graph into it), AND ALSO find the Session object from `sessions` and call `setSelectedNodeData` with it. This opens the detail panel while also selecting the session. Find the session via: `const session = sessions.find(s => s.id === node.id); if (session) setSelectedNodeData(session as any);`

4. In `DirectoryOverview.tsx` `handleNodeClick`: Currently session node clicks navigate to graph view. Keep that behavior. For directory node clicks (node.type === 'directory'), do nothing special (directories are abstract grouping nodes). BUT if user wants directory node clicks to show metadata, we can skip since directories aren't session/node data — they're just visual groupings.

5. In `GroupDrillDownPanel.tsx`: The existing `selectedNodeData` branch (lines 92-167) renders SkillDetailFormatter for skill and SubagentDetailFormatter for subagent. Extend this to handle ALL node types by replacing the specific formatters with the generic `NodeDetail` component from `./NodeDetail`. Import `NodeDetail` and `TreeNodeData` type. Replace the detail view section (lines 157-164) with: `<NodeDetail node={selectedNodeData as TreeNodeData} />`. This handles session, message, skill, subagent, and tool nodes all through one component. Update the header title (lines 136-139) to be more generic — derive from node type: session shows "Session: {summary}", message shows "Message", skill shows "Skill: {name}", subagent shows "Subagent: {type}", tool shows "Tool: {name}".
  </action>
  <verify>Run `npm run build` from project root — no TypeScript errors. Verify that clicking any node type in tree view opens the GroupDrillDownPanel with NodeDetail content. Verify session clicks in graph view both select the session AND open the detail panel.</verify>
  <done>All node types (session, message, skill, subagent, tool) open metadata detail panel when clicked in tree view. Session and subagent clicks in graph view open metadata detail panel. GroupDrillDownPanel renders NodeDetail for all node types.</done>
</task>

<task type="auto">
  <name>Task 2: Session group header click navigates to directory view + fix graph view filtering</name>
  <files>
    client/src/components/SessionList.tsx
    client/src/components/GraphView.tsx
  </files>
  <action>
**SessionList.tsx** - In `CollapsibleSessionGroup` component:
1. Import `useSessionStore` action `setViewMode` (already imported from store).
2. Add `const setViewMode = useSessionStore((state) => state.setViewMode);` inside the component.
3. Modify the group header `onClick` to: toggle expansion as before, BUT also add a "navigate to directory" button/icon that appears on hover (like the existing Clear button pattern). When clicked, call `setViewMode('directory')`. This avoids conflicting with the expand/collapse behavior.

   Actually, cleaner approach: Add a small directory icon button next to the Clear button in the hover state. When the directory icon is clicked (with `e.stopPropagation()`), call `setViewMode('directory')`. Style it similar to clearButton but with blue color (#93c5fd) to match directory theme. Use a folder unicode character or simple "Dir" text.

   Add after the Clear button in the hover section:
   ```tsx
   {isHovered && (
     <>
       <button style={dirButtonStyle} onClick={handleDirView} ...>
         Dir
       </button>
       <button style={clearButtonStyle} onClick={handleClear} ...>
         Clear
       </button>
     </>
   )}
   ```
   Where `handleDirView` calls `e.stopPropagation()` then `setViewMode('directory')`.

**GraphView.tsx** - Fix session filtering to align with store logic:
1. Replace the custom `useMemo` filter (lines 76-83) with the store's `getFilteredSessions` selector. Import `getFilteredSessions` from the store alongside other selectors.
2. Replace:
   ```ts
   const sessions = useMemo(() => {
     return allSessions.filter((s) => {
       if (s.state === 'completed') return false;
       if (s.state === 'active' || s.state === 'waiting') return showActive;
       if (s.state === 'idle') return showIdle;
       return true;
     });
   }, [allSessions, showActive, showIdle]);
   ```
   With:
   ```ts
   const sessions = useMemo(() => {
     return getFilteredSessions();
   }, [getFilteredSessions, allSessions, filter, searchTerm, hiddenCwds, showActive, showIdle, showArchived]);
   ```
   And subscribe to the additional store fields needed: `filter`, `searchTerm`, `hiddenCwds`, `showArchived`.

   This ensures graph view respects: (a) showArchived toggle for completed sessions, (b) hiddenCwds filter, (c) search term, (d) Active/Idle/Archived toggles consistently.

3. Remove the now-unused `showActive` and `showIdle` individual selectors if they're only used in the replaced filter. Actually, keep them since they're used as useMemo dependencies for the getFilteredSessions call.

Also update `DirectoryOverview.tsx` to use `getFilteredSessions` instead of its own filter that only shows active/waiting:
- Replace the custom filter on line 60-63 with `getFilteredSessions()` from the store, following the same pattern as GraphView. This ensures directory view shows the same sessions as the sidebar.
  </action>
  <verify>Run `npm run build` from project root — no TypeScript errors. Verify the directory button appears on session group hover. Verify graph view now shows completed sessions when Archived is checked, and hides sessions from hidden cwds.</verify>
  <done>Session group header shows a "Dir" button on hover that navigates to directory view. Graph view filtering aligned with sidebar (respects all three toggles, hiddenCwds, and search). DirectoryOverview shows filtered sessions matching sidebar. Active sessions always visible in graph when Active toggle is on.</done>
</task>

</tasks>

<verification>
- `npm run build` passes with no TypeScript errors
- Clicking a session node in tree view opens detail panel with session metadata
- Clicking a message node in tree view opens detail panel with message content
- Clicking a skill/subagent node in tree/graph view opens detail panel (existing behavior preserved)
- Clicking a session node in graph view selects it AND opens detail panel
- Session group header shows "Dir" button on hover
- Clicking "Dir" button switches to directory view
- Graph view respects all FilterBar toggles (Active, Idle, Archived)
- Graph view respects hiddenCwds (cleared groups not shown)
- Active/waiting sessions appear in graph when Active toggle is checked
</verification>

<success_criteria>
All node types open metadata detail panel when clicked in any view. Session group "Dir" button navigates to directory overview. Graph view filtering consistent with sidebar filtering. Build passes with zero TypeScript errors.
</success_criteria>

<output>
After completion, create `.planning/quick/5-node-click-metadata-inspection-in-all-vi/5-SUMMARY.md`
</output>
