---
phase: 45-metadata-autorefresh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/components/GroupDrillDownPanel.tsx
  - client/src/components/GraphView.tsx
autonomous: true
requirements: [QUICK-45]

must_haves:
  truths:
    - "When a new tool call is added to a group that is currently open in the detail panel, the panel updates to show the new tool call"
    - "When a new model response is added to a group displayed in the detail panel, the panel refreshes to include it"
    - "The tool group count badge in the panel header updates in real-time"
  artifacts:
    - path: "client/src/components/GroupDrillDownPanel.tsx"
      provides: "Live-refreshing detail panel for tool groups and individual nodes"
    - path: "client/src/components/GraphView.tsx"
      provides: "Node click handler that sets identification data (not snapshot data)"
  key_links:
    - from: "GroupDrillDownPanel.tsx"
      to: "sessionStore sessions"
      via: "useSessionStore sessions subscription + useMemo derivation"
      pattern: "useMemo.*sessions.*selectedGroupId"
---

<objective>
Make the metadata detail panel (GroupDrillDownPanel) auto-refresh when the underlying session data changes, so that newly added tool calls and model responses appear in real-time.

Purpose: Currently, clicking a tool group or model output node captures a static snapshot. As the session streams new data (via WebSocket), the panel shows stale content. This is confusing when watching an active session.

Output: GroupDrillDownPanel that derives its display data from live session state instead of stale snapshots.
</objective>

<context>
@client/src/components/GroupDrillDownPanel.tsx
@client/src/components/GraphView.tsx
@client/src/store/sessionStore.ts
@client/src/components/NodeDetail.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Make GroupDrillDownPanel derive data from live sessions instead of stale snapshots</name>
  <files>client/src/components/GroupDrillDownPanel.tsx</files>
  <action>
The root cause is that selectedNodeData and selectedGroupData are snapshots captured at click time and never updated. Fix this by making the panel derive its data from live session state.

**For the tool group path (selectedGroupId without `node-detail-` prefix):**

1. In `findToolGroup()`, REMOVE the early return on line 58 that short-circuits with stale `selectedGroupData`:
   ```
   // DELETE this block:
   if (selectedGroupData && selectedGroupData.id === selectedGroupId) {
     return selectedGroupData;
   }
   ```
   This forces the function to always re-derive the tool group from the live `sessions` array.

2. Wrap the `findToolGroup()` call in a `useMemo` that depends on `sessions` and `selectedGroupId`, so it recomputes when sessions update:
   ```typescript
   const toolGroup = useMemo(() => {
     if (!selectedGroupId || selectedGroupId.startsWith('node-detail-')) return null;
     // ... existing search logic (without the short-circuit) ...
   }, [sessions, selectedGroupId, selectedGroupData]);
   ```

**For the individual node path (selectedNodeData with tool-group type):**

3. When `selectedNodeData` has `type === 'tool-group'`, instead of rendering the stale snapshot, re-derive the tool group data from sessions. Add a `useMemo` that:
   - Checks if `selectedNodeData` is a tool-group (has `type: 'tool-group'` and `toolName`)
   - If so, searches sessions for the matching group using the same grouping logic as `findToolGroup()`
   - Returns the fresh data, falling back to `selectedNodeData` if not found

   ```typescript
   const liveNodeData = useMemo(() => {
     if (!selectedNodeData) return null;

     // For tool-group type, re-derive from sessions
     if ('type' in selectedNodeData && (selectedNodeData as any).type === 'tool-group') {
       const groupId = selectedNodeData.id;
       // Search sessions for matching tool group using groupConsecutiveToolCalls
       for (const session of sessions) {
         const found = searchSessionForGroup(session, groupId);
         if (found) return found;
       }
       // Fallback to snapshot if group no longer exists
       return selectedNodeData;
     }

     // For model output groups (nodeData array), re-derive from sessions
     if ('nodeData' in (selectedNodeData as any) && Array.isArray((selectedNodeData as any).nodeData)) {
       // These have count + nodeData - find parent assistant messages from sessions
       // For now, the snapshot is acceptable since model outputs don't get appended to
       return selectedNodeData;
     }

     return selectedNodeData;
   }, [selectedNodeData, sessions]);
   ```

