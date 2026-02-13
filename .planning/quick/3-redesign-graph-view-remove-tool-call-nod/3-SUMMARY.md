---
phase: quick-3
plan: 01
type: summary
status: complete
completed: 2026-02-09T15:38:30Z
duration: 3.2min
tasks_completed: 2
---

# Quick Task 3: Redesign Graph View to Remove Tool Call Nodes

**One-liner:** Redesigned graph view to show clean subagent-centric timeline with start/stop node pairs and embedded expandable tool call lists, removing all individual tool call nodes from the main timeline.

## Objective

Transform the graph view from a cluttered tool-call-heavy visualization into a clean subagent-centric timeline where tool calls are accessible as expandable lists within subagent start nodes rather than individual graph nodes.

## Tasks Completed

### Task 1: Redesign graph layout to show only subagent/task nodes on main timeline

**Files Modified:**
- `client/src/utils/graphLayout.ts`

**Changes:**
- Completely rewrote `convertSessionToGraph` to implement new graph model
- Removed all tool node and tool-group node creation from main timeline
- Removed `expandSubagentInline` function (no longer needed)
- Created `extractToolCallSummaries` helper function that extracts tool calls from subagent sessions and generates input summaries:
  - Bash: first 60 chars of command
  - Read/Write/Edit: filename (last path segment)
  - Grep/Glob: pattern (40 chars)
  - Other tools: first key-value pair
- Exported new `ToolCallSummary` interface: `{ toolName, inputSummary, state }`
- Implemented unified timeline building from skills and subagents, sorted chronologically
- For each subagent, created two nodes on the main timeline:
  1. **START node**: Shows subagent label, prompt preview, and embedded tool call list with summaries
  2. **STOP node**: Shows completion status and summary preview
- Preserved parallel subagent fork-join pattern and sequential subagent chaining
- Updated `NODE_DIMENSIONS` to reflect new subagent node sizes (220x90 for accommodating tool lists)
- Kept function signatures compatible with existing code (expandedGroups/expandedSubagents params retained but unused)

**Key Algorithm:**
1. Build timeline from skill nodes (from session.nodes) and subagent sessions
2. Sort chronologically by timestamp
3. Detect parallel groups using existing `detectParallelSubagentGroups` logic
4. Process timeline items:
   - Skills: Add directly to main chain
   - Sequential subagents: Create start->stop pair in linear sequence
   - Parallel subagents: Fork into branches, each with start->stop, converge to join node

### Task 2: Redesign SubagentNode component with start/stop variants and embedded tool list

**Files Modified:**
- `client/src/components/nodes/SubagentNode.tsx`
- `client/src/components/GraphView.tsx`

**SubagentNode.tsx Changes:**
- Updated `SubagentNodeData` interface to include:
  - `variant: 'start' | 'stop'`
  - `prompt?: string` (start variant)
  - `summary?: string` (stop variant)
  - `toolCalls?: ToolCallSummary[]`
  - Removed unused fields
- Implemented dual rendering based on variant:
  - **START variant:**
    - Purple left border accent (#8b5cf6)
    - Shows subagent icon, label, status dot
    - "Request" section with prompt preview (80 chars)
    - "Tool Calls (N)" expandable section with chevron indicator
    - When expanded: scrollable list (max 200px) of tool call rows
    - Each tool row: tool icon, tool name, input summary in monospace
    - Component-local `useState` for `showTools` toggle
    - Larger dimensions (200-220px wide)
  - **STOP variant:**
    - Blue left border accent (#3b82f6)
    - Shows checkmark icon, "Complete" label, status dot
    - Optional summary preview (60 chars)
    - Compact dimensions (140-160px wide)
- Copied TOOL_ICONS map from ToolNode.tsx for consistent tool visualization
- Implemented onClick handler for tool call header that stops propagation (prevents node click)

**GraphView.tsx Changes:**
- Removed `toggleSubagentExpansion` from store hooks (no longer used)
- Simplified `onNodeClick` handler:
  - Session clicks: select session (unchanged)
  - Subagent clicks: open detail panel with SubagentNode data
    - Extract subagent ID from React Flow node ID by removing `-start` or `-stop` suffix
    - Search for matching SubagentNode in session.nodes by agentId
    - Open detail panel via `setSelectedNodeData`
  - Skill clicks: open detail panel (unchanged)
  - Removed tool and tool-group click handlers (no longer applicable)
- Updated callback dependencies to remove unused handlers

## Verification

Build completed successfully with no TypeScript errors:
```
✓ 546 modules transformed.
dist/assets/index-CHjn4NAM.css   16.53 kB │ gzip:   2.94 kB
dist/assets/index-C3cOtM2E.js   486.82 kB │ gzip: 154.41 kB
✓ built in 4.04s
```

**Expected behavior:**
1. Main timeline shows only session nodes, subagent start/stop pairs, skill nodes, and invisible join nodes
2. No tool call nodes or tool-group nodes appear on the main graph
3. Each subagent start node has an expandable tool call list
4. Tool list shows tool icon + name + input summary for each tool
5. Parallel subagents fork into parallel branches and converge
6. Sequential subagents chain linearly
7. Clicking subagent nodes opens the detail panel

## Key Decisions

**Decision:** Use start/stop node pairs instead of single expandable subagent nodes
- **Rationale:** Provides clear visual boundaries for subagent execution (request -> completion), making the timeline easier to scan. Start node focuses on inputs (prompt + tools), stop node focuses on result.
- **Alternative considered:** Single node with expand/collapse toggle showing inline tool graphs (old approach)
- **Rejected because:** Cluttered the main timeline and required complex nested graph layouts

**Decision:** Embed tool calls as a component-internal expandable list, not as React Flow nodes
- **Rationale:** Tool calls are implementation details, not top-level timeline events. Users want high-level view by default with drill-down on demand.
- **Alternative considered:** Keep tool calls as separate graph nodes but hidden by default
- **Rejected because:** React Flow would still compute layout for hidden nodes, and toggling would cause jarring layout shifts

**Decision:** Use component-local useState for tool list expansion, not Zustand store
- **Rationale:** Tool list expansion is ephemeral UI state that doesn't need persistence or cross-component coordination. Keeps state localized and simple.
- **Alternative considered:** Add expandedSubagentToolLists to Zustand store
- **Rejected because:** Unnecessary global state for component-internal UI behavior

## Deviations from Plan

None - plan executed exactly as written.

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| client/src/utils/graphLayout.ts | ~300 lines rewritten | Redesigned graph conversion to create start/stop pairs, extract tool summaries |
| client/src/components/nodes/SubagentNode.tsx | ~200 lines rewritten | Dual start/stop rendering with embedded tool list |
| client/src/components/GraphView.tsx | ~50 lines simplified | Updated click handlers, removed tool/tool-group logic |

## Technical Notes

**Tool input summary generation patterns:**
- File operations (Read/Write/Edit): Extract filename from path using `split('/').pop()`
- Search operations (Grep/Glob): Show pattern directly
- Bash: Show command snippet
- Generic fallback: Show first key-value pair from input object

**Node ID format:**
- Session: `${sessionId}`
- Skill: `${sessionId}-${skillNodeId}`
- Subagent start: `${sessionId}-${subagentId}-start`
- Subagent stop: `${sessionId}-${subagentId}-stop`
- Join nodes: `${sessionId}-join-parallel-${index}`

**Why no commits:** User preference (`commit_docs: false` in project state) - all changes made locally and documented in this summary.

## Next Steps

None - this is a complete standalone quick task. The graph view now provides a cleaner high-level view with tool details accessible on demand.
