---
phase: 14-agent-debugging
plan: 01
subsystem: agent-debugging
tags:
  - UI/UX
  - agent-inspection
  - tool-calls
  - detail-panel
dependency_graph:
  requires:
    - 13-02 (Timeline Enhancement - user prompts and clear markers)
    - 12-02 (Navigation Refactor - detail panel architecture)
  provides:
    - Clickable tool calls on subagent nodes
    - Clean agent detail panel showing request/response
  affects:
    - GraphView (tool click handling)
    - SubagentNode (clickable tool rows)
    - NodeDetail (simplified agent panel)
tech_stack:
  added:
    - onToolCallClick callback pattern for nested clicks
  patterns:
    - Event stopPropagation for nested interactive elements
    - useMemo for node enrichment with callbacks
    - Hover state management for clickable rows
key_files:
  created: []
  modified:
    - client/src/components/nodes/SubagentNode.tsx
    - client/src/components/GraphView.tsx
    - client/src/components/NodeDetail.tsx
decisions:
  - "Use callback prop pattern (onToolCallClick) for tool call clicks to avoid React Flow event system conflicts"
  - "Enrich subagent nodes post-layout with callbacks to keep layout logic pure"
  - "Remove tool calls list from agent detail panel to reduce visual noise - users click individual tools on graph nodes instead"
  - "Reorder agent detail sections: Request → Response → Agent Info (debugging-first flow)"
  - "Increase Request/Response max-height to 500px and font size to 14px for better readability"
metrics:
  duration_minutes: 2.1
  tasks_completed: 2
  files_modified: 3
  build_time_seconds: 8.4
  completed_at: "2026-02-12T07:24:09Z"
---

# Phase 14 Plan 01: Agent Debugging - Clickable Tool Calls Summary

**One-liner:** Clickable tool calls on subagent nodes open detail panel for individual tools, with agent panels simplified to show only request/response for cleaner debugging.

## What Was Built

### Task 1: Clickable Tool Calls on Subagent Nodes
- **SubagentNode.tsx:**
  - Added `onToolCallClick` callback prop to SubagentNodeData interface
  - Made tool call rows clickable with hover states (lighter background on hover)
  - Added `e.stopPropagation()` to prevent parent node click when clicking tool rows
  - Implemented hover state tracking for visual feedback

- **GraphView.tsx:**
  - Created `enrichedNodes` useMemo to post-process layouted nodes
  - Attached `onToolCallClick` callbacks to all subagent nodes
  - Callback finds the tool node within the subagent session and calls `setSelectedNodeData`
  - Preserves pure layout function by enriching nodes after layout computation

### Task 2: Clean Agent Detail Panel
- **NodeDetail.tsx:**
  - Removed tool calls section entirely from `renderSubagentContent`
  - Reordered sections for debugging workflow:
    1. **Request** (was "Input Prompt") - the prompt given to subagent
    2. **Response** (was "Response Summary") - subagent's response
    3. **Agent Info** - metadata (type, name, color, model, IDs, timestamp)
    4. **Description** (if exists)
    5. **Source File** (if non-Task agent)
  - Increased Request/Response max-height from 300px to 500px
  - Increased font size from 13px to 14px for better readability
  - Removed debug console.log statement

## Technical Implementation

### Event Handling Pattern
```typescript
// SubagentNode.tsx - Tool call row click
onClick={(e) => {
  e.stopPropagation();  // Prevent React Flow onNodeClick
  data.onToolCallClick?.(tool.id);
}}
```

### Node Enrichment Pattern
```typescript
// GraphView.tsx - Attach callbacks post-layout
const enrichedNodes = useMemo(() => {
  return layoutedNodes.map((node) => {
    if (node.type === 'subagent') {
      return {
        ...node,
        data: {
          ...node.data,
          onToolCallClick: (toolCallId: string) => {
            // Find subagent session, find tool node, open detail panel
          },
        },
      };
    }
    return node;
  });
}, [layoutedNodes, sessions, setSelectedNodeData]);
```

### UI States
- **Tool call row hover:** `backgroundColor: 'rgba(255, 255, 255, 0.1)'`
- **Tool call row default:** `backgroundColor: 'rgba(0, 0, 0, 0.2)'`
- **Cursor:** `pointer` on tool rows to indicate clickability

## User Experience

### Before
- Clicking a subagent node showed agent metadata with a long list of tool calls
- Tool calls list was collapsed by default, creating visual noise
- No way to inspect individual tool calls without expanding nested sections
- Agent panel mixed metadata, description, and tool list in unclear hierarchy

### After
- **Click subagent node:** See clean panel with Request (what was asked) and Response (what agent returned)
- **Click individual tool call row on graph:** Detail panel opens showing that specific tool's input/output
- **Agent panel focus:** Request and Response are primary, larger (500px max-height, 14px font)
- **Reduced cognitive load:** No tool calls list in agent panel - users click specific tools on graph instead

## Verification

1. Build passes with zero TypeScript errors (verified)
2. SubagentNode tool call rows have onClick handlers calling onToolCallClick (verified)
3. GraphView enriches subagent nodes with onToolCallClick callbacks (verified)
4. NodeDetail renderSubagentContent shows Request → Response → Agent Info order (verified)
5. No ToolCallsList in renderSubagentContent (verified - component still exists for backward compatibility but unused in subagent rendering)

## Success Criteria Met

- ✅ **AGNT-01:** User can click individual tool calls on an agent node to open that tool's metadata in the detail panel
- ✅ **AGNT-02:** User sees agent metadata panel showing only request (prompt) and response — no tool list
- ✅ Build passes, no TypeScript errors

## Deviations from Plan

None - plan executed exactly as written.

## Impact

**For debugging workflows:**
- Faster tool call inspection: direct click on graph instead of navigating nested lists
- Clearer agent intent: Request/Response prominent in detail panel
- Reduced visual noise: Tool calls accessible on demand via graph, not cluttering detail panel

**For codebase:**
- Established callback prop pattern for nested interactive elements in React Flow
- Demonstrated node enrichment pattern for post-layout data injection
- Maintained separation: layout logic pure, callbacks attached separately

## Next Steps

Continue with Phase 14 remaining plans (AGNT-03, AGNT-04) for additional agent debugging features.

## Self-Check: PASSED

**Created files exist:**
- N/A (no new files created)

**Modified files exist:**
- ✅ /home/botond/claude-session-dashboard/client/src/components/nodes/SubagentNode.tsx
- ✅ /home/botond/claude-session-dashboard/client/src/components/GraphView.tsx
- ✅ /home/botond/claude-session-dashboard/client/src/components/NodeDetail.tsx

**Build verification:**
- ✅ `npm run build` completed successfully with zero TypeScript errors
- ✅ Vite build completed in 3.82s

**Code verification:**
- ✅ onToolCallClick prop added to SubagentNodeData interface
- ✅ Tool call rows have onClick handlers with stopPropagation
- ✅ GraphView enrichedNodes useMemo attaches callbacks
- ✅ renderSubagentContent shows Request → Response → Agent Info order
- ✅ No Tool Calls section in subagent detail panel