4. Replace all references to `selectedNodeData` in the render with `liveNodeData` (in the `if (selectedNodeData && !toolGroup)` block, change condition to `if (liveNodeData && !toolGroup)` and pass `liveNodeData` to `<NodeDetail node={liveNodeData as TreeNodeData} />`).

5. Update the header title derivation to also use `liveNodeData` so the count in the header updates.

Helper function `searchSessionForGroup` should recursively search a session (including subagents) using `groupConsecutiveToolCalls` to find a ToolGroup by ID, identical to the existing logic in `findToolGroup` but as a standalone function that can be reused.
  </action>
  <verify>
    Run `npm run build` from project root - should compile without errors.
    Open the dashboard, click on an active session's tool group node. While the panel is open, trigger more tool calls in that session. The panel should update the tool count and show the new tool calls without needing to close and reopen.
  </verify>
  <done>
    Tool group detail panel shows live-updating tool count and list. Model output groups show latest responses. No stale snapshot data displayed when underlying session updates via WebSocket.
  </done>
</task>

<task type="auto">
  <name>Task 2: Store identification keys instead of full data snapshots for tool groups in GraphView click handler</name>
  <files>client/src/components/GraphView.tsx</files>
  <action>
In GraphView's `onNodeClick` handler, the `tool-group` case (around line 818) currently creates a full snapshot object and passes it to `setSelectedNodeData`. This snapshot becomes stale. Instead, store a lightweight identification object that `GroupDrillDownPanel` can use to look up live data.

For the `tool-group` click handler (line 818-838):
- Keep the existing behavior of setting `selectedNodeData` with the tool-group object, BUT include the `sessionId` so GroupDrillDownPanel can find it. The data object already has `id` (groupId), `toolName`, and `count`.
- The key insight: `selectedNodeData` will still be set with the tool-group shape, but `GroupDrillDownPanel` Task 1 now re-derives from live sessions, so the initial snapshot is just used for identification (groupId, toolName).

No major changes needed here since Task 1 handles the re-derivation. However, ensure that for the `model-output` click handler (line 869-901):
- When `modelData.nodeData` is an array, also include a `groupId` field in the object passed to `setSelectedNodeData` so it can be identified for re-lookup if needed in the future.
- Change the object passed to include `id: modelData.groupId || node.id` instead of no id field, so `setSelectedNodeData` can properly set the `selectedGroupId`.

Specifically on line 882-885:
```typescript
setSelectedNodeData({
  id: modelData.groupId || node.id,  // ADD id field
  nodeData: modelData.nodeData,
  count: modelData.count,
} as any);
```

This ensures the store's `setSelectedNodeData` correctly derives `selectedGroupId` from the `id` field (line 417 of store: `selectedGroupId: data ? \`node-detail-${data.id}\` : null`).
  </action>
  <verify>
    Run `npm run build` from project root - should compile without errors.
    Click on a tool-group node in the graph - the detail panel should open and show correct data.
    Click on a model-output group node - the detail panel should open and show correct data.
  </verify>
  <done>
    Tool group and model output node clicks pass proper identification data. Combined with Task 1's live derivation, the panel always shows current data.
  </done>
</task>

</tasks>

<verification>
1. `npm run build` compiles successfully
2. Click a tool-group node on an active session - panel opens with correct data
3. While panel is open, new tool calls arrive via WebSocket - panel updates count and list
4. Click a model-output group - panel opens with correct data
5. Close and reopen panel - data is fresh
6. Panel close (click outside, Escape, X button) still works correctly
</verification>

<success_criteria>
- Detail panel shows live data that updates when sessions receive new tool calls or model responses
- No stale snapshot data visible when underlying session data changes
- Build passes, no regressions in panel open/close behavior
</success_criteria>

<output>
After completion, create `.planning/quick/45-metadata-should-update-when-a-tool-model/45-SUMMARY.md`
</output>
